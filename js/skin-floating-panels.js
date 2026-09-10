// 小工具浮动面板系统（v0.6.0.1）
// 功能：按住 drag_indicator(或标题栏) 把面板拖出 → 自由移动；鼠标停边缘缩放；最小化折叠；
//       归位方式：点 close、按 Esc、或拖回原位（占位区 / 原面板容器）。
// 用法：给目标 <div class="section" data-float data-float-title="标题"> 打标，再调用 initFloatingPanels()。

const FLOAT_CLASS = 'floating';
const MIN_CLASS = 'minimized';

let MGR = null;

function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

class FloatingPanel {
    constructor(manager, el, title) {
        this.mgr = manager;
        this.el = el;
        this.title = title;
        this.floating = false;
        this.minimized = false;
        this.homeParent = el.parentNode;
        this.homeNext = el.nextSibling;
        this.placeholder = null;
        this.dragState = null;
        this.resizing = null;
        this.slotCenter = null;   // 拖出前原始槽位的中心坐标
        this.nearDrop = false;     // 当前是否靠近归位区

        this._buildBar();
        this._buildResizeHandles();
    }

    _buildBar() {
        // 移除首行 <label>（标题已由 data-float-title 提供），避免重复显示
        const firstLabel = this.el.querySelector(':scope > label');
        if (firstLabel) firstLabel.remove();

        const bar = document.createElement('div');
        bar.className = 'panel-bar';
        bar.innerHTML =
            '<span class="panel-grip" title="按住拖动 · 拖到边缘可缩放"><i class="icon ico-drag-indicator sz14"></i></span>' +
            '<span class="panel-title">' + escHtml(this.title) + '</span>' +
            '<span class="panel-actions">' +
            '<button type="button" class="panel-min" title="最小化 / 折叠"><i class="icon ico-minimize sz14"></i></button>' +
            '<button type="button" class="panel-close" title="归位到面板"><i class="icon ico-close sz14"></i></button>' +
            '</span>';
        this.el.insertBefore(bar, this.el.firstChild);
        this.bar = bar;
        this.grip = bar.querySelector('.panel-grip');
        this.minBtn = bar.querySelector('.panel-min');
        this.closeBtn = bar.querySelector('.panel-close');

        // 拖拽：整条标题栏可抓（动作按钮除外）
        bar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.panel-actions')) return;
            this._onGripDown(e);
        });
        this.minBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMinimize(); });
        this.closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.dock(); });
        // 点面板任意处置顶
        this.el.addEventListener('mousedown', () => this.mgr.bringToFront(this));
    }

    _buildResizeHandles() {
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        this.handles = {};
        dirs.forEach((dir) => {
            const h = document.createElement('div');
            h.className = 'panel-resize dir-' + dir;
            h.dataset.dir = dir;
            h.addEventListener('mousedown', (e) => this._onResizeDown(e, dir));
            this.el.appendChild(h);
            this.handles[dir] = h;
        });
    }

    // ---------- 拖出 / 移动 ----------
    _onGripDown(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        const rect = this.el.getBoundingClientRect();
        this.dragState = {
            startX: e.clientX, startY: e.clientY,
            gx: e.clientX - rect.left, gy: e.clientY - rect.top,
            moved: false
        };
        this.mgr.activeDrag = this;
        this.mgr.bringToFront(this);
        this._dragMove = (ev) => this._onDragMove(ev);
        this._dragUp = (ev) => this._onDragUp(ev);
        window.addEventListener('mousemove', this._dragMove);
        window.addEventListener('mouseup', this._dragUp);
    }

    _onDragMove(e) {
        const st = this.dragState;
        if (!st) return;
        if (!st.moved) {
            const dx = e.clientX - st.startX, dy = e.clientY - st.startY;
            if (Math.hypot(dx, dy) < 4) return;
            st.moved = true;
            if (!this.floating) this.undock();
            document.body.classList.add('panel-dragging');
        }
        let left = e.clientX - st.gx;
        let top = e.clientY - st.gy;
        left = Math.max(0, Math.min(left, window.innerWidth - 40));
        top = Math.max(0, Math.min(top, window.innerHeight - 30));
        this.el.style.left = left + 'px';
        this.el.style.top = top + 'px';
        // 拖拽时根据面板中心是否靠近原位，临时显示/隐藏归位占位框
        const pr = this.el.getBoundingClientRect();
        this.nearDrop = this._updateDockHint(pr.left + pr.width / 2, pr.top + pr.height / 2);
    }

    _onDragUp(e) {
        window.removeEventListener('mousemove', this._dragMove);
        window.removeEventListener('mouseup', this._dragUp);
        document.body.classList.remove('panel-dragging');
        const st = this.dragState;
        this.dragState = null;
        this.mgr.activeDrag = null;
        if (st && st.moved) {
            if (this._overDockTarget(e.clientX, e.clientY)) this.dock();
            else if (this.placeholder && this.placeholder.parentNode) {
                this.placeholder.parentNode.removeChild(this.placeholder);
            }
        }
    }

    _overDockTarget(x, y) {
        // 1) 命中已显示的占位区（仅拖拽靠近时才会出现）
        if (this.placeholder && this.placeholder.parentNode) {
            const r = this.placeholder.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
            if (this._overlap(this.el.getBoundingClientRect(), r)) return true;
        }
        // 2) 靠近原始槽位（拖拽归位的触发区，约 160px 范围）
        if (this.slotCenter) {
            const dx = x - this.slotCenter.x, dy = y - this.slotCenter.y;
            if (Math.abs(dx) < 160 && Math.abs(dy) < 160) return true;
        }
        return false;
    }

    // 拖拽过程中：面板中心靠近原位时显示占位框，离开则移除，避免始终占据空白
    _updateDockHint(cx, cy) {
        if (!this.slotCenter) return false;
        const dx = cx - this.slotCenter.x, dy = cy - this.slotCenter.y;
        const near = Math.abs(dx) < 160 && Math.abs(dy) < 160;
        if (near && !this.placeholder.parentNode) {
            this.homeParent.insertBefore(this.placeholder, this.homeNext);
            this.placeholder.classList.add('active');
        } else if (!near && this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }
        return near;
    }

    _overlap(a, b) {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    undock() {
        const rect = this.el.getBoundingClientRect();
        this.slotCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        if (!this.placeholder) {
            this.placeholder = document.createElement('div');
            this.placeholder.className = 'panel-placeholder';
            this.placeholder.innerHTML = '<span class="ph-text">拖回此处归位</span>';
            this.placeholder.style.height = Math.max(40, rect.height) + 'px';
        }
        // 注意：拖出时【不】立即插入占位框，避免原位出现大片空白。
        // 仅在拖拽且靠近原位时由 _updateDockHint 临时插入。
        // 拖出时自动展开：若处于最小化状态则清除，避免拖出后只剩标题栏。
        if (this.minimized) {
            this.minimized = false;
            this.el.classList.remove(MIN_CLASS);
            this.minBtn.classList.remove('on');
        }
        document.body.appendChild(this.el);
        this.el.classList.add(FLOAT_CLASS);
        this.el.style.position = 'fixed';
        this.el.style.margin = '0';
        this.el.style.left = rect.left + 'px';
        this.el.style.top = rect.top + 'px';
        this.el.style.width = rect.width + 'px';
        this.floating = true;
        this.mgr.bringToFront(this);
    }

    dock() {
        if (!this.floating) {
            this.minimized = false;
            this.el.classList.remove(MIN_CLASS);
            this.minBtn.classList.remove('on');
            return;
        }
        this.el.classList.remove(FLOAT_CLASS, MIN_CLASS);
        this.el.style.position = '';
        this.el.style.left = '';
        this.el.style.top = '';
        this.el.style.width = '';
        this.el.style.height = '';
        this.el.style.margin = '';
        this.el.style.zIndex = '';
        this.minBtn.classList.remove('on');
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.insertBefore(this.el, this.placeholder);
            this.placeholder.parentNode.removeChild(this.placeholder);
        } else {
            this.homeParent.insertBefore(this.el, this.homeNext);
        }
        this.floating = false;
        this.minimized = false;
    }

    toggleMinimize() {
        this.minimized = !this.minimized;
        this.el.classList.toggle(MIN_CLASS, this.minimized);
        this.minBtn.classList.toggle('on', this.minimized);
    }

    // ---------- 缩放 ----------
    _onResizeDown(e, dir) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = this.el.getBoundingClientRect();
        this.resizing = { dir, sx: e.clientX, sy: e.clientY, w: rect.width, h: rect.height, l: rect.left, t: rect.top };
        this.mgr.bringToFront(this);
        this._rsMove = (ev) => this._onResizeMove(ev);
        this._rsUp = () => this._onResizeUp();
        window.addEventListener('mousemove', this._rsMove);
        window.addEventListener('mouseup', this._rsUp);
    }

    _onResizeMove(e) {
        const r = this.resizing;
        if (!r) return;
        const dx = e.clientX - r.sx, dy = e.clientY - r.sy;
        const MIN_W = 200, MIN_H = 80;
        let w = r.w, h = r.h, l = r.l, t = r.t;
        if (r.dir.indexOf('e') !== -1) w = Math.max(MIN_W, r.w + dx);
        if (r.dir.indexOf('s') !== -1) h = Math.max(MIN_H, r.h + dy);
        if (r.dir.indexOf('w') !== -1) { w = Math.max(MIN_W, r.w - dx); l = r.l - (w - r.w); }
        if (r.dir.indexOf('n') !== -1) { h = Math.max(MIN_H, r.h - dy); t = r.t - (h - r.h); }
        this.el.style.width = w + 'px';
        this.el.style.height = h + 'px';
        this.el.style.left = l + 'px';
        this.el.style.top = t + 'px';
    }

    _onResizeUp() {
        window.removeEventListener('mousemove', this._rsMove);
        window.removeEventListener('mouseup', this._rsUp);
        this.resizing = null;
    }
}

class FloatingPanelManager {
    constructor() {
        this.panels = [];
        this.zTop = 2000;
        this.activeDrag = null;
        this.active = null;
        document.addEventListener('keydown', (e) => this._onKey(e));
    }

    register(el, title) {
        el.classList.add('floatable');
        const p = new FloatingPanel(this, el, title);
        this.panels.push(p);
        return p;
    }

    bringToFront(p) {
        this.active = p;
        p.el.style.zIndex = (++this.zTop);
    }

    isModalOpen() {
        const settings = document.getElementById('settingsPanel');
        if (settings && settings.style.display === 'flex') return true;
        const rb = document.getElementById('renameDialogBackdrop');
        if (rb && rb.style.display === 'block') return true;
        const cb = document.getElementById('confirmBackdrop');
        if (cb && cb.style.display === 'block') return true;
        const pdb = document.getElementById('presetDescBackdrop');
        if (pdb && pdb.style.display === 'block') return true;
        const pb = document.getElementById('panel-backdrop');
        if (pb && pb.classList.contains('active')) return true;
        return false;
    }

    _onKey(e) {
        if (e.key !== 'Escape') return;
        if (this.isModalOpen()) return; // 让其它弹窗自行处理 Esc
        if (this.activeDrag) { this.activeDrag.dock(); return; }
        if (this.active && this.active.floating) this.active.dock();
    }
}

export function initFloatingPanels() {
    if (MGR) return MGR;
    MGR = new FloatingPanelManager();
    // 兼容旧偏好：v0.5.9.82 及之前「整段折叠」的状态，迁移为浮动面板的「最小化」
    let collapsedSections = {};
    try { collapsedSections = JSON.parse(localStorage.getItem('isle_collapsed_sections_v1')) || {}; } catch {}
    const sections = Array.from(document.querySelectorAll('.section[data-float]'));
    sections.forEach((sec) => {
        const title = sec.getAttribute('data-float-title') ||
            (sec.querySelector(':scope > label') ? sec.querySelector(':scope > label').textContent.trim() : '') ||
            '工具';
        const p = MGR.register(sec, title);
        if (collapsedSections[title]) p.toggleMinimize();
    });
    return MGR;
}
