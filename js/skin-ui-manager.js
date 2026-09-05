import { COLOR_PARTS } from './skin-color-parts.js?v=0.5.9.78';
import { DINOSAUR_DATA, CANNIBAL_COLORS, DIET_COLORS, DIET_LABELS, getPatternCode, resolvePatternByCode, getPatternHasSpecial } from './skin-dino-data.js?v=0.5.9.78';
import { OFFICIAL_SCHEMES } from './skin-official-schemes.js?v=0.5.9.78';
import { generateSkinCode, parseSkinCode, isValidColorHex } from './skin-code-generator.js?v=0.5.9.78';
import { encodeCNRE, decodeCNRE, isCNRECode, cnreIdToColorKey, colorKeyToCnreId, xs, rawLinearToHex, computeGlitchFromSrgbHex, boostSaturationToHex } from './skin-cnre-code-generator.js?v=0.5.9.78';
import { encodeNyorOverlay, decodeNyorOverlay, isNyorOverlayCode } from './skin-nyor-overlay.js?v=0.5.9.78';
import { encodeToolSkin, decodeToolSkin, isToolSkinCode } from './skin-tool-code.js?v=0.5.9.78';
import { UndoRedoManager } from './skin-undo-redo.js?v=0.5.9.78';
import { addPreset, deletePreset, loadPreset, getPresets, clearAllPresets } from './skin-preset-manager.js?v=0.5.9.78';
import * as GradGen from './skin-gradient-generator.js?v=0.5.9.78';
import { ThemeManager } from './skin-theme-manager.js?v=0.5.9.78';
import { DinoPreview } from './skin-three-preview.js?v=0.5.9.78';

// ---- dev 原始通道编辑器：滑块对数映射（量级 1 → 1e6，0 居中）与显示格式 ----
const DEV_RAW_MAX_MAG = 1e6;
function sliderToRaw(v) {
    if (v === 0) return 0;
    const sign = v < 0 ? -1 : 1;
    const mag = Math.pow(10, Math.abs(v) / 100 * 6); // 10^0=1 .. 10^6=1e6
    return sign * mag;
}
function rawToSlider(x) {
    if (!x) return 0;
    const sign = x < 0 ? -1 : 1;
    const mag = Math.min(DEV_RAW_MAX_MAG, Math.max(1, Math.abs(x)));
    return Math.round(sign * (100 * Math.log10(mag) / 6));
}
function fmtRaw(x) {
    if (!x) return '0';
    const a = Math.abs(x);
    if (a >= 1e6 || a < 1e-3) return x.toExponential(2).replace('e+', 'e');
    if (a >= 1000) return x.toFixed(0);
    return x.toFixed(2);
}

function normalizeHex(raw) {
    return raw.replace(/#/g, '').toUpperCase().slice(0, 6);
}
function formatHexInput(raw) {
    let v = raw.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    return v.length > 0 ? '#' + v : '';
}
function expandShorthandHex(hex) {
    const h = hex.replace(/#/g, '').toUpperCase();
    if (h.length === 3) {
        return '#' + h.split('').map(c => c + c).join('');
    }
    if (h.length === 4) {
        return '#' + h.slice(0, 3).split('').map(c => c + c).join('');
    }
    return '#' + h;
}
function normalizeHexInput(hexInput) {
    let v = formatHexInput(hexInput.value).replace('#', '');
    if (v.length === 3 || v.length === 4) {
        v = expandShorthandHex('#' + v).replace('#', '');
    }
    if (v.length > 0 && v.length < 6) {
        v = v.padEnd(6, '0');
    }
    return v.length === 6 ? '#' + v : '#' + v;
}

const HISTORY_KEY = 'isle_color_history_v1';
const MAX_HISTORY = 60;
const PREF_KEY = 'isle_prefs_v1';

// 神秘金色码 (Nyor overlay 格式，线性 RGB 0-1)：连点标题 10 次解锁后应用
const DEVCODE_NYOR = '{"v":1,"c":[[0.991,0.716,0.034,1.000],[0.991,0.716,0.034,1.000],[0.991,0.716,0.034,1.000],[0.991,0.716,0.034,1.000],[0.947,0.922,0.791,1.000],[0.847,0.730,0.658,1.000],[0.539,0.270,0.270,1.000],[0.022,0.020,0.014,1.000],[0.991,0.716,0.034,1.000],[0.091,0.651,0.095,1.000]],"p":3,"var":0.000,"g":0}';
// 参与材质微调的 9 个部位（与预览层 ROUGH_METAL_PARTS 一致）
const MT_PART_IDS = ['body', 'underbelly', 'flank', 'markings', 'maleDisplay', 'special', 'teeth', 'mouth', 'claws'];
// 工具纹理粗细 ↔ CNRE 官方 variation 字段映射（v0.5.9.58 合并两个选择器）：中→中、细→细、粗→粗
const SCALE_TO_CNRE_VAR = { fine: 16, medium: 8, coarse: 2 };
const CNRE_VAR_TO_SCALE = { 16: 'fine', 8: 'medium', 2: 'coarse' };
export class UIManager {
    constructor() {
        this.currentDino = 'Dilophosaurus';
        this.currentDinoHasSpecial = !!DINOSAUR_DATA['Dilophosaurus'].hasSpecial;
        this.currentColors = { ...DINOSAUR_DATA['Dilophosaurus'].colors };
        // ★★★ 修改：默认值全部带上 Pattern_ 前缀 ★★★
        this.currentPattern = 'Pattern_1'; 
        this.currentPatternScale = 'medium';
        this.currentVar = 0.5; // 连续 var 值 0-1 (Nyor overlay: 1.0=粗糙, 0.0=细腻)
        this.isFemale = false;
        this.undoRedo = new UndoRedoManager();
        this.themeManager = new ThemeManager();
        this.invertTargetPart = 'body'; // 反色工具当前目标部位（用户点颜色行右侧反色图标切换）
        this.preview = null;
        this.colorHistory = this.loadHistory();
        this.eyeColor = DINOSAUR_DATA['Dilophosaurus'].eyeColor || 'FFFFFF';
        this.skinVariation = 8; // CNRE 纹理粗细：2=粗 / 8=中 / 16=细，默认 8
        this.glitchChannels = {}; // 故障皮：CNRE 通道 id → 原始线性值 {r,g,b}（负=黑斑，正=白斑，越界即故障）
        this.glitchBackup = {};   // 故障皮：编辑器键名 → 进入故障前的原色（用于还原/重复故障）
        this.glitchMode = {};     // 故障皮：CNRE 通道 id → 'neg'|'pos'|'fluor'|'invfluor'
        this.glitchDisplayColors = {}; // 故障皮：CNRE 通道 id → 预览显示色 hex（base color 不改动）
        this.lockedParts = new Set(); // 锁定的部位键名（含 'eye'）；锁定部位不被随机/反色/渐变/导入/官方配色覆盖
        this.presetsCollapsed = false;
        this.codeCollapsed = { skin: false, cnre: false, nyor: false, tool: false };
        // 神秘小功能解锁状态（标题连点 5 次 / 10 次解锁；持久化到偏好）
        this.titleClicks = 0;
        this.materialTuningUnlocked = false;
        this.smoothnessTuningEnabled = false; // 设置里独立开关：光滑度微调
        this.metalnessTuningEnabled = false;  // 设置里独立开关：金属度微调
        this.emissionTuningEnabled = false;   // 设置里独立开关：自发光微调

        this.mysteryUnlocked = false;
        this.cnreSkinDevUnlocked = false; // CNRE 皮肤 dev 原始通道编辑器（标题连点 10 次 / ://CNREskindevtoggle 解锁）
        this._titleClickTimer = null;
        this.presetFilter = { term: '', glitchOnly: false };
        this.presetListHeight = null; // 用户拖动后的高度，null 则用默认 CSS
        this.uiHidden = false;
        this.pendingPreviewPrefs = null;
        this._leftPanelW = 450;   // 左侧面板默认宽度（px）；拖拽调宽并持久化后优先用保存值
        this._rightPanelW = 450;  // 右侧面板默认宽度（px）
        this.loadPreferences();
        this.initDOMElements();
        this.init();
    }

    loadHistory() { try { const data = localStorage.getItem(HISTORY_KEY); return data ? JSON.parse(data) : []; } catch { return []; } }
    saveHistory() { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(this.colorHistory)); } catch {} }

    loadPreferences() {
        try {
            const raw = localStorage.getItem(PREF_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.dino && DINOSAUR_DATA[data.dino]) {
                this.currentDino = data.dino;
                if (DINOSAUR_DATA[data.dino].eyeColor) {
                    this.eyeColor = DINOSAUR_DATA[data.dino].eyeColor;
                }
            }
            if (data.pattern) this.currentPattern = data.pattern;
            if (data.patternScale) this.currentPatternScale = data.patternScale;
            if (typeof data.varValue === 'number') this.currentVar = data.varValue;
            if (typeof data.isFemale === 'boolean') this.isFemale = data.isFemale;
            if ([2, 8, 16].includes(data.skinVariation)) this.skinVariation = data.skinVariation;
            if (Array.isArray(data.lockedParts)) this.lockedParts = new Set(data.lockedParts);
            if (typeof data.leftPanelWidth === 'number' && data.leftPanelWidth > 0) this._leftPanelW = data.leftPanelWidth;
            if (typeof data.rightPanelWidth === 'number' && data.rightPanelWidth > 0) this._rightPanelW = data.rightPanelWidth;
            if (data.codeCollapsed && typeof data.codeCollapsed === 'object') this.codeCollapsed = { ...this.codeCollapsed, ...data.codeCollapsed };
            if (typeof data.presetListHeight === 'number' && data.presetListHeight > 80) this.presetListHeight = data.presetListHeight;
            this.pendingPreviewPrefs = data.preview || null;
            // 神秘小功能解锁状态（持久化）
            if (typeof data.titleClicks === 'number') this.titleClicks = data.titleClicks;
            this.materialTuningUnlocked = !!data.materialTuningUnlocked;
            this.smoothnessTuningEnabled = !!data.smoothnessTuningEnabled;
            this.metalnessTuningEnabled = !!data.metalnessTuningEnabled;
            this.emissionTuningEnabled = !!data.emissionTuningEnabled;
            this.mysteryUnlocked = !!data.mysteryUnlocked;
            this.cnreSkinDevUnlocked = !!data.cnreSkinDevUnlocked;

            // 恐龙/图案恢复完毕后，再按保存的皮肤去取对应默认配色
            // 例如霸王龙 5皮 → 优先用 patterns['5'][0]，而不是 shared[0]
            this.currentDinoHasSpecial = getPatternHasSpecial(this.currentDino, this.currentPattern);
            this.currentColors = this._getDefaultColorsForSkin(this.currentDino, this.currentPattern);
        } catch {}
    }

    /** 取某恐龙某图案的官方默认配色；无官方数据时回退恐龙级默认 */
    _getDefaultColorsForSkin(dino, pattern) {
        let pid = String(pattern).replace(/^Pattern_/, '');
        // patternMeta.sameAs：纹理与目标图案一致，默认配色也跟随目标图案
        const sameAs = DINOSAUR_DATA[dino]?.patternMeta?.[pid]?.sameAs;
        if (sameAs) pid = String(sameAs).replace(/^Pattern_/, '');
        const official = OFFICIAL_SCHEMES[dino];
        if (official && official.patterns && official.patterns[pid] && official.patterns[pid].length > 0) {
            return { ...official.patterns[pid][0].colors };
        }
        if (official && official.shared && official.shared.length > 0) {
            return { ...official.shared[0].colors };
        }
        return { ...(DINOSAUR_DATA[dino]?.colors || {}) };
    }

    savePreferences() {
        try {
            const data = {
                dino: this.currentDino,
                pattern: this.currentPattern,
                patternScale: this.currentPatternScale,
                varValue: this.currentVar,
                isFemale: this.isFemale,
                skinVariation: this.skinVariation,
                eyeColor: this.eyeColor,
                lockedParts: Array.from(this.lockedParts || []),
                leftPanelWidth: this._leftPanelW,
                rightPanelWidth: this._rightPanelW,
                codeCollapsed: this.codeCollapsed,
                presetListHeight: this.presetListHeight,
                titleClicks: this.titleClicks,
                materialTuningUnlocked: this.materialTuningUnlocked,
                smoothnessTuningEnabled: this.smoothnessTuningEnabled,
                metalnessTuningEnabled: this.metalnessTuningEnabled,
                emissionTuningEnabled: this.emissionTuningEnabled,
                mysteryUnlocked: this.mysteryUnlocked,
                cnreSkinDevUnlocked: this.cnreSkinDevUnlocked,
                preview: this.preview ? this.preview.getPreviewState() : this.pendingPreviewPrefs
            };
            localStorage.setItem(PREF_KEY, JSON.stringify(data));
        } catch {}
    }

    addToHistory(hex) {
        hex = hex.toUpperCase();
        this.colorHistory = this.colorHistory.filter(h => h !== hex);
        this.colorHistory.unshift(hex);
        if (this.colorHistory.length > MAX_HISTORY) this.colorHistory.pop();
        this.saveHistory();
        this.renderHistory();
    }

    renderHistory() {
        const container = document.getElementById('historyPalette');
        if (!container) return;
        container.innerHTML = '';
        if (this.colorHistory.length === 0) {
            container.innerHTML = '<span style="color:var(--text-secondary);font-size:0.7rem;">使用过的颜色将显示在此</span>';
            return;
        }
        this.colorHistory.forEach(hex => {
            const swatch = document.createElement('div');
            swatch.className = 'history-swatch';
            swatch.style.backgroundColor = '#' + hex;
            swatch.title = hex;
            swatch.setAttribute('data-color', hex);
            swatch.setAttribute('draggable', 'true');
            swatch.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'color', hex: hex, part: null, label: '历史颜色' }));
                e.dataTransfer.effectAllowed = 'copy';
                const preview = document.getElementById('drag-preview');
                if (preview) { preview.style.backgroundColor = '#' + hex; preview.style.display = 'block'; e.dataTransfer.setDragImage(preview, 12, 12); }
            });
            swatch.addEventListener('dragend', () => { document.getElementById('drag-preview').style.display = 'none'; });
            swatch.addEventListener('click', () => this.applySolidColor('#' + hex));
            container.appendChild(swatch);
        });
    }

    initDOMElements() {
        this.el = {};
        const ids = ['dinosaurSelectTrigger', 'dinosaurSelectPanel', 'patternTypeSelect', 'patternScaleSelect', 'varSlider', 'varValue', 'presetSchemeTrigger', 'presetSchemePanel', 'presetSchemeSearch', 'officialSchemeSelect', 'colorGrid', 'skinCodeDisplay', 'cnreCodeDisplay', 'nyorCodeDisplay', 'toolCodeDisplay', 'solidColorHex', 'gradHex1', 'gradHex2', 'gradSteps', 'twoColorGradientResults', 'presetList', 'presetListWrapper', 'presetResizeHandle', 'presetSearchInput', 'presetGlitchFilter', 'presetNameInput', 'importCodeInput', 'genderMaleBtn', 'genderFemaleBtn', 'eyeColorHex', 'qualitySelect', 'ageStageSlider', 'ageStageLabel', 'ageStageRow', 'featherAlphaSlider', 'featherAlphaValue', 'featherAlphaRow'];
        ids.forEach(id => { this.el[id] = document.getElementById(id); });
    }

    init() {
        this.themeManager.init();
        this.themeManager.onThemeChange = (theme) => { if (this.preview) this.preview.updateTheme(theme); this.savePreferences(); };
        this.initDinosaurSelect();
        // 恢复保存的图案和纹理比例
        if (this.el.patternTypeSelect && this.currentPattern) this.el.patternTypeSelect.value = this.currentPattern;
        if (this.el.patternScaleSelect && this.currentPatternScale) this.el.patternScaleSelect.value = this.currentPatternScale;
        // 合并后：CNRE 纹理粗细字段始终由工具纹理粗细派生
        this.skinVariation = SCALE_TO_CNRE_VAR[this.currentPatternScale] ?? 8;
        if (this.el.varSlider && typeof this.currentVar === 'number') { this.el.varSlider.value = this.currentVar; this.updateVarDisplay(); }
        this.initPresetSchemeSelect();
        this.buildColorInputs();
        this.undoRedo.reset(this.snapshot());
        this.updateSkinCode();
        this.renderPresets();
        this.renderHistory();
        this.bindEvents();
        this.initPanelResizers();
        this.updateThemeIcon();
        this.updateGenderUI();
        setTimeout(() => this.initPreview(), 100);
    }

    /** 面板拖拽调宽（v0.5.9.13）：左右面板边缘可拖拽调整宽度并持久化 */
    initPanelResizers() {
        const container = document.getElementById('app-container');
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const leftResizer = document.getElementById('leftPanelResizer');
        const rightResizer = document.getElementById('rightPanelResizer');
        if (!container || !leftPanel || !leftResizer) return;

        const MIN = 220;
        const MAX_FRAC = 0.55;

        const applyWidth = (side, w) => {
            w = Math.max(MIN, Math.min(w, window.innerWidth * MAX_FRAC));
            if (side === 'left') this._leftPanelW = w;
            else this._rightPanelW = w;
            // 用 CSS 变量而非 inline grid-template-columns，避免覆盖 .ui-hidden 的 0 1fr 0
            if (this._leftPanelW != null) container.style.setProperty('--left-panel-w', this._leftPanelW + 'px');
            else container.style.removeProperty('--left-panel-w');
            if (rightPanel && this._rightPanelW != null) container.style.setProperty('--right-panel-w', this._rightPanelW + 'px');
            else if (rightPanel) container.style.removeProperty('--right-panel-w');
            const lw = this._leftPanelW != null ? this._leftPanelW : leftPanel.offsetWidth;
            const rw = this._rightPanelW != null ? this._rightPanelW : (rightPanel ? rightPanel.offsetWidth : null);
            leftResizer.style.left = lw + 'px';
            if (rightPanel && rightResizer) rightResizer.style.right = (rw != null ? rw : rightPanel.offsetWidth) + 'px';
        };

        // 初始化位置：有保存值则应用，否则让手柄跟随当前 grid 实际宽度
        if (this._leftPanelW != null) applyWidth('left', this._leftPanelW);
        else leftResizer.style.left = leftPanel.offsetWidth + 'px';
        if (rightPanel && rightResizer) {
            if (this._rightPanelW != null) applyWidth('right', this._rightPanelW);
            else rightResizer.style.right = rightPanel.offsetWidth + 'px';
        }

        const bindResize = (resizer, side) => {
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                resizer.classList.add('dragging');
                const startX = e.clientX;
                const startW = side === 'left' ? leftPanel.offsetWidth : rightPanel.offsetWidth;
                const onMove = (ev) => {
                    const delta = ev.clientX - startX;
                    applyWidth(side, side === 'left' ? startW + delta : startW - delta);
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    resizer.classList.remove('dragging');
                    this.savePreferences();
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
            });
        };
        bindResize(leftResizer, 'left');
        if (rightPanel && rightResizer) bindResize(rightResizer, 'right');

        // 窗口缩放时：有保存值则 clamp 应用，否则让手柄跟随 grid 实际宽度
        window.addEventListener('resize', () => {
            if (this._leftPanelW != null) applyWidth('left', this._leftPanelW);
            else leftResizer.style.left = leftPanel.offsetWidth + 'px';
            if (rightPanel && rightResizer) {
                if (this._rightPanelW != null) applyWidth('right', this._rightPanelW);
                else rightResizer.style.right = rightPanel.offsetWidth + 'px';
            }
        });
    }

    initPreview() {
        this.preview = new DinoPreview('preview-container');
        this.preview.updateTheme(this.themeManager.getEffectiveTheme());
        this.preview.setGender(this.isFemale);
        // 恢复上次预览状态（光照、背景、法线等）
        if (this.pendingPreviewPrefs) {
            this.preview.applyPreviewState(this.pendingPreviewPrefs);
            this.pendingPreviewPrefs = null;
        }
        // 预览状态变化时自动保存偏好
        this.preview.onStateChange = () => this.savePreferences();
        setTimeout(() => {
            this.loadPreviewModel().then(() => { this.updateMorphUI(); this.syncAnimSpeedUI(); });
        }, 500);
    }

    /** 把动画速度滑块/标签同步为当前 preview.timeScale（加载/切换恐龙后调用） */
    syncAnimSpeedUI() {
        const slider = document.getElementById('animSpeedSlider');
        const label = document.getElementById('animSpeedValue');
        const v = this.preview ? this.preview.timeScale : 1.0;
        if (slider) slider.value = String(v);
        if (label) label.textContent = (+v).toFixed(1) + 'x';
    }

    /** 根据当前恐龙是否有形态键或动画数据，显示/隐藏年龄段滑块 */
    updateMorphUI() {
        if (!this.preview) return;
        // 仅当检测到"年龄段"形态键（hatchling/juvenile/subadult/elder）时才显示年龄段 UI。
        // 非可玩物种（如美颌龙/翼手龙）只有 Adult_Idle、无年龄段 morph → 隐藏 UI，直接用 Adult_Idle。
        const hasAgeStage = this.preview.hasAgeStageMorph();
        const row = this.el.ageStageRow;
        if (row) row.style.display = hasAgeStage ? 'block' : 'none';
        if (hasAgeStage && this.el.ageStageSlider) {
            this.el.ageStageSlider.value = this.preview.ageStage;
            this.updateAgeStageLabel(this.preview.ageStage);
        }
        // 动态更新年龄段快捷标签
        this._updateAgeMarkers();
    }

    /** 根据检测到的形态键动态更新年龄段标签 */
    _updateAgeMarkers() {
        if (!this.preview) return;
        const keys = this.preview.getDetectedMorphKeys();
        const hasHatch = !!keys.hatchling;
        const hasSub   = !!keys.subadult;
        const hasElder = !!keys.elder;

        // 根据检测结果确定各位置的标签
        const markerDefs = [
            { pos: 0,   label: hasHatch ? '0%幼体' : '0%幼年' },
            { pos: 25,  label: '25%幼年',  show: hasHatch && hasSub },
            { pos: 50,  label: hasSub ? '50%亚成年' : hasHatch ? '50%幼年' : '50%亚成年' },
            { pos: 75,  label: '75%成年' },
            { pos: 100, label: '100%长老', show: hasElder },
        ];

        const container = document.querySelector('.age-stage-markers');
        if (!container) return;

        // 重建 markers
        container.innerHTML = '';
        for (const def of markerDefs) {
            if (def.show === false) continue;
            const span = document.createElement('span');
            span.className = 'age-stage-marker';
            span.dataset.value = def.pos;
            span.textContent = def.label;
            span.addEventListener('click', () => {
                const val = parseInt(span.dataset.value);
                if (this.el.ageStageSlider) this.el.ageStageSlider.value = val;
                this.updateAgeStageLabel(val);
                if (this.preview) this.preview.setAgeStage(val, this.currentDino);
                this.savePreferences();
            });
            container.appendChild(span);
        }
    }

    async loadPreviewModel() {
        // 保留当前年龄段，避免切图案/皮肤时滑块被重置回默认 75
        const savedAgeStage = (this.preview && typeof this.preview.ageStage === 'number') ? this.preview.ageStage : 75;
        // 尝试加载当前选中的图案。如果不成功，three.js 底层会自动 fallback 到彩色测试纹理
        const success = await this.preview.loadModel(this.currentDino, this.currentPattern);
        if (success) { 
            this.preview.updateColors(this.currentColors); 
            this.preview.setEyeColor(this.eyeColor); 
        }
        // 重载模型后 ageStage 已被重置为 75，这里还原用户选择的值（morph + idle 同步重算）
        if (this.preview) this.preview.setAgeStage(savedAgeStage, this.currentDino);
        this.updateMorphUI();
    }

    initDinosaurSelect() {
        const trigger = this.el.dinosaurSelectTrigger;
        const panel = this.el.dinosaurSelectPanel;
        if (!trigger || !panel) return;
        panel.innerHTML = '';
        const diets = { herbivore: [], omnivore: [], carnivore: [] };

        for (const [key, data] of Object.entries(DINOSAUR_DATA)) {
            const dietType = data.diet || 'herbivore';
            if (diets[dietType]) { diets[dietType].push({ key, name: data.name }); }
        }

        const dietOrder = ['herbivore', 'omnivore', 'carnivore'];
        for (const diet of dietOrder) {
            const dinos = diets[diet];
            if (dinos.length === 0) continue;
            const label = document.createElement('div');
            label.className = `tree-group-label diet-${diet}`;
            label.textContent = `── ${DIET_LABELS[diet]} ──`;
            panel.appendChild(label);
            dinos.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
            dinos.forEach(d => {
                const item = document.createElement('div');
                item.className = 'tree-item tree-dino-select' + (d.key === this.currentDino ? ' selected' : '');
                item.dataset.dino = d.key;
                item.innerHTML = `<span class="dino-select-dot" style="background-color:${DIET_COLORS[diet]};"></span><span>${d.name}</span>`;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.switchDinosaur(d.key);
                    panel.classList.remove('open');
                    trigger.classList.remove('open');
                });
                panel.appendChild(item);
            });
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = panel.classList.toggle('open');
            trigger.classList.toggle('open', open);
        });
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== trigger) {
                panel.classList.remove('open');
                trigger.classList.remove('open');
            }
        });

        this.syncDinosaurSelectTrigger();
        // 初始化时更新图案下拉列表
        this.updatePatternSelect(this.currentDino);
    }

    syncDinosaurSelectTrigger() {
        const trigger = this.el.dinosaurSelectTrigger;
        if (!trigger) return;
        const data = DINOSAUR_DATA[this.currentDino];
        trigger.textContent = data ? data.name : (this.currentDino || '-- 选择恐龙 --');
        const panel = this.el.dinosaurSelectPanel;
        if (panel) {
            panel.querySelectorAll('.tree-dino-select').forEach(el => {
                el.classList.toggle('selected', el.dataset.dino === this.currentDino);
            });
        }
    }

    updatePatternSelect(dinoKey) {
        const select = this.el.patternTypeSelect;
        select.innerHTML = '';
        
        const dinoData = DINOSAUR_DATA[dinoKey];
        if (!dinoData || !dinoData.patterns || dinoData.patterns.length === 0) {
            // 如果没有图案数据，默认回退给三个占位符
            ['1', '2', '3'].forEach(key => {
                const opt = document.createElement('option');
                // ★★★ 核心：即使回退，我们也强制把 value 拼成 Pattern_ 开头的 ★★★
                const value = `Pattern_${key}`;
                opt.value = value; 
                opt.textContent = `Pattern_${key}`;
                select.appendChild(opt);
            });
            return;
        }

        // 根据数组动态生成下拉选项
        dinoData.patterns.forEach(patternKey => {
            const opt = document.createElement('option');

            // ★★★ 核心逻辑：你写的是什么（例如 QWERT），我们就拼成 Pattern_QWERT ★★★
            // 如果该关键字本身已经带了 Pattern_ 前缀，就直接用，否则就加上。
            const value = patternKey.startsWith('Pattern_') ? patternKey : `Pattern_${patternKey}`;

            opt.value = value;
            // UI 显示的文本可以处理一下下划线，比如 QWERT 或者 Juvenile_1，让用户看得更舒服
            opt.textContent = patternKey.replace(/_/g, ' '); 

            // 验证当前选中的是否匹配
            if (value === this.currentPattern) opt.selected = true;
            
            select.appendChild(opt);
        });
    }

    initPresetSchemeSelect() {
        const panel = this.el.presetSchemePanel;
        const trigger = this.el.presetSchemeTrigger;
        const search = this.el.presetSchemeSearch;
        if (!panel || !trigger) return;

        // 保留搜索输入框，清空其余内容
        const oldSearch = search;
        panel.innerHTML = '';
        if (oldSearch) {
            oldSearch.value = '';
            panel.appendChild(oldSearch);
        }

        const build = (cls, text, indent = 0, opts = {}) => {
            const el = document.createElement('div');
            el.className = 'tree-item ' + cls;
            if (indent) el.style.paddingLeft = (0.4 + indent * 0.75) + 'rem';
            el.textContent = text;
            if (opts.title) el.title = opts.title;
            if (opts.value !== undefined) {
                el.dataset.value = opts.value;
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.applyPresetSchemeValue(opts.value);
                    trigger.textContent = text;
                    panel.classList.remove('open');
                    trigger.classList.remove('open');
                });
            }
            return el;
        };

        const buildDinoBlock = (d, opts = {}) => {
            const block = document.createElement('div');
            block.className = 'tree-dino-block';
            block.dataset.dino = d.key;
            block.dataset.dinoName = d.name.toLowerCase();
            const off = OFFICIAL_SCHEMES[d.key];

            block.appendChild(build('tree-dino', d.name));
            // 通用配色 (图案 1/2/3)
            if (off.shared && off.shared.length) {
                block.appendChild(build('tree-pattern', '图案 1, 2, 3', 1));
                off.shared.forEach((s, i) => {
                    const label = i === 0 ? `${s.name}（默认）` : s.name;
                    block.appendChild(build('tree-scheme', label, 2, { value: `${d.key}:shared:${i}` }));
                });
            }
            // 图案专属配色
            const pkeys = Object.keys(off.patterns || {}).sort((a, b) => {
                const na = Number(a), nb = Number(b);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return String(a).localeCompare(String(b));
            });
            pkeys.forEach(pid => {
                const list = off.patterns[pid];
                if (!list || !list.length) return;
                block.appendChild(build('tree-pattern', `图案 ${pid}`, 1));
                list.forEach((s, i) => block.appendChild(build('tree-scheme', s.name, 2, { value: `${d.key}:pattern:${pid}:${i}` })));
            });
            // 旧版归档
            if (off.archived && off.archived.length) {
                block.appendChild(build('tree-pattern', '旧版归档', 1));
                off.archived.forEach((s, i) => block.appendChild(build('tree-scheme', s.name, 2, { value: `${d.key}:archived:${i}` })));
            }
            return block;
        };

        // 特殊配色
        panel.appendChild(build('tree-group-label', '── 特殊配色 ──'));
        panel.appendChild(build('tree-scheme', '汉尼拔 配色', 1, { value: 'cannibal', title: '套用 汉尼拔 特殊配色' }));

        // 当前恐龙置顶（如果有官方配色）
        const currentOff = OFFICIAL_SCHEMES[this.currentDino];
        if (currentOff) {
            const currentData = DINOSAUR_DATA[this.currentDino];
            const currentLabel = document.createElement('div');
            currentLabel.className = 'tree-group-label diet-current';
            currentLabel.textContent = `── 当前恐龙：${currentData?.name || this.currentDino} ──`;
            panel.appendChild(currentLabel);
            panel.appendChild(buildDinoBlock({ key: this.currentDino, name: currentData?.name || this.currentDino }));
        }

        // 按食性分组列出其余有官方配色的恐龙
        const diets = { herbivore: [], omnivore: [], carnivore: [] };
        for (const [key, data] of Object.entries(DINOSAUR_DATA)) {
            const dietType = data.diet || 'herbivore';
            if (diets[dietType]) diets[dietType].push({ key, name: data.name });
        }
        const dietOrder = ['herbivore', 'omnivore', 'carnivore'];
        for (const diet of dietOrder) {
            const dinos = diets[diet].filter(d => d.key !== this.currentDino && OFFICIAL_SCHEMES[d.key]);
            if (dinos.length === 0) continue;
            const label = document.createElement('div');
            label.className = `tree-group-label diet-${diet}`;
            label.textContent = `── ${DIET_LABELS[diet]}恐龙 ──`;
            panel.appendChild(label);
            dinos.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
            dinos.forEach(d => panel.appendChild(buildDinoBlock(d)));
        }

        // 搜索过滤
        if (search) {
            search.addEventListener('input', () => {
                const term = search.value.trim().toLowerCase();
                panel.querySelectorAll('.tree-dino-block').forEach(block => {
                    const match = !term || block.dataset.dinoName.includes(term);
                    block.style.display = match ? '' : 'none';
                });
            });
            // 点击搜索框不冒泡到 document 关闭面板（已由 panel.contains 处理）
            search.addEventListener('click', (e) => e.stopPropagation());
        }

        // 展开/收起
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = panel.classList.toggle('open');
            trigger.classList.toggle('open', open);
        });
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== trigger) {
                panel.classList.remove('open');
                trigger.classList.remove('open');
            }
        });
    }

    applyPresetSchemeValue(value) {
        if (!value) return;
        if (value === 'cannibal') {
            this.applyPresetColors(CANNIBAL_COLORS);
            this.showToast('已套用 Cannibal 配色');
            this.savePreferences();
            return;
        }
        const [dinoKey, scope, ...rest] = value.split(':');
        const off = OFFICIAL_SCHEMES[dinoKey];
        if (!off) return;
        let scheme = null, patternId = null;
        if (scope === 'shared') {
            scheme = off.shared[parseInt(rest[0], 10)];
        } else if (scope === 'pattern') {
            patternId = rest[0];
            scheme = off.patterns[patternId]?.[parseInt(rest[1], 10)];
        } else if (scope === 'archived') {
            scheme = off.archived?.[parseInt(rest[0], 10)];
        }
        if (!scheme) return;
        const data = DINOSAUR_DATA[dinoKey];
        // 图案专属配色：尝试切到对应图案（贴图未导入则只套色并提示）
        if (scope === 'pattern' && patternId) {
            const target = 'Pattern_' + patternId;
            if (data?.patterns?.includes(patternId)) {
                this.currentPattern = target;
                if (this.el.patternTypeSelect) this.el.patternTypeSelect.value = target;
            } else {
                this.showToast(`⚠️ ${data?.name || dinoKey} 图案 ${patternId} 贴图未导入，仅套用颜色`);
            }
        }
        this.applyPresetColors({ ...(data?.colors || {}), ...scheme.colors }, { eyeColor: data?.eyeColor });
        this.resetGradientUI();
        this.savePreferences();
        this.showToast(`已套用 ${data?.name || dinoKey} · ${scheme.name}`);
    }

    createDraggableSwatch(colorHex, partId, label) {
        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'draggable-swatch';
        input.value = '#' + colorHex;
        input.setAttribute('draggable', 'true');
        input.setAttribute('data-color', colorHex);
        input.setAttribute('data-part', partId);
        input.setAttribute('data-label', label);
        input.title = '点击打开颜色选择器；右键从屏幕/预览取色';

        // 右键 swatch 启动项目吸色器（Chrome/Edge 原生 color picker 已自带吸管，此处作为 fallback）
        input.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (input.disabled) return;
            this.startEyedrop(partId);
        });

        input.addEventListener('dragstart', (e) => {
            const hex = input.getAttribute('data-color');
            const payload = { type: 'color', hex: hex, part: partId, label: label };
            const cnreId = colorKeyToCnreId(partId);
            if (this.glitchChannels[cnreId]) {
                payload.glitch = {
                    channels: { ...this.glitchChannels[cnreId] },
                    mode: this.glitchMode[cnreId] || 'neg'
                };
            }
            e.dataTransfer.setData('text/plain', JSON.stringify(payload));
            e.dataTransfer.effectAllowed = 'copy';
            input.classList.add('dragging');
            const dragPreview = document.getElementById('drag-preview');
            if (dragPreview) { dragPreview.style.backgroundColor = '#' + hex; dragPreview.style.display = 'block'; e.dataTransfer.setDragImage(dragPreview, 12, 12); }
        });
        input.addEventListener('dragend', () => { input.classList.remove('dragging'); document.getElementById('drag-preview').style.display = 'none'; document.querySelectorAll('.drag-target').forEach(el => { el.classList.remove('drag-target'); }); });
        return input;
    }

    /** 部位标签前的可点击锁块：默认显示部位固定色（maskColor），锁定态显示锁图标 */
    createLockDot(key, maskColor) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'color-dot lock-dot';
        if (maskColor) {
            dot.style.backgroundColor = maskColor;
            dot.style.color = maskColor;
        } else {
            // 眼部无固定 maskColor，CSS 把 dot 设成白色；锁图标也跟随白色
            dot.style.color = '#ffffff';
        }
        dot.title = '点击锁定/解锁该部位（锁定后不被随机/反色/渐变/导入/配色覆盖）';
        dot.innerHTML = '<i class="icon ico-locked sz14"></i>';
        dot.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleLock(key); });
        return dot;
    }

    makeDropTarget(element, targetPartId, targetLabel) {
        element.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; element.classList.add('drag-target'); });
        element.addEventListener('dragleave', () => { element.classList.remove('drag-target'); });
        element.addEventListener('drop', (e) => {
            e.preventDefault(); element.classList.remove('drag-target');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'color') {
                    const hex = data.hex;
                    const hasGlitch = !!data.glitch;
                    if (targetPartId === 'eye') {
                        if (this.isLocked('eye')) { this.showToast('眼部已锁定，无法拖放'); return; }
                        if (hasGlitch) {
                            this.glitchBackup['eye'] = this.eyeColor || 'FFFFFF';
                            this.eyeColor = hex;
                            this.glitchChannels['eyes'] = { ...data.glitch.channels };
                            this.glitchMode['eyes'] = data.glitch.mode || 'neg';
                            this.refreshChannelUI(); this.onColorsChanged();
                            this.showToast('已应用故障颜色到眼部');
                        } else {
                            this.handleEyeColorChange(hex); this.updateEyeUI(); this.showToast(`已应用颜色到眼部`);
                        }
                        return;
                    }
                    if (targetPartId === 'solid') { this.applySolidColor('#' + hex); return; }
                    if (targetPartId && hex) {
                        if (this.isLocked(targetPartId)) { this.showToast(`「${targetLabel || targetPartId}」已锁定，无法拖放`); return; }
                        if (hasGlitch) {
                            this.glitchBackup[targetPartId] = this.currentColors[targetPartId];
                            this.currentColors[targetPartId] = hex;
                            const cnreId = colorKeyToCnreId(targetPartId);
                            this.glitchChannels[cnreId] = { ...data.glitch.channels };
                            this.glitchMode[cnreId] = data.glitch.mode || 'neg';
                            this.refreshChannelUI(); this.onColorsChanged(); this.addToHistory(hex);
                            this.showToast(`已应用故障颜色到 ${targetLabel || targetPartId}`);
                        } else {
                            this.handleColorChange(targetPartId, hex); this.updateAllInputs(); this.onColorsChanged(); this.addToHistory(hex); this.showToast(`已应用颜色到 ${targetLabel || targetPartId}`);
                        }
                    }
                }
            } catch (err) { console.warn('拖拽解析失败', err); }
        });
    }

    // -----------------------------------------------------------------------
    // 每通道 锁定 / 故障 控制（v0.5.9.11）
    // -----------------------------------------------------------------------

    /** 编辑器键名（含 'eye'）是否被锁定 */
    isLocked(key) { return this.lockedParts.has(key); }

    /** 编辑器键名（含 'eye'）对应通道是否处于故障态 */
    isGlitched(key) { return !!this.glitchChannels[colorKeyToCnreId(key)]; }

    /** 锁定 或 故障 均视为「受保护」：不被随机/反色/渐变/拖放等改色 */
    isProtected(key) { return this.isLocked(key) || this.isGlitched(key); }

    /** 合并导入/应用的颜色，锁定部位保留旧值 */
    mergeImportedColors(newColors) {
        const merged = { ...newColors };
        for (const key of this.lockedParts) {
            if (key !== 'eye' && this.currentColors[key] !== undefined) merged[key] = this.currentColors[key];
        }
        return merged;
    }

    /** 创建故障通道控制 + 可选左侧操作按钮。
     *  返回一个「操作行」片段：左侧放 reset / invert 等通用按钮（可选），右侧放故障按钮；
     *  下一行是 raw R/G/B 行，仅在故障态显示。
     *  故障按钮：闪电=反向故障（负/黑斑），星星=正向故障（正/白斑），荧光/反色荧光。 */
    createGlitchRawRow(key, extraLeftButtons = []) {
        const frag = document.createDocumentFragment();

        // ---- 操作行：左侧通用按钮 + 右侧故障按钮 ----
        const actionsRow = document.createElement('div'); actionsRow.className = 'color-actions-row';
        if (extraLeftButtons && extraLeftButtons.length) {
            const left = document.createElement('div'); left.className = 'color-actions-left';
            extraLeftButtons.forEach(b => left.appendChild(b));
            actionsRow.appendChild(left);
        }
        const right = document.createElement('div'); right.className = 'color-actions-right';

        const row = document.createElement('div'); row.className = 'glitch-row';
        const negBtn = document.createElement('button');
        negBtn.type = 'button';
        negBtn.className = 'tool-btn glitch-btn glitch-btn-neg';
        negBtn.title = '反向故障（负值 → 黑斑）';
        negBtn.innerHTML = '<i class="icon ico-glitch sz16"></i>';
        negBtn.addEventListener('click', () => this.toggleGlitch(key, 'neg'));
        row.appendChild(negBtn);

        const posBtn = document.createElement('button');
        posBtn.type = 'button';
        posBtn.className = 'tool-btn glitch-btn glitch-btn-pos';
        posBtn.title = '正向故障（正值 → 白斑，仍带故障特效）';
        posBtn.innerHTML = '<i class="icon ico-star-rounded sz16"></i>';
        posBtn.addEventListener('click', () => this.toggleGlitch(key, 'pos'));
        row.appendChild(posBtn);

        const fluorBtn = document.createElement('button');
        fluorBtn.type = 'button';
        fluorBtn.className = 'tool-btn glitch-btn glitch-btn-fluor';
        fluorBtn.title = '荧光故障：自动匹配最近高饱和色后再套用（主导通道正、其余负 → 鲜艳荧光色，而非黑/白斑）；再次点击解除';
        fluorBtn.innerHTML = '<i class="icon ico-fluorescent sz16"></i>';
        fluorBtn.addEventListener('click', () => this.applyFluorescentGlitch(key));
        row.appendChild(fluorBtn);

        const invfluorBtn = document.createElement('button');
        invfluorBtn.type = 'button';
        invfluorBtn.className = 'tool-btn glitch-btn glitch-btn-invfluor';
        invfluorBtn.title = '反色荧光故障：自动匹配最近高饱和色后再套用（主导通道负、其余正 → 鲜艳荧光反色，如青 → 荧光深红）；再次点击解除';
        invfluorBtn.innerHTML = '<i class="icon ico-invert-color sz16"></i>';
        invfluorBtn.addEventListener('click', () => this.applyInvertedFluorescentGlitch(key));
        row.appendChild(invfluorBtn);

        // 自定义故障徽标：当 raw 值不匹配 neg/pos/fluor/invfluor 任一预设模式时显示（palette 图标，非按钮）
        const customBadge = document.createElement('span');
        customBadge.className = 'glitch-custom-badge';
        customBadge.title = '自定义故障：R/G/B 正负组合不匹配任一预设模式（手动翻转过分量符号）';
        customBadge.innerHTML = '<i class="icon ico-palette sz16"></i>';
        row.appendChild(customBadge);

        // 取消故障按钮：当前通道有故障时显示在最右侧，点击恢复 base 颜色
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'tool-btn glitch-btn glitch-cancel-btn';
        cancelBtn.title = '取消该部位故障，恢复 base 颜色';
        cancelBtn.innerHTML = '<i class="icon ico-close sz16"></i>';
        cancelBtn.addEventListener('click', () => this._turnOffGlitch(key));
        row.appendChild(cancelBtn);

        right.appendChild(row);
        actionsRow.appendChild(right);
        frag.appendChild(actionsRow);

        // ---- raw R/G/B 行（故障态才显示，下一行）----
        const raw = document.createElement('div'); raw.className = 'glitch-raw';
        raw.style.display = 'none';
        ['r', 'g', 'b'].forEach(comp => {
            const field = document.createElement('div'); field.className = 'glitch-raw-field';
            const lab = document.createElement('i'); lab.textContent = comp.toUpperCase();
            const signBtn = document.createElement('button');
            signBtn.type = 'button'; signBtn.className = 'glitch-sign';
            signBtn.dataset.comp = comp; signBtn.title = `${comp.toUpperCase()} 分量符号：负=黑斑，正=白斑（可单分量翻转）`;
            signBtn.innerHTML = '<i class="icon ico-glitch-neg sz12"></i>';
            signBtn.addEventListener('click', () => this.flipGlitchComponent(key, comp));
            const inp = document.createElement('input');
            inp.type = 'number'; inp.step = 'any'; inp.className = 'glitch-raw-input';
            inp.dataset.comp = comp;
            inp.title = `${comp.toUpperCase()} 原始线性值（负=黑，正=白，越界即故障）`;
            inp.addEventListener('change', () => this.onGlitchRawInput(key, comp, inp.value));
            field.appendChild(lab); field.appendChild(signBtn); field.appendChild(inp);
            raw.appendChild(field);
        });
        frag.appendChild(raw);
        frag.appendChild(this.createDevRawEditor(key));
        return frag;
    }

    /** CNRE 皮肤 dev 原始通道编辑器（标题连点 10 次 / ://CNREskindevtoggle 解锁，v0.5.9.66）。
     *  每部位一个「原始」折叠面板，内含两个互斥 tab：输入（数字 + 量级按钮）/ 滑块（对数滑块 + 一键非法值）。
     *  编辑任意分量即写入 glitchChannels（首编辑自动进入 raw/自定义故障，base 色与 HEX 不变）。 */
    createDevRawEditor(key) {
        const frag = document.createDocumentFragment();
        const editor = document.createElement('div');
        editor.className = 'dev-raw-editor collapsed';
        editor.dataset.key = key;
        const compRows = (cls) => ['r', 'g', 'b'].map(comp => {
            if (cls === 'input') {
                return `<div class="dev-raw-inrow" data-comp="${comp}">
                    <span class="dev-raw-comp">${comp.toUpperCase()}</span>
                    <input type="number" step="any" class="dev-raw-num" data-comp="${comp}" title="原始线性值（负=黑，正=白，越界即故障）">
                    <div class="dev-raw-mag">
                        <button type="button" data-mul="0.001" title="÷1e3">÷1e3</button>
                        <button type="button" data-mul="1000" title="×1e3">×1e3</button>
                        <button type="button" data-mul="1e6" title="×1e6">×1e6</button>
                        <button type="button" data-mul="1e9" title="×1e9">×1e9</button>
                        <button type="button" data-mul="1e12" title="×1e12">×1e12</button>
                    </div>
                    <button type="button" class="dev-raw-sign" title="翻转符号">±</button>
                </div>`;
            }
            return `<div class="dev-raw-slrow" data-comp="${comp}">
                <span class="dev-raw-comp">${comp.toUpperCase()}</span>
                <input type="range" class="dev-raw-slider" data-comp="${comp}" min="-100" max="100" step="1" value="0" title="对数滑块：量级 1→1e6，方向决定正负">
                <span class="dev-raw-slval" data-comp="${comp}">0</span>
                <div class="dev-raw-presets">
                    <button type="button" data-val="-9.99" title="非法负数">−9.99</button>
                    <button type="button" data-val="-999" title="很小负数">−999</button>
                    <button type="button" data-val="-999999" title="很小很小负数">−999999</button>
                    <button type="button" data-scale="100" title="更小（量级×100）">再小</button>
                    <button type="button" data-val="9.99" title="非法正数">9.99</button>
                    <button type="button" data-val="999" title="很大正数">999</button>
                    <button type="button" data-val="999999" title="很大很大正数">999999</button>
                    <button type="button" data-scale="100" title="更大（量级×100）">再大</button>
                </div>
            </div>`;
        }).join('');
        editor.innerHTML = `
            <div class="dev-raw-head">
                <span class="dev-raw-caret">▾</span>
                <span class="dev-raw-title">://devmode 他妈的我也没搞清楚这个怎么用</span>
            </div>
            <div class="dev-raw-body">
                <div class="dev-raw-tabs">
                    <span class="dev-raw-tab active" data-tab="input">输入</span>
                    <span class="dev-raw-tab" data-tab="slider">滑块</span>
                </div>
                <div class="dev-raw-panel active" data-panel="input">${compRows('input')}
                    <div class="dev-raw-hint">来进行一些疯狂的非法值运算吧！</div>
                </div>
                <div class="dev-raw-panel" data-panel="slider">${compRows('slider')}
                    <div class="dev-raw-hint">非法值！更加非法！法非加更！值法非</div>
                </div>
            </div>`;
        // 折叠
        editor.querySelector('.dev-raw-head').addEventListener('click', () => editor.classList.toggle('collapsed'));
        // tab 切换（互斥，一次只能用一个，避免与输入冲突）
        editor.querySelectorAll('.dev-raw-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                editor.querySelectorAll('.dev-raw-tab').forEach(t => t.classList.toggle('active', t === tab));
                editor.querySelectorAll('.dev-raw-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
            });
        });
        // 输入：数字提交
        editor.querySelectorAll('.dev-raw-num').forEach(inp => {
            const comp = inp.closest('.dev-raw-inrow').dataset.comp;
            inp.addEventListener('change', () => this.setDevRaw(key, comp, inp.value));
        });
        // 输入：量级按钮（从所在行取 comp）
        editor.querySelectorAll('.dev-raw-mag button').forEach(btn => {
            const comp = btn.closest('.dev-raw-inrow').dataset.comp;
            btn.addEventListener('click', () => this.devRawMagnitude(key, comp, parseFloat(btn.dataset.mul)));
        });
        // 输入：符号翻转
        editor.querySelectorAll('.dev-raw-sign').forEach(btn => {
            const comp = btn.closest('.dev-raw-inrow').dataset.comp;
            btn.addEventListener('click', () => this.devRawFlipSign(key, comp));
        });
        // 滑块：拖动实时写入
        editor.querySelectorAll('.dev-raw-slider').forEach(sl => {
            const comp = sl.closest('.dev-raw-slrow').dataset.comp;
            sl.addEventListener('input', () => this.setDevRaw(key, comp, sliderToRaw(parseFloat(sl.value))));
        });
        // 滑块：一键非法值 / 量级缩放
        editor.querySelectorAll('.dev-raw-presets button').forEach(btn => {
            const comp = btn.closest('.dev-raw-slrow').dataset.comp;
            if (btn.dataset.val != null) btn.addEventListener('click', () => this.setDevRaw(key, comp, parseFloat(btn.dataset.val)));
            else if (btn.dataset.scale != null) btn.addEventListener('click', () => this.devRawScale(key, comp, parseFloat(btn.dataset.scale)));
        });
        frag.appendChild(editor);
        return frag;
    }

    /** 写入某部位某通道的原始线性值（dev 原始编辑器入口）。首写自动进入 raw/自定义故障，base 与 HEX 不变。 */
    setDevRaw(key, comp, value) {
        let v = parseFloat(value);
        if (!Number.isFinite(v)) v = 0;
        const cnreId = colorKeyToCnreId(key);
        let ch = this.glitchChannels[cnreId];
        const base = key === 'eye' ? this.eyeColor : this.currentColors[key];
        if (!ch) {
            ch = { r: 0, g: 0, b: 0 };
            this.glitchBackup[key] = base || (key === 'eye' ? 'FFFFFF' : '000000');
            this.glitchMode[cnreId] = 'raw';
            this.glitchChannels[cnreId] = ch;
        }
        ch[comp] = xs(v);
        this.glitchDisplayColors[cnreId] = rawLinearToHex(ch);
        this.refreshChannelUI();
        this.updateSkinCode();
        this.undoRedo.saveState(this.snapshot());
        if (this.preview) this.preview.setGlitchModes(this.glitchMode, this.glitchDisplayColors);
    }
    /** 量级按钮：当前值整体缩放 mul（未故障则从基准 1 起，使 ×1eN 直接产出量级值） */
    devRawMagnitude(key, comp, mul) {
        const cnreId = colorKeyToCnreId(key);
        const cur = this.glitchChannels[cnreId] ? this.glitchChannels[cnreId][comp] : (mul !== 0 ? 1 : 0);
        this.setDevRaw(key, comp, cur * mul);
    }
    /** 符号翻转（未故障则种子为 1 后翻转 → −1） */
    devRawFlipSign(key, comp) {
        const cnreId = colorKeyToCnreId(key);
        const cur = this.glitchChannels[cnreId] ? this.glitchChannels[cnreId][comp] : 0;
        this.setDevRaw(key, comp, -cur);
    }
    /** 「再小 / 再大」：量级 ×scale（保留符号，未故障则种子为 1） */
    devRawScale(key, comp, scale) {
        const cnreId = colorKeyToCnreId(key);
        let cur = this.glitchChannels[cnreId] ? this.glitchChannels[cnreId][comp] : 0;
        if (cur === 0) cur = 1;
        this.setDevRaw(key, comp, cur * scale);
    }
    /** 同步 dev 原始编辑器字段（数字/滑块/读数）到当前 glitchChannels（输入框聚焦时不覆盖） */
    updateDevRawUI(key) {
        if (!this.cnreSkinDevUnlocked) return;
        const editor = document.querySelector(`#colorRow_${key} .dev-raw-editor`);
        if (!editor) return;
        const cnreId = colorKeyToCnreId(key);
        const ch = this.glitchChannels[cnreId];
        const vals = ch ? { r: ch.r, g: ch.g, b: ch.b } : { r: 0, g: 0, b: 0 };
        ['r', 'g', 'b'].forEach(comp => {
            const num = editor.querySelector(`.dev-raw-num[data-comp="${comp}"]`);
            if (num && document.activeElement !== num) num.value = fmtRaw(vals[comp]);
            const sl = editor.querySelector(`.dev-raw-slider[data-comp="${comp}"]`);
            if (sl) sl.value = rawToSlider(vals[comp]);
            const slval = editor.querySelector(`.dev-raw-slval[data-comp="${comp}"]`);
            if (slval) slval.textContent = fmtRaw(vals[comp]);
        });
    }

    /** 为某个颜色部位创建光滑度 / 金属度 / 自发光 三行（标题连点 5 次 / 设置「材质微调」开启后显示） */
    createMaterialTuningRows(key) {
        const frag = document.createDocumentFragment();
        const wrap = document.createElement('div');
        wrap.className = 'mt-channel-rows';
        wrap.dataset.part = key;
        const defaults = this.preview ? this.preview.getPartRoughMetalSettings() : { roughness: {}, metalness: {} };
        const emitDefaults = this.preview ? this.preview.getPartEmissionSettings() : { emission: {}, global: 1 };
        const rough = typeof defaults.roughness[key] === 'number' ? defaults.roughness[key] : 0.6;
        const metal = typeof defaults.metalness[key] === 'number' ? defaults.metalness[key] : 0.0;
        const smooth = 1 - rough;
        const emit = typeof emitDefaults.emission[key] === 'number' ? emitDefaults.emission[key] : 0;
        const makeRow = (kind, label, val) => {
            const row = document.createElement('div');
            row.className = 'mt-channel-row';
            row.dataset.kind = kind;
            row.dataset.part = key;
            row.innerHTML =
                `<span class="mt-channel-label">${label}</span>` +
                `<label><input type="range" min="0" max="1" step="0.01" value="${val.toFixed(2)}" data-part="${key}" data-kind="${kind}"></label>` +
                `<span class="mt-channel-val" id="mt_${kind}_val_${key}">${val.toFixed(2)}</span>`;
            return row;
        };
        wrap.appendChild(makeRow('smooth', '光滑', smooth));
        wrap.appendChild(makeRow('metal', '金属', metal));
        wrap.appendChild(makeRow('emit', '发光', emit));
        frag.appendChild(wrap);
        return frag;
    }

    /** 切换锁定态 */
    toggleLock(key) {
        if (this.isLocked(key)) this.lockedParts.delete(key);
        else this.lockedParts.add(key);
        this.updateChannelRowState(key);
        this.savePreferences();
    }

    /** 解除单个通道故障并恢复 base 颜色（所有进入故障的路径共用） */
    _turnOffGlitch(key) {
        const cnreId = colorKeyToCnreId(key);
        const bak = this.glitchBackup[key];
        if (key === 'eye') {
            this.eyeColor = bak || 'FFFFFF';
            this.updateEyeUI();
            if (this.preview) this.preview.setEyeColor(this.eyeColor);
        } else {
            // currentColors 在故障期间未被改动，这里仅作防御性还原
            this.currentColors[key] = bak || this.currentColors[key];
        }
        delete this.glitchChannels[cnreId];
        delete this.glitchBackup[key];
        delete this.glitchMode[cnreId];
        delete this.glitchDisplayColors[cnreId];
        this.refreshChannelUI();
        this.onColorsChanged();
        if (this.preview) this.preview.setGlitchModes(this.glitchMode, this.glitchDisplayColors);
        this.showToast(`已解除「${key}」故障，恢复 base 颜色`);
    }

    /** 切换故障态：mode ∈ 'neg' | 'pos' | 'fluor' | 'invfluor'；点击已激活的按钮则关闭。
     *  各模式为基础色算出的特定 raw 模式，切换模式即按新模式重算（始终保留 base 颜色）。 */
    toggleGlitch(key, mode) {
        const cnreId = colorKeyToCnreId(key);
        const active = this.isGlitched(key) ? this.classifyGlitch(this.glitchChannels[cnreId], key) : 'off';
        if (active === mode) {
            // 点击已激活的按钮 → 关闭：还原 base 颜色
            this._turnOffGlitch(key);
            return;
        }
        // 进入 / 切换故障模式：备份 base 并按模式重算 raw
        const cur = key === 'eye' ? this.eyeColor : this.currentColors[key];
        if (!this.glitchBackup[key]) this.glitchBackup[key] = cur || (key === 'eye' ? 'FFFFFF' : '000000');
        this.glitchChannels[cnreId] = this.computeGlitchChannelsForMode(key, mode);
        this.glitchMode[cnreId] = mode;
        // 各模式预览显示色（与游戏内一致）：neg→黑；pos→白；fluor/invfluor→高饱和（invfluor 取互补色相）。
        // 显示色只进 glitchDisplayColors，不改变 currentColors/eyeColor，HEX 输入框保持 base。
        const invertHex = (hex) => {
            const h = (hex || '000000').replace('#', '');
            if (h.length !== 6) return '#000000';
            const inv = [0, 2, 4].map(i => (255 - parseInt(h.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('').toUpperCase();
            return '#' + inv;
        };
        let displayHex = null;
        let ach = null;
        if (mode === 'neg') {
            displayHex = '#000000';
        } else if (mode === 'pos') {
            displayHex = '#FFFFFF';
        } else if (mode === 'fluor' || mode === 'invfluor') {
            ach = this._isAchromatic(cur);
            if (ach) {
                displayHex = ((ach === 'white') === (mode === 'fluor')) ? '#FFFFFF' : '#000000';
            } else {
                const sat = boostSaturationToHex(cur, 1);
                displayHex = (mode === 'invfluor') ? invertHex(sat) : sat;
            }
        }
        if (displayHex) this.glitchDisplayColors[cnreId] = displayHex;
        this.refreshChannelUI(); this.onColorsChanged();
        if (this.preview) this.preview.setGlitchModes(this.glitchMode, this.glitchDisplayColors);
        const hue = rawLinearToHex(this.glitchChannels[cnreId]);
        const tip = {
            neg: `反向故障（导出为负值 → 黑斑，预览保留 base 色 ${cur}）`,
            pos: `正向故障（导出为正值 → 白斑，仍带故障特效，预览保留 base 色 ${cur}）`,
            fluor: ach
                ? `荧光故障：近${ach === 'white' ? '白' : '黑'}颜色直接出${ach === 'white' ? '白' : '黑'}斑（预览已同步为 ${displayHex}）`
                : `荧光故障：自动匹配高饱和色 ${displayHex} → 故障色相 ${hue}（预览已同步为高饱和色）`,
            invfluor: ach
                ? `反色荧光故障：近${ach === 'white' ? '白' : '黑'}颜色直接出${ach === 'white' ? '黑' : '白'}斑（预览已同步为 ${displayHex}）`
                : `反色荧光故障：自动匹配高饱和色 ${displayHex} → 故障色相 ${hue}（预览已同步为高饱和色）`
        }[mode];
        this.showToast(`已对「${key}」应用${tip}`);
    }

    /** 判定某通道当前 raw 值对应的 UI 模式。
     *  优先与「上次应用的模式」的预期 raw 比较；如果偏离（例如手动改了某个分量的符号/量级），
     *  直接显示 custom（palette 徽标），避免 #FFFF00 改一个通道后仍被结构规则误判为原模式。
     *  没有记录模式时退回到纯结构判定。 */
    classifyGlitch(ch, key) {
        if (!ch) return 'off';
        const cnreId = colorKeyToCnreId(key);
        const stored = this.glitchMode[cnreId];
        if (stored && ['neg', 'pos', 'fluor', 'invfluor'].includes(stored)) {
            const expected = this.computeGlitchChannelsForMode(key, stored);
            const tol = 1e-3;
            const match = ['r', 'g', 'b'].every(c => Math.abs(ch[c] - expected[c]) < tol);
            if (match) return stored;
            // 偏离了存储模式：看是否恰好是另一种预设；若仍被结构规则判成原模式，强制显示 custom
            const generic = this._classifyGeneric(ch);
            return generic === stored ? 'custom' : generic;
        }
        return this._classifyGeneric(ch);
    }

    /** 纯结构判定（旧逻辑）：按正负/主导数量识别 neg/pos/fluor/invfluor/custom。 */
    _classifyGeneric(ch) {
        let posCount = 0, negCount = 0;
        ['r', 'g', 'b'].forEach(c => { if (ch[c] > 0) posCount++; else if (ch[c] < 0) negCount++; });
        const posDom = ['r', 'g', 'b'].filter(c => ch[c] > 1000).length;
        const negDom = ['r', 'g', 'b'].filter(c => ch[c] < -1000).length;
        if (posCount === 3) return 'pos';
        if (negCount === 3) return 'neg';
        // 荧光：正值恰好是主导正通道，其余为负
        if (posDom >= 1 && posCount === posDom && negCount === (3 - posDom)) return 'fluor';
        // 反色荧光：负值恰好是主导负通道，其余为正
        if (negDom >= 1 && negCount === negDom && posCount === (3 - negDom)) return 'invfluor';
        return 'custom';
    }

    /** 判断颜色是否「近白 / 近黑 / 灰」等低彩度，避免 fluor/invfluor 把这类颜色强制成突兀的纯色相。
     *  返回 'white'（偏白或浅灰，应出白斑）、'black'（偏黑或深灰，应出黑斑）或 null（彩色，走正常高饱和逻辑）。
     *  规则：灰（彩度极小）按明度分白/黑；非灰则看是否偏白（最暗通道也很亮）或偏黑（最亮通道也很暗）。 */
    _isAchromatic(hex) {
        const clean = String(hex == null ? '' : hex).replace('#', '').toUpperCase();
        if (!/^[0-9A-F]{6}$/.test(clean)) return null;
        const r = parseInt(clean.slice(0, 2), 16) / 255;
        const g = parseInt(clean.slice(2, 4), 16) / 255;
        const b = parseInt(clean.slice(4, 6), 16) / 255;
        const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
        const chroma = mx - mn;
        const L = (mx + mn) / 2;
        if (chroma < 0.06) return L >= 0.5 ? 'white' : 'black'; // 灰：按明度
        if (mn >= 0.80) return 'white';   // 偏白（如米色 #FFF2D6 → 不再变红）
        if (mx <= 0.20) return 'black';   // 偏黑（深灰 / 接近黑）
        return null;
    }

    /** 按模式从某部位当前 base 色算出故障 raw 通道值。
     *  neg/pos 用官方公式；fluor/invfluor 先自动匹配最接近的高饱和颜色（保留色相），
     *  再用「主导通道符号规则」决定各分量正负——保证任意饱和度都得到鲜艳荧光色相而非白/黑。
     *  例外：近白/近黑/灰等低彩度颜色不参与高饱和匹配（否则主导通道规会把次通道钳成 0，
     *  产生突兀纯色相，如米色 #FFF2D6 → 红），直接出白/黑斑（与 neg/pos 一致）。 */
    computeGlitchChannelsForMode(key, mode) {
        const cur = key === 'eye' ? this.eyeColor : this.currentColors[key];
        const hex = cur || (key === 'eye' ? 'FFFFFF' : '000000');
        if (mode === 'neg') return computeGlitchFromSrgbHex(hex, false);
        if (mode === 'pos') return computeGlitchFromSrgbHex(hex, true);
        // 近白/近黑/灰：直接出白/黑斑，不再套用高饱和匹配
        const ach = this._isAchromatic(hex);
        if (ach) {
            // fluor：近白→白斑(正) / 近黑→黑斑(负)；invfluor 取反
            const positive = ach === 'white' ? (mode === 'fluor') : (mode === 'invfluor');
            return computeGlitchFromSrgbHex(hex, positive);
        }
        // fluor / invfluor：先拉满饱和度，避免低饱和彩色三通道同号 → 变白
        const boosted = boostSaturationToHex(hex, 1);
        const base = computeGlitchFromSrgbHex(boosted, true); // 正向量级
        // 主导通道（线性最大，含并列）取 primary 符号，其余取 opposite 符号
        const primary = mode === 'fluor' ? 1 : -1;   // fluor：主导正、其余负
        const opposite = -primary;                    // invfluor：主导负、其余正
        const maxVal = Math.max(base.r, base.g, base.b);
        const eps = 1e-3;
        ['r', 'g', 'b'].forEach(c => {
            const isDominant = Math.abs(base[c] - maxVal) < eps;
            base[c] = xs((isDominant ? primary : opposite) * Math.abs(base[c]));
        });
        return base;
    }

    /** 单独翻转某故障分量的符号（负↔正），其余分量不动 */
    flipGlitchComponent(key, comp) {
        const cnreId = colorKeyToCnreId(key);
        const ch = this.glitchChannels[cnreId];
        if (!ch) return;
        ch[comp] = xs(-ch[comp]);
        this.refreshChannelUI();
        this.updateSkinCode();
        this.undoRedo.saveState(this.snapshot());
    }

    /** 一键荧光故障：自动匹配最近高饱和色后套用「主导正/其余负」规则 → 鲜艳荧光色（而非黑/白斑）。
     *  再次点击同一按钮则解除故障。 */
    applyFluorescentGlitch(key) {
        this.toggleGlitch(key, 'fluor');
    }

    /** 一键反色荧光故障：自动匹配最近高饱和色后套用「主导负/其余正」规则 → 鲜艳荧光反色（如青 → 荧光深红）。
     *  再次点击同一按钮则解除故障；预览同步为高饱和色相。 */
    applyInvertedFluorescentGlitch(key) {
        this.toggleGlitch(key, 'invfluor');
    }

    /** 故障态下，base 颜色（HEX）变化时实时同步 raw 值。
     *  fluor/invfluor 模式按新模式重新推导（含高饱和匹配 + 主导通道符号）；
     *  neg/pos/自定义 模式则保留各分量当前符号、按新 base 更新量级。 */
    syncGlitchRawFromBase(key) {
        const cnreId = colorKeyToCnreId(key);
        const ch = this.glitchChannels[cnreId];
        if (!ch) return;
        const mode = this.glitchMode[cnreId];
        if (mode === 'fluor' || mode === 'invfluor') {
            this.glitchChannels[cnreId] = this.computeGlitchChannelsForMode(key, mode);
            return;
        }
        const hex = key === 'eye' ? this.eyeColor : this.currentColors[key];
        const fresh = computeGlitchFromSrgbHex(hex, true); // 正向量级（正值）
        ['r', 'g', 'b'].forEach(comp => {
            const sign = ch[comp] < 0 ? -1 : 1;
            ch[comp] = xs(sign * Math.abs(fresh[comp]));
        });
    }

    /** 手动编辑故障通道的原始 R/G/B 数值。base 颜色与 raw 解耦，改 raw 不改显示色。 */
    onGlitchRawInput(key, comp, value) {
        const cnreId = colorKeyToCnreId(key);
        const ch = this.glitchChannels[cnreId];
        if (!ch) return;
        let v = parseFloat(value);
        if (!Number.isFinite(v)) v = 0;
        ch[comp] = xs(v);
        this.refreshChannelUI();
        this.updateSkinCode();
        this.undoRedo.saveState(this.snapshot());
    }

    /** 刷新单个通道行的锁定/故障视觉态与控件可用态 */
    updateChannelRowState(key) {
        if (!this._specialVisualState) this._specialVisualState = 'auto';
        const visualOverride = this._specialVisualState;
        const row = document.getElementById(`colorRow_${key}`);
        if (!row) return;
        const locked = this.isLocked(key);
        const glitched = this.isGlitched(key);
        const ch = glitched ? this.glitchChannels[colorKeyToCnreId(key)] : null;
        const isSpecialRow = key === 'special';
        const lockedOrGlitched = locked || glitched;

        row.classList.toggle('channel-locked', locked);
        row.classList.toggle('channel-glitched', glitched);

        const actual = glitched ? this.classifyGlitch(ch, key) : 'off';
        row.querySelector('.glitch-btn-neg')?.classList.toggle('active', actual === 'neg');
        row.querySelector('.glitch-btn-pos')?.classList.toggle('active', actual === 'pos');
        row.querySelector('.glitch-btn-fluor')?.classList.toggle('active', actual === 'fluor');
        row.querySelector('.glitch-btn-invfluor')?.classList.toggle('active', actual === 'invfluor');
        row.querySelector('.glitch-custom-badge')?.classList.toggle('show', actual === 'custom');
        row.querySelector('.glitch-cancel-btn')?.classList.toggle('show', glitched);

        // 只有锁定态禁用颜色编辑；故障态保留 base 颜色可自由编辑
        const swatch = row.querySelector('.draggable-swatch');
        const hexInput = row.querySelector('.hex-input');
        if (swatch) swatch.disabled = locked;
        if (hexInput) hexInput.disabled = locked;

        const raw = row.querySelector('.glitch-raw');
        if (raw) {
            raw.style.display = glitched ? 'flex' : 'none';
            if (glitched) raw.querySelectorAll('.glitch-raw-field').forEach(field => {
                const comp = field.querySelector('.glitch-raw-input').dataset.comp;
                field.querySelector('.glitch-raw-input').value = ch ? ch[comp] : 0;
                const signBtn = field.querySelector('.glitch-sign');
                if (signBtn) {
                    const isNeg = ch && ch[comp] < 0;
                    signBtn.innerHTML = isNeg
                        ? '<i class="icon ico-glitch-neg sz12"></i>'
                        : '<i class="icon ico-glitch-pos sz12"></i>';
                }
            });
        }
        this.updateDevRawUI(key);
    }

    createColorInputGroup(part, disabled = false, forceVisible = false) {
        const hexValue = this.currentColors[part.id] || part.defaultHex;
        // special 行：默认按图案自动显示/隐藏；forceVisible=true 强制显示（用户手动点击时使用）
        const effectivelyDisabled = forceVisible ? false : disabled;
        const group = document.createElement('div');
        group.className = effectivelyDisabled ? 'color-row disabled' : 'color-row';
        group.id = `colorRow_${part.id}`;
        group.style.cursor = effectivelyDisabled ? 'not-allowed' : 'default';
        if (part.id === 'special') {
            if (forceVisible) group.dataset.forced = 'true';
            else if (disabled) group.dataset.forced = 'false';
        }

        // 拆分中英文标签
        const parts = part.label.split(' ');
        const cnLabel = parts[0] || part.label;
        const enLabel = parts.slice(1).join(' ') || '';

        // ---- 主行：标签（含可点击锁块）+ 色块 + HEX ----
        const main = document.createElement('div'); main.className = 'color-row-main';
        const info = document.createElement('div'); info.className = 'color-info';
        const dot = this.createLockDot(part.id, part.maskColor); info.appendChild(dot);
        const name = document.createElement('span'); name.className = 'color-name';
        name.textContent = cnLabel;
        if (enLabel) { const en = document.createElement('span'); en.className = 'color-en'; en.textContent = enLabel; name.appendChild(en); }
        info.appendChild(name);
        main.appendChild(info);

        const controls = document.createElement('div'); controls.className = 'color-controls';
        const swatch = this.createDraggableSwatch(hexValue, part.id, part.label);
        const hexInput = document.createElement('input'); hexInput.type = 'text'; hexInput.className = 'hex-input'; hexInput.id = `hex_${part.id}`; hexInput.value = '#' + hexValue; hexInput.maxLength = 7;
        if (effectivelyDisabled) {
            swatch.disabled = true;
            swatch.style.cursor = 'not-allowed';
            hexInput.disabled = true;
        }
        controls.appendChild(swatch);
        controls.appendChild(hexInput);
        main.appendChild(controls);
        group.appendChild(main);

        if (effectivelyDisabled) return group;

        // 部位级重置 / 反色按钮放在下一行左侧，故障按钮放在同一行右侧
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'icon-btn part-reset-btn';
        resetBtn.title = '重置该部位为默认颜色';
        resetBtn.innerHTML = '<i class="icon ico-refresh sz14"></i>';
        resetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.resetPartToDefault(part.id); });
        const invertBtn = document.createElement('button');
        invertBtn.type = 'button';
        invertBtn.className = 'icon-btn part-invert-btn';
        invertBtn.title = '反色并应用该部位颜色';
        invertBtn.innerHTML = '<i class="icon ico-invert-color sz14"></i>';
        invertBtn.addEventListener('click', (e) => { e.stopPropagation(); this.invertAndApplyPart(part.id); });

        // ---- 操作行（reset/invert + 故障按钮） + raw R/G/B 行 ----
        group.appendChild(this.createGlitchRawRow(part.id, [resetBtn, invertBtn]));

        // ---- 材质微调：光滑度 / 金属度两行（嵌在该颜色部位下方）----
        if (MT_PART_IDS.includes(part.id)) group.appendChild(this.createMaterialTuningRows(part.id));

        this.makeDropTarget(group, part.id, part.label);
        let debounceTimer;
        const debouncedUpdate = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => this.onColorsChanged(), 100); };
        const onSwatchInput = (hex) => { hexInput.value = '#' + hex; this.handleColorChange(part.id, hex); };
        swatch.addEventListener('input', (e) => { const hex = normalizeHex(e.target.value); onSwatchInput(hex); swatch.setAttribute('data-color', hex); debouncedUpdate(); });
        swatch.addEventListener('change', (e) => { const hex = normalizeHex(e.target.value); onSwatchInput(hex); swatch.setAttribute('data-color', hex); clearTimeout(debounceTimer); this.onColorsChanged(); });
        hexInput.addEventListener('input', (e) => { e.target.value = formatHexInput(e.target.value); const val = normalizeHex(e.target.value); if (val.length === 6 && isValidColorHex(val)) { this.handleColorChange(part.id, val); swatch.value = '#' + val; swatch.setAttribute('data-color', val); debouncedUpdate(); } });
        return group;
    }

    /** 通用：用户通过 swatch/hex 修改某部位颜色。故障态下同步 raw 值（保留符号）并刷新显示。 */
    handleColorChange(key, hex) {
        this.currentColors[key] = hex;
        if (this.isGlitched(key)) {
            this.glitchBackup[key] = hex;
            this.syncGlitchRawFromBase(key);
            this.refreshChannelUI();
            this.updateSkinCode();
        }
    }

    /** 生成一个吸色（取色）按钮 (v0.5.9.25) */
    createEyedropBtn(key) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-btn eyedrop-btn';
        btn.setAttribute('aria-label', '取色');
        btn.innerHTML = '<i class="icon ico-colorize sz11"></i>';
        btn.title = '从预览画面或屏幕取色';
        btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.startEyedrop(key); });
        return btn;
    }

    /** 触发取色：优先系统 EyeDropper（可从任意屏幕位置含预览取色），否则进入预览点击取色模式 */
    startEyedrop(key) {
        if (typeof window !== 'undefined' && window.EyeDropper) {
            const ed = new window.EyeDropper();
            ed.open().then(res => {
                if (res && res.sRGBHex) this.applyEyedropColor(key, res.sRGBHex.replace('#', ''));
            }).catch(() => {});
            return;
        }
        if (this.preview && this.preview.beginEyedrop) {
            this.preview.onEyedrop = (k, hex) => this.applyEyedropColor(k, hex);
            this.preview.beginEyedrop(key);
            this.showToast('点击预览画面任意位置取色（右键或 Esc 取消）');
        } else {
            this.showToast('当前浏览器不支持取色，请用 Chrome / Edge');
        }
    }

    /** 把取到的颜色应用到指定通道（key='eye' 为眼部） */
    applyEyedropColor(key, hex) {
        hex = normalizeHex(hex);
        if (!isValidColorHex(hex)) return;
        if (key === 'eye') {
            if (this.isProtected('eye')) { this.showToast('眼部已锁定/故障，无法取色'); return; }
            this.eyeColor = hex;
            if (this.preview) this.preview.setEyeColor(hex);
        } else {
            if (this.isProtected(key)) { this.showToast(`「${key}」已锁定/故障，无法取色`); return; }
            this.handleColorChange(key, hex);
            if (this.preview) this.preview.updateColors(this.currentColors);
        }
        this.updateAllInputs();
        this.updateSkinCode();
        this.onColorsChanged();
        this.addToHistory(hex);
        this.showToast(`已从预览取色应用到 ${key === 'eye' ? '眼部' : key}`);
    }

    createEyeColorRow() {
        const grid = this.el.colorGrid;
        const group = document.createElement('div');
        group.className = 'color-row eye-row';
        group.id = 'colorRow_eye';

        // 主行：标签（含可点击锁块）+ 色块 + HEX
        const main = document.createElement('div'); main.className = 'color-row-main';
        const info = document.createElement('div'); info.className = 'color-info';
        const dot = this.createLockDot('eye', null); info.appendChild(dot);
        const name = document.createElement('span'); name.className = 'color-name';
        name.textContent = '眼部';
        const en = document.createElement('span'); en.className = 'color-en'; en.textContent = 'Eye'; name.appendChild(en);
        info.appendChild(name);
        main.appendChild(info);

        const controls = document.createElement('div'); controls.className = 'color-controls';
        // v0.5.8.20: 构建眼部 UI 前先自愈非法颜色
        if (!isValidColorHex(this.eyeColor)) {
            this.eyeColor = (DINOSAUR_DATA[this.currentDino] && DINOSAUR_DATA[this.currentDino].eyeColor) || 'FFFFFF';
        }
        const swatch = this.createDraggableSwatch(this.eyeColor, 'eye', '眼部');
        controls.appendChild(swatch);

        const hexInput = document.createElement('input');
        hexInput.type = 'text'; hexInput.className = 'hex-input'; hexInput.id = 'hex_eye';
        hexInput.value = '#' + this.eyeColor; hexInput.maxLength = 7;
        hexInput.addEventListener('input', (e) => {
            e.target.value = formatHexInput(e.target.value);
            const val = normalizeHex(e.target.value);
            if (val.length === 6 && isValidColorHex(val)) { this.handleEyeColorChange(val); swatch.value = '#' + val; swatch.setAttribute('data-color', val); }
        });
        hexInput.addEventListener('change', () => this.savePreferences());
        controls.appendChild(hexInput);
        main.appendChild(controls);
        group.appendChild(main);

        // 部位级重置 / 反色按钮放在下一行左侧，故障按钮放在同一行右侧
        const eyeResetBtn = document.createElement('button');
        eyeResetBtn.type = 'button';
        eyeResetBtn.className = 'icon-btn part-reset-btn';
        eyeResetBtn.title = '重置眼球为默认色';
        eyeResetBtn.innerHTML = '<i class="icon ico-refresh sz14"></i>';
        eyeResetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.resetPartToDefault('eye'); });
        const eyeInvertBtn = document.createElement('button');
        eyeInvertBtn.type = 'button';
        eyeInvertBtn.className = 'icon-btn part-invert-btn';
        eyeInvertBtn.title = '反色并应用眼球颜色';
        eyeInvertBtn.innerHTML = '<i class="icon ico-invert-color sz14"></i>';
        eyeInvertBtn.addEventListener('click', (e) => { e.stopPropagation(); this.invertAndApplyPart('eye'); });

        // 操作行 + raw R/G/B 行
        group.appendChild(this.createGlitchRawRow('eye', [eyeResetBtn, eyeInvertBtn]));

        swatch.addEventListener('input', (e) => { const hex = normalizeHex(e.target.value); hexInput.value = '#' + hex; swatch.setAttribute('data-color', hex); this.handleEyeColorChange(hex); this.savePreferences(); });

        this.makeDropTarget(group, 'eye', '眼部');
        grid.appendChild(group);
    }

    /** 通用：用户修改眼部颜色。故障态下同步 raw 值（保留符号）并刷新显示。 */
    handleEyeColorChange(hex) {
        this.eyeColor = hex;
        if (this.preview) this.preview.setEyeColor(hex);
        if (this.isGlitched('eye')) {
            this.glitchBackup['eye'] = hex;
            this.syncGlitchRawFromBase('eye');
            this.refreshChannelUI();
            this.updateSkinCode();
        }
    }

    updateEyeUI() {
        // v0.5.8.20: 眼部颜色自愈 — 历史上可能被非法值(如 'NANNANNAN')污染，发现即重置为当前恐龙默认眼色
        if (!isValidColorHex(this.eyeColor)) {
            this.eyeColor = (DINOSAUR_DATA[this.currentDino] && DINOSAUR_DATA[this.currentDino].eyeColor) || 'FFFFFF';
        }
        const swatch = document.querySelector('#colorRow_eye .draggable-swatch');
        const hexInput = document.getElementById('hex_eye');
        if (swatch) { swatch.value = '#' + this.eyeColor; swatch.setAttribute('data-color', this.eyeColor); }
        if (hexInput) hexInput.value = '#' + this.eyeColor;
    }

    createSolidColorUI() {
        const container = document.getElementById('solidColorRow'); if (!container) return; container.innerHTML = '';
        const group = document.createElement('div');
        group.className = 'color-row solid-row';
        group.id = 'colorRow_solid';

        const info = document.createElement('div'); info.className = 'color-info';
        const dot = document.createElement('span'); dot.className = 'color-dot'; info.appendChild(dot);
        const name = document.createElement('span'); name.className = 'color-name';
        name.textContent = '纯色';
        const en = document.createElement('span'); en.className = 'color-en'; en.textContent = 'Solid'; name.appendChild(en);
        info.appendChild(name);
        group.appendChild(info);

        const controls = document.createElement('div'); controls.className = 'color-controls';
        const swatch = document.createElement('input');
        swatch.type = 'color'; swatch.value = '#FFFFFF'; swatch.className = 'draggable-swatch';
        swatch.setAttribute('draggable', 'true'); swatch.setAttribute('data-color', 'FFFFFF');
        swatch.setAttribute('data-part', 'solid'); swatch.setAttribute('data-label', '纯色');
        swatch.addEventListener('dragstart', (e) => { const hex = swatch.getAttribute('data-color'); e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'color', hex: hex, part: 'solid', label: '纯色' })); e.dataTransfer.effectAllowed = 'copy'; const preview = document.getElementById('drag-preview'); if (preview) { preview.style.backgroundColor = '#' + hex; preview.style.display = 'block'; e.dataTransfer.setDragImage(preview, 12, 12); } });
        swatch.addEventListener('dragend', () => { document.getElementById('drag-preview').style.display = 'none'; });
        controls.appendChild(swatch);

        const hexInput = document.createElement('input');
        hexInput.type = 'text'; hexInput.className = 'hex-input'; hexInput.id = 'solidColorHex';
        hexInput.value = '#FFFFFF'; hexInput.maxLength = 7;
        hexInput.addEventListener('input', (e) => { e.target.value = formatHexInput(e.target.value); const val = normalizeHex(e.target.value); if (val.length === 6 && isValidColorHex(val)) { swatch.value = '#' + val; swatch.setAttribute('data-color', val); } });
        controls.appendChild(hexInput);

        const applyBtn = document.createElement('button');
        applyBtn.className = 'btn btn-sm'; applyBtn.textContent = '应用'; applyBtn.style.flexShrink = '0';
        applyBtn.addEventListener('click', () => { const val = normalizeHex(hexInput.value); if (isValidColorHex(val)) this.applySolidColor('#' + val); });
        controls.appendChild(applyBtn);
        group.appendChild(controls);

        swatch.addEventListener('input', (e) => { const hex = normalizeHex(e.target.value); hexInput.value = '#' + hex; swatch.setAttribute('data-color', hex); });

        this.makeDropTarget(group, 'solid', '纯色');
        container.appendChild(group);
    }

    createUndoRedoUI() {
        const container = document.getElementById('undoRedoRow'); if (!container) return;
        const toggleBtn = document.getElementById('uiToggleBtn');
        container.innerHTML = '';
        const undoBtn = document.createElement('button'); undoBtn.className = 'btn btn-sm'; undoBtn.id = 'undoBtn'; undoBtn.title = '撤销 (Ctrl+Z)'; undoBtn.innerHTML = '<i class="icon ico-undo sz12" style="vertical-align:middle; margin-right:3px;"></i>撤销'; undoBtn.addEventListener('click', () => this.performUndo());
        const redoBtn = document.createElement('button'); redoBtn.className = 'btn btn-sm'; redoBtn.id = 'redoBtn'; redoBtn.title = '重做 (Ctrl+Y)'; redoBtn.innerHTML = '<i class="icon ico-redo sz12" style="vertical-align:middle; margin-right:3px;"></i>重做'; redoBtn.addEventListener('click', () => this.performRedo());
        container.appendChild(undoBtn); container.appendChild(redoBtn);
        if (toggleBtn) container.appendChild(toggleBtn);
    }

    createGradientUI() {
        this.bindPaletteColorInput('gradColor1', 'gradHex1', '渐变颜色1');
        this.bindPaletteColorInput('gradColor2', 'gradHex2', '渐变颜色2');
        this.bindPaletteColorInput('advancedBaseColor', 'advancedBaseHex', '高级调色板基色');
    }

    bindPaletteColorInput(colorInputId, hexInputId, label) {
        const colorInput = document.getElementById(colorInputId);
        const hexInput = document.getElementById(hexInputId);
        if (!colorInput || !hexInput) return;
        const syncFromHex = () => {
            hexInput.value = formatHexInput(hexInput.value);
            const hex = normalizeHex(hexInput.value);
            if (isValidColorHex(hex)) colorInput.value = '#' + hex;
        };
        const syncFromColor = () => {
            const hex = normalizeHex(colorInput.value);
            hexInput.value = '#' + hex;
        };
        const normalizeHexDisplay = () => {
            const hex = normalizeHex(hexInput.value);
            if (hex.length === 3 || hex.length === 4) {
                hexInput.value = expandShorthandHex('#' + hex);
            } else if (hex.length > 0 && hex.length < 6) {
                hexInput.value = '#' + hex.padEnd(6, '0');
            } else if (hex.length === 6) {
                hexInput.value = '#' + hex;
            }
        };
        hexInput.addEventListener('input', syncFromHex);
        hexInput.addEventListener('blur', normalizeHexDisplay);
        colorInput.addEventListener('input', syncFromColor);

        colorInput.setAttribute('draggable', 'true');
        colorInput.addEventListener('dragstart', (e) => {
            const hex = normalizeHex(colorInput.value);
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'color', hex: hex, part: null, label: label }));
            e.dataTransfer.effectAllowed = 'copy';
            colorInput.classList.add('dragging');
            const preview = document.getElementById('drag-preview');
            if (preview) { preview.style.backgroundColor = '#' + hex; preview.style.display = 'block'; e.dataTransfer.setDragImage(preview, 12, 12); }
        });
        colorInput.addEventListener('dragend', () => { colorInput.classList.remove('dragging'); document.getElementById('drag-preview').style.display = 'none'; });

        const parent = colorInput.parentElement;
        colorInput.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; parent?.classList.add('drag-target'); });
        colorInput.addEventListener('dragleave', () => { parent?.classList.remove('drag-target'); });
        colorInput.addEventListener('drop', (e) => {
            e.preventDefault(); parent?.classList.remove('drag-target');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'color' && data.hex) { colorInput.value = '#' + data.hex; hexInput.value = '#' + data.hex; this.showToast(`已应用颜色到 ${label}`); }
            } catch (err) { console.warn('拖拽解析失败', err); }
        });
    }

    resetGradientUI() {
        const defaults = { gradHex1: '#000000', gradHex2: '#FFFFFF', gradSteps: '5' };
        for (const [id, val] of Object.entries(defaults)) {
            const el = document.getElementById(id);
            if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
        }
        const results = this.el.twoColorGradientResults;
        if (results) results.innerHTML = '';
        const advResults = document.getElementById('advancedPaletteResults');
        if (advResults) advResults.innerHTML = '';
    }

    /** 获取当前恐龙 + 当前皮肤 (currentPattern) 的官方默认配色。
     *  查找顺序: patternMeta['4']['6'...] 专属配色1 → shared[0] → DINOSAUR_DATA 默认
     *  返回 { colors, eyeColor } */
    getCurrentSkinDefault() {
        const data = DINOSAUR_DATA[this.currentDino];
        if (!data) return null;
        // currentPattern 形如 'Pattern_4' 或 'Pattern_Juvenile'，抽取 key 供官方数据查找
        let patternKey = (this.currentPattern || 'Pattern_1').replace(/^Pattern_/, '');
        // patternMeta.sameAs：某图案纹理与目标图案一致，默认配色也跟随目标图案
        const sameAs = data.patternMeta?.[patternKey]?.sameAs;
        if (sameAs) patternKey = String(sameAs).replace(/^Pattern_/, '');
        const official = OFFICIAL_SCHEMES[this.currentDino];
        const eyeColor = data.eyeColor || 'FFFFFF';
        if (official) {
            const fromPattern = (official.patterns || {})[patternKey]?.[0];
            if (fromPattern) return { colors: { ...fromPattern.colors }, eyeColor };
            if (official.shared && official.shared[0]) return { colors: { ...official.shared[0].colors }, eyeColor };
        }
        return { colors: { ...data.colors }, eyeColor };
    }

    /** 重置为「当前皮肤」的官方默认配色（不是恐龙统一默认）。
     *  例如三角龙 6皮 → 应用 配色5（含 Special）；三角龙 4皮 → 应用 配色3（含 Special）。 */
    resetToCurrentSkinDefault() {
        const def = this.getCurrentSkinDefault();
        if (!def) return;
        this.applyPresetColors(def.colors, { eyeColor: def.eyeColor });
        this.resetGradientUI();
        this.savePreferences();
        this.showToast('已重置为当前皮肤默认配色');
    }

    buildColorInputs() {
        // 按当前皮肤设置 hasSpecial (覆盖恐龙级), 修复无 special 皮肤的怪色块
        this.currentDinoHasSpecial = getPatternHasSpecial(this.currentDino, this.currentPattern);
        // 是否有任何通道是故障态（决定是否给 special 行加 unlock 图标）
        const anyGlitch = Object.keys(this.glitchChannels || {}).length > 0;
        const grid = this.el.colorGrid; grid.innerHTML = '';
        this.populateInvertParts();
        // 特殊区域专用色块 (已含 hasSpecial 套用设置 + 手动编辑入口)
        const specialPart = COLOR_PARTS.find(p => p.id === 'special');
        const showSpecialRow = this.currentDinoHasSpecial || this._specialForced;
        const gridItems = [...COLOR_PARTS];
        // 重排：special 行插在 underbelly 后（更符合视觉分区）
        if (showSpecialRow) {
            const specialIdx = gridItems.findIndex(p => p.id === 'special');
            const ubIdx = gridItems.findIndex(p => p.id === 'underbelly');
            if (specialIdx > -1 && ubIdx > -1) {
                const [sp] = gridItems.splice(specialIdx, 1);
                gridItems.splice(ubIdx + 1, 0, sp);
            }
        }
        gridItems.forEach(part => {
            if (part.id === 'special') {
                // special 行：默认图案无 special 时隐藏为占位条; 用户点击「解锁」后变为可编辑行
                if (!showSpecialRow) {
                    grid.appendChild(this.createSpecialPlaceholderRow());
                    return;
                }
            }
            const isDisabled = part.id === 'special' && !this.currentDinoHasSpecial && !this._specialForced;
            const inputGroup = this.createColorInputGroup(part, isDisabled, this._specialForced); grid.appendChild(inputGroup);
        });
        this.createEyeColorRow(); this.createSolidColorUI(); this.createUndoRedoUI(); this.createGradientUI();
        this.refreshChannelUI();
        this.applyMaterialTuningVisibility();
    }

    /** 在没有 hasSpecial 的皮肤下显示的特殊区域占位行 (v0.5.9.22)
     *  保留颜色块和 HEX 输入框但压暗禁用，点击整行即可解锁编辑 */
    createSpecialPlaceholderRow() {
        const part = COLOR_PARTS.find(p => p.id === 'special');
        const hexValue = this.currentColors.special || part.defaultHex;
        const group = document.createElement('div');
        group.className = 'color-row special-placeholder';
        group.id = `colorRow_special`;
        group.title = '当前皮肤的纹理蒙版没有 Special 区域，但允许你手动添加并编辑；点击整行解锁';
        const main = document.createElement('div'); main.className = 'color-row-main';
        const info = document.createElement('div'); info.className = 'color-info';
        const dot = this.createLockDot('special', '#FFFF00'); info.appendChild(dot);
        const name = document.createElement('span'); name.className = 'color-name';
        name.textContent = '特殊区域';
        const en = document.createElement('span'); en.className = 'color-en'; en.textContent = 'Special'; name.appendChild(en);
        info.appendChild(name);
        main.appendChild(info);

        const controls = document.createElement('div'); controls.className = 'color-controls';
        const swatch = this.createDraggableSwatch(hexValue, 'special', '特殊区域');
        const hexInput = document.createElement('input'); hexInput.type = 'text'; hexInput.className = 'hex-input'; hexInput.id = `hex_special`; hexInput.value = '#' + hexValue; hexInput.maxLength = 7;
        swatch.disabled = true; swatch.style.cursor = 'not-allowed';
        hexInput.disabled = true; hexInput.style.cursor = 'not-allowed';
        controls.appendChild(swatch); controls.appendChild(hexInput);
        main.appendChild(controls);
        group.appendChild(main);

        // Special 占位行仍保留重置 / 反色 / 故障按钮，视觉对齐，不随锁定隐藏
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'icon-btn part-reset-btn';
        resetBtn.title = '解锁并重置特殊区域为默认颜色';
        resetBtn.innerHTML = '<i class="icon ico-refresh sz14"></i>';
        resetBtn.addEventListener('click', (e) => { e.stopPropagation(); this._specialForced = true; this.resetPartToDefault('special'); this.buildColorInputs(); });
        const invertBtn = document.createElement('button');
        invertBtn.type = 'button';
        invertBtn.className = 'icon-btn part-invert-btn';
        invertBtn.title = '解锁并反色特殊区域';
        invertBtn.innerHTML = '<i class="icon ico-invert-color sz14"></i>';
        invertBtn.addEventListener('click', (e) => { e.stopPropagation(); this._specialForced = true; this.invertAndApplyPart('special'); this.buildColorInputs(); });
        group.appendChild(this.createGlitchRawRow('special', [resetBtn, invertBtn]));

        group.addEventListener('click', (e) => {
            if (e.target.closest('.lock-dot')) return;
            if (e.target.closest('.glitch-btn') || e.target.closest('.glitch-raw') || e.target.closest('.part-reset-btn') || e.target.closest('.part-invert-btn')) return;
            this._specialForced = true;
            this.buildColorInputs();
            this.showToast('已解锁特殊区域，可自由编辑；重置皮肤后会回到自动隐藏');
        });
        return group;
    }

    // 按当前皮肤刷新 hasSpecial (优先 patternMeta, 否则恐龙级)
    refreshSpecialState() {
        this.currentDinoHasSpecial = getPatternHasSpecial(this.currentDino, this.currentPattern);
    }

    // 渲染官方配色下拉 (v0.5.9.16)：优先 OFFICIAL_SCHEMES（MD 逆向整理的官方配色）
    //   shared    → 分组「通用配色（图案 1/2/3）」，套用时不切图案；配色1（默认）= 恐龙默认
    //   patterns  → 分组「图案专属配色」，套用时切到对应图案
    //   archived  → 分组「旧版归档」（旧配色N），排最后，仅可手动选中，永不作为默认
    // 未配置 OFFICIAL_SCHEMES 的恐龙 → 回退旧 patternMeta 跨图案摊平逻辑
    renderOfficialSchemeSelect() {
        const sel = this.el.officialSchemeSelect;
        const section = document.getElementById('officialSchemeSection');
        if (!sel || !section) return;
        const dino = DINOSAUR_DATA[this.currentDino];
        const flat = [];
        const official = OFFICIAL_SCHEMES[this.currentDino];
        const editorPatterns = dino?.patterns || [];
        if (official) {
            (official.shared || []).forEach(s => flat.push({ scheme: s, patternId: null, archived: false }));
            Object.keys(official.patterns || {}).sort((a, b) => Number(a) - Number(b)).forEach(pid => {
                (official.patterns[pid] || []).forEach(s => flat.push({ scheme: s, patternId: pid, archived: false }));
            });
            (official.archived || []).forEach(s => flat.push({ scheme: s, patternId: null, archived: true }));
        } else if (dino && dino.patternMeta) {
            // 旧 patternMeta 兼容分支（当前无恐龙使用，保留以防万一）
            for (const pid of (dino.patterns || [])) {
                const schemes = dino.patternMeta[pid]?.schemes;
                if (schemes && schemes.length) schemes.forEach(s => flat.push({ scheme: s, patternId: pid, archived: false }));
            }
        }
        this._officialSchemesFlat = flat;
        const prevVal = sel.value; // 保留已选序号 (顺序稳定, 不随当前图案变化而跳回)
        if (!flat.length) { section.style.display = 'none'; sel.innerHTML = ''; return; }
        section.style.display = '';
        sel.innerHTML = '';
        let group = null, groupKey = '';
        const openGroup = (label) => { group = document.createElement('optgroup'); group.label = label; sel.appendChild(group); };
        let sharedIdx = 0;
        flat.forEach((entry, i) => {
            const gk = entry.archived ? 'archived' : (entry.patternId ? 'pattern' : 'shared');
            if (gk !== groupKey) {
                groupKey = gk;
                if (gk === 'shared') openGroup('通用配色（图案 1/2/3）');
                else if (gk === 'pattern') openGroup('图案专属配色');
                else openGroup('旧版归档');
            }
            const opt = document.createElement('option');
            opt.value = String(i);
            if (entry.archived) {
                opt.textContent = entry.scheme.name; // 旧配色1 / 旧配色2 ...
                opt.title = '旧版默认配色（已归档），仅可手动套用';
            } else if (entry.patternId) {
                const hasTex = editorPatterns.includes(entry.patternId);
                opt.textContent = `${entry.scheme.name} · 图案${entry.patternId}` + (hasTex ? '' : '（贴图未导入）');
                opt.title = hasTex
                    ? `图案 ${entry.patternId} 专属配色（套用时自动切换图案）`
                    : `图案 ${entry.patternId} 贴图尚未导入：仅应用配色，图案保持当前`;
            } else {
                opt.textContent = sharedIdx === 0 ? `${entry.scheme.name}（默认）` : entry.scheme.name;
                opt.title = '适配图案 1/2/3 的通用配色（不切换图案）';
            }
            sharedIdx = gk === 'shared' ? sharedIdx + 1 : sharedIdx;
            (group || sel).appendChild(opt);
        });
        if (prevVal && sel.querySelector(`option[value="${prevVal}"]`)) sel.value = prevVal;
    }

    updateGenderUI() {
        const maleBtn = this.el.genderMaleBtn; const femaleBtn = this.el.genderFemaleBtn;
        if (maleBtn && femaleBtn) { maleBtn.classList.toggle('active', !this.isFemale); femaleBtn.classList.toggle('active', this.isFemale); }
        if (this.preview) this.preview.setGender(this.isFemale);
                this.savePreferences();
    }

    onColorsChanged() {
        COLOR_PARTS.forEach(p => this.addToHistory(this.currentColors[p.id]));
        this.updateSkinCode(); this.undoRedo.saveState(this.snapshot());
        if (this.preview) this.preview.updateColors(this.currentColors);
    }

    // -----------------------------------------------------------------------
    // 状态快照 / 撤销重做 (v0.5.9.11)
    // 快照必须含故障通道的负值——否则撤销只能恢复颜色，故障值会静默丢失
    // -----------------------------------------------------------------------

    /** 当前配色状态的完整快照（颜色 + 眼色 + 故障通道原始值） */
    snapshot() {
        return {
            colors: { ...this.currentColors },
            eyeColor: this.eyeColor,
            glitchChannels: JSON.parse(JSON.stringify(this.glitchChannels || {})),
            glitchMode: JSON.parse(JSON.stringify(this.glitchMode || {})),
            glitchDisplayColors: JSON.parse(JSON.stringify(this.glitchDisplayColors || {}))
        };
    }

    /** 应用快照并刷新所有相关 UI（含故障态行） */
    applySnapshot(state) {
        if (!state) return;
        this.currentColors = { ...(state.colors || {}) };
        if (state.eyeColor) this.eyeColor = state.eyeColor;
        this.glitchChannels = state.glitchChannels ? JSON.parse(JSON.stringify(state.glitchChannels)) : {};
        this.glitchMode = state.glitchMode ? JSON.parse(JSON.stringify(state.glitchMode)) : {};
        this.glitchDisplayColors = state.glitchDisplayColors ? JSON.parse(JSON.stringify(state.glitchDisplayColors)) : {};
        this.refreshChannelUI();
        this.updateSkinCode();
        if (this.preview) {
            this.preview.updateColors(this.currentColors);
            this.preview.setEyeColor(this.eyeColor);
            this.preview.setGlitchModes(this.glitchMode, this.glitchDisplayColors);
        }
    }

    performUndo() {
        const state = this.undoRedo.undo();
        if (!state) return;
        this.applySnapshot(state);
        this.updateUndoRedoButtons();
    }

    performRedo() {
        const state = this.undoRedo.redo();
        if (!state) return;
        this.applySnapshot(state);
        this.updateUndoRedoButtons();
    }

    /** 刷新撤销/重做按钮可用态 */
    updateUndoRedoButtons() {
        const u = document.getElementById('undoBtn'); if (u) u.disabled = !this.undoRedo.canUndo();
        const r = document.getElementById('redoBtn'); if (r) r.disabled = !this.undoRedo.canRedo();
    }

    /** 刷新所有通道行的故障态/锁定态显示（不含重建 DOM） */
    refreshChannelUI() {
        this.updateAllInputs();
        this.updateEyeUI();
        COLOR_PARTS.forEach(p => this.updateChannelRowState(p.id));
        this.updateChannelRowState('eye');
    }

    updateAllInputs() {
        COLOR_PARTS.forEach(part => {
            const hex = this.currentColors[part.id];
            const hexInput = document.getElementById(`hex_${part.id}`);
            const swatch = document.querySelector(`#colorRow_${part.id} .draggable-swatch`);
            if (hexInput) hexInput.value = '#' + hex;
            if (swatch) { swatch.value = '#' + hex; swatch.setAttribute('data-color', hex); }
        });
    }

    updateVarDisplay() {
        if (this.el.varValue) this.el.varValue.textContent = (typeof this.currentVar === 'number' ? this.currentVar : 0.5).toFixed(3);
    }

    updateAgeStageLabel(value) {
        if (!this.el.ageStageLabel) return;
        const v = Math.round(value);
        if (v <= 15) this.el.ageStageLabel.textContent = '刚孵化';
        else if (v <= 40) this.el.ageStageLabel.textContent = '幼年';
        else if (v <= 60) this.el.ageStageLabel.textContent = '亚成年';
        else if (v <= 85) this.el.ageStageLabel.textContent = '成年';
        else this.el.ageStageLabel.textContent = '长老';
    }

    syncVarFromScale() {
        this.currentVar = { 'fine': 0.0, 'medium': 0.5, 'coarse': 1.0 }[this.currentPatternScale] ?? 0.5;
        if (this.el.varSlider) this.el.varSlider.value = this.currentVar;
        this.updateVarDisplay();
    }

    updateSkinCode() {
        const code = generateSkinCode(this.currentDino, this.currentColors, this.currentPattern, this.currentPatternScale);
        if (this.el.skinCodeDisplay) this.el.skinCodeDisplay.textContent = code;
        // CNRE S1 短码: 导出前 sRGB→线性 (游戏服务器按线性读取)，不再做旧格式 100 档量化 / 模式位
        const cnreCode = encodeCNRE({
            isFemale: this.isFemale,
            pattern: this.currentPattern,
            colors: this.currentColors,
            eyeColor: this.eyeColor,
            skinVariation: this.skinVariation,
            glitchChannels: this.glitchChannels
        });
        if (this.el.cnreCodeDisplay) this.el.cnreCodeDisplay.textContent = cnreCode;
        // Nyor's Overlay 码
        const nyorCode = encodeNyorOverlay({
            isFemale: this.isFemale,
            pattern: this.currentPattern,
            patternCode: getPatternCode(this.currentDino, this.currentPattern),
            varValue: this.currentVar,
            patternScale: this.currentPatternScale,
            colors: this.currentColors,
            eyeColor: this.eyeColor
        });
        if (this.el.nyorCodeDisplay) this.el.nyorCodeDisplay.textContent = nyorCode;
        // 工具专属皮肤码（不记录恐龙，导入不切换恐龙；含各部位基础色 + 故障 + 纹理粗细）
        const toolCode = encodeToolSkin({
            pattern: this.currentPattern,
            patternScale: this.currentPatternScale,
            varValue: this.currentVar,
            colors: this.currentColors,
            glitchChannels: this.glitchChannels,
            glitchMode: this.glitchMode,
            glitchBackup: this.glitchBackup,
            emission: this.preview ? { global: this.preview.globalEmission, parts: this.preview.partEmission } : null
        });
        if (this.el.toolCodeDisplay) this.el.toolCodeDisplay.textContent = toolCode;
        this.updateGlitchBadge();
    }

    /**
     * 生成故障皮肤：基于当前配色，把通道打成越界值（游戏内出故障特效）。
     * @param {string} mode 'neg'(负/黑斑) | 'pos'(正/白斑) | 'fluor'(荧光保留色相) | 'invfluor'(反色荧光)
     * @param {string} target 'random'(随机 5 个通道) | 'all'(所有区域)
     */
    generateGlitch(mode = 'neg', target = 'random') {
        // 1) 保留锁定部位的旧故障数据（清除后恢复），避免快速编辑动到已锁部位
        const lockedGlitch = {}, lockedBackup = {}, lockedMode = {};
        for (const id of Object.keys(this.glitchChannels || {})) {
            const key = cnreIdToColorKey(id);
            if (this.isLocked(key)) {
                lockedGlitch[id] = this.glitchChannels[id];
                lockedBackup[key] = this.glitchBackup[key];
                lockedMode[id] = this.glitchMode[id];
            }
        }
        // 清除上一轮故障通道与备份（base 颜色已保留，无需恢复）
        this.glitchChannels = {};
        this.glitchBackup = {};
        this.glitchMode = {};
        // 2) 决定故障通道列表（10 个含 eyes），跳过锁定部位
        let order = Object.keys(this.currentColors).concat('eye')
            .map(key => colorKeyToCnreId(key))
            .filter((v, i, a) => a.indexOf(v) === i); // 去重
        order = order.filter(id => !this.isLocked(cnreIdToColorKey(id)));
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        const glitchIds = target === 'all' ? order : order.slice(0, Math.min(5, order.length));
        // 3) 为每个选中通道备份 base 颜色并写入故障 raw
        let syncedPreview = false;
        for (const id of glitchIds) {
            const key = cnreIdToColorKey(id);
            const cur = key === 'eye' ? this.eyeColor : this.currentColors[key];
            this.glitchBackup[key] = cur || (key === 'eye' ? 'FFFFFF' : '000000');
            this.glitchChannels[id] = this.computeGlitchChannelsForMode(key, mode);
            this.glitchMode[id] = mode;
            // fluor / invfluor：预览同步（近白/近黑/灰 → 白/黑斑；彩色 → 高饱和色）
            if (mode === 'fluor' || mode === 'invfluor') {
                const ach = this._isAchromatic(cur);
                const displayHex = ach
                    ? (((ach === 'white') === (mode === 'fluor')) ? '#FFFFFF' : '#000000')
                    : boostSaturationToHex(cur, 1);
                if (key === 'eye') { this.eyeColor = displayHex; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor); }
                else { this.currentColors[key] = displayHex; }
                syncedPreview = true;
            }
        }
        // 4) 恢复锁定部位的故障数据
        Object.assign(this.glitchChannels, lockedGlitch);
        Object.assign(this.glitchBackup, lockedBackup);
        Object.assign(this.glitchMode, lockedMode);
        const n = Object.keys(this.glitchChannels).length;
        this.refreshChannelUI();
        this.onColorsChanged(); // updateSkinCode + undoRedo + preview.updateColors（不重载模型）
        const label = { neg: '负值（黑斑）', pos: '正值（白斑）', fluor: '荧光（保留色相）', invfluor: '反色荧光（互补色相）' }[mode] || mode;
        const hasLocked = Object.keys(lockedGlitch).length > 0;
        const scope = target === 'all' ? '所有区域' : `随机 ${glitchIds.length} 个通道`;
        const tail = (mode === 'fluor' || mode === 'invfluor')
            ? ' — 预览已同步为高饱和色相'
            : ' — base 颜色保留，故障特效仅在游戏内显示';
        const lockTip = hasLocked ? '（锁定部位已跳过）' : '';
        this.showToast(`已生成${scope}故障：${label}${lockTip}${tail}`);
    }

    /** 故障皮徽标：显示/隐藏「含故障通道」提示 */
    updateGlitchBadge() {
        const el = document.getElementById('cnreGlitchBadge');
        if (!el) return;
        const n = Object.keys(this.glitchChannels || {}).length;
        if (n > 0) {
            el.style.display = 'block'; // CSS 默认 display:none，此处显式覆盖
            el.innerHTML = `<i class="icon ico-glitch sz12"></i> 含故障通道 (${n})：base 颜色保留，越界 raw 仅在导出/游戏内生效；各分量正负决定故障色相——同号→黑/白斑，异号→鲜艳荧光色（如荧光红/青）`;
        } else {
            el.style.display = 'none';
        }
    }

    /** 根据 base 色与故障模式计算各故障通道的「预览显示色」：
     *  neg(反向)→黑；pos(正向)→白+自发光；fluor(荧光)→高饱和色+自发光；invfluor(反色)→互补高饱和色+自发光。
     *  显示色仅存入 glitchDisplayColors 传给 preview，绝不污染 currentColors / eyeColor（HEX 输入框保持 base）。 */
    _applyGlitchDisplayColors() {
        const invertHex = (hex) => {
            const h = (hex || '000000').replace('#', '');
            if (h.length !== 6) return '#000000';
            const inv = [0, 2, 4].map(i => (255 - parseInt(h.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('').toUpperCase();
            return '#' + inv;
        };
        this.glitchDisplayColors = {};
        for (const id of Object.keys(this.glitchChannels || {})) {
            const mode = this.glitchMode[id];
            const key = cnreIdToColorKey(id);
            const base = this.glitchBackup[key] || (key === 'eye' ? this.eyeColor : this.currentColors[key]);
            if (!base) continue;
            let displayHex = null;
            if (mode === 'neg') {
                displayHex = '#000000';
            } else if (mode === 'pos') {
                displayHex = '#FFFFFF';
            } else if (mode === 'fluor' || mode === 'invfluor') {
                const ach = this._isAchromatic(base);
                if (ach) {
                    displayHex = ((ach === 'white') === (mode === 'fluor')) ? '#FFFFFF' : '#000000';
                } else {
                    const sat = boostSaturationToHex(base, 1);
                    displayHex = (mode === 'invfluor') ? invertHex(sat) : sat;
                }
            }
            if (displayHex) this.glitchDisplayColors[id] = displayHex;
        }
        if (this.preview) this.preview.setGlitchModes(this.glitchMode, this.glitchDisplayColors);
    }

    /** 解除所有区域的故障，恢复各自 base 颜色（锁定部位除外）。 */
    clearAllGlitch() {
        const ids = Object.keys(this.glitchChannels || {});
        if (ids.length === 0) { this.showToast('当前没有任何故障通道'); return; }
        let cleared = 0;
        for (const id of ids) {
            const key = cnreIdToColorKey(id);
            if (this.isLocked(key)) continue; // 锁定部位不解除故障
            const bak = this.glitchBackup[key];
            if (key === 'eye') {
                this.eyeColor = bak || 'FFFFFF';
                this.updateEyeUI();
                if (this.preview) this.preview.setEyeColor(this.eyeColor);
            } else if (this.currentColors[key] !== undefined) {
                this.currentColors[key] = bak || this.currentColors[key];
            }
            delete this.glitchChannels[id];
            delete this.glitchBackup[key];
            delete this.glitchMode[id];
            delete this.glitchDisplayColors[id];
            cleared++;
        }
        if (cleared === 0) { this.showToast('锁定部位未解除，其余无故障通道'); return; }
        this.refreshChannelUI();
        this.onColorsChanged();
        if (this.preview) this.preview.setGlitchModes(this.glitchMode, this.glitchDisplayColors);
        this.showToast(`已解除 ${cleared} 个故障通道，恢复 base 颜色`);
    }

    switchDinosaur(dinoKey) {
        this.currentDino = dinoKey;
        this.syncDinosaurSelectTrigger();
        // 已知动画混合 bug 的恐龙（官方 GLB 姿势异常，非本工具问题）
        if (['Camarasaurus', 'Carnotaurus', 'Oviraptor', 'Hypsilophodon', 'Gallimimus'].includes(dinoKey)) {
            this.showToast('⚠️ 该恐龙动画混合存在已知 bug（姿势可能异常），属官方模型问题，非本工具所致', 3200);
        }
        const newDinoData = DINOSAUR_DATA[dinoKey];
        // 先确定当前图案 (更新下拉 + 有效性检查), 再据此建颜色行
        this.updatePatternSelect(dinoKey);
        // 如果当前选中的图案在新恐龙里无效，默认选第一个
        if (newDinoData && newDinoData.patterns && newDinoData.patterns.length > 0) {
            // 从新恐龙的 patterns 数组里生成对应的带前缀值
            const firstValue = newDinoData.patterns[0].startsWith('Pattern_') ? newDinoData.patterns[0] : `Pattern_${newDinoData.patterns[0]}`;
            if (!newDinoData.patterns.map(p => p.startsWith('Pattern_') ? p : `Pattern_${p}`).includes(this.currentPattern)) {
                this.currentPattern = firstValue;
                this.el.patternTypeSelect.value = this.currentPattern;
            }
        } else {
            this.currentPattern = 'Pattern_1';
            this.el.patternTypeSelect.value = 'Pattern_1';
        }
        // 现在 currentPattern 已确定 → 按皮肤建颜色行 + 设 hasSpecial + 渲染官方配色下拉
        this.buildColorInputs();
        this.refreshSpecialState();
        this.renderOfficialSchemeSelect();
        // 自定义下拉：当前恐龙置顶，切换后需重建
        this.initPresetSchemeSelect();
        this.updateSkinCode(); this.undoRedo.saveState(this.snapshot());
        // 切换恐龙时保持用户当前眼部颜色，不再覆盖为恐龙默认眼色
        this.loadPreviewModel().then(() => this.syncAnimSpeedUI());
        this.savePreferences();
    }

    applyPresetColors(colorsObj, opts = {}) {
        // 锁定部位不被覆盖
        const merged = { ...colorsObj };
        for (const key of this.lockedParts) {
            if (key !== 'eye' && this.currentColors[key] !== undefined) merged[key] = this.currentColors[key];
        }
        this.currentColors = merged;
        if (opts.eyeColor && !this.isLocked('eye')) {
            this.eyeColor = opts.eyeColor; this.updateEyeUI();
            if (this.preview) this.preview.setEyeColor(this.eyeColor);
        }
        // 故障通道：清除旧的，若预设带 glitchChannels 则写入新的（base 颜色保留，只改导出 raw）
        this.glitchChannels = {};
        this.glitchBackup = {};
        this.glitchMode = {};
        if (opts.glitchChannels) {
            for (const [id, v] of Object.entries(opts.glitchChannels)) {
                const key = cnreIdToColorKey(id);
                this.glitchChannels[id] = { ...v };
                this.glitchMode[id] = (v.r > 0 || v.g > 0 || v.b > 0) ? 'pos' : 'neg';
                this.glitchBackup[key] = key === 'eye' ? (this.eyeColor || 'FFFFFF') : (this.currentColors[key] || '000000');
            }
        } else {
            // 普通预设 / 重置配色：没有任何故障通道 → 同时清掉预览显示色并通知模型复位，
            // 否则模型仍会沿用旧皮肤码导入的故障显示色（黑肚皮 / 荧光白背 / 故障眼）。
            this.glitchDisplayColors = {};
            if (this.preview) {
                this.preview.setGlitchModes(this.glitchMode, this.glitchDisplayColors);
                // glitchMode 已清空，setGlitchModes 不会重烘眼睛，这里手动复位眼球故障显示色
                if (this.preview.glitchMode && this.preview.glitchMode['eyes'] === undefined) {
                    this.preview.composeAndApplyEyeTexture();
                }
            }
        }
        this.refreshChannelUI();
        this.updateSkinCode(); this.undoRedo.saveState(this.snapshot());
        if (this.preview) this.preview.updateColors(this.currentColors);
    }
    // ===== 神秘小功能：标题连点解锁 (v0.5.9.54) =====
    onTitleClick() {
        this.titleClicks++;
        if (this._titleClickTimer) clearTimeout(this._titleClickTimer);
        // 1.5s 内未再点击则清零计数（需连续点击）
        this._titleClickTimer = setTimeout(() => { this.titleClicks = 0; this.savePreferences(); }, 1500);
        this.savePreferences();
        if (this.titleClicks === 5 && !this.materialTuningUnlocked) {
            this.setMaterialTuningUnlocked(true);
            this.setSmoothnessTuningEnabled(true);
            this.setMetalnessTuningEnabled(true);
            this.setEmissionTuningEnabled(true);
            this.showToast('🔓 已解锁：材质微调（光滑度 / 金属度 / 自发光）');
        }
        if (this.titleClicks >= 10 && !this.mysteryUnlocked) {
            this.mysteryUnlocked = true;
            const row = document.getElementById('mysteryRow');
            if (row) row.style.display = 'flex';
            this._seedDevcodePreset();
            this.showToast('✨ 神秘功能已解锁');
        }
        if (this.titleClicks >= 10 && !this.cnreSkinDevUnlocked) {
            this.setCnreSkinDevUnlocked(true);
            this.showToast('🔓 已解锁：CNRE 皮肤 dev 原始通道编辑器（://CNREskindevtoggle）');
        }
    }

    /** 应用「材质微调」显示/启用状态：
     * - unlocked：设置面板入口行 + 颜色编辑区控制区是否可见
     * - smoothnessTuningEnabled / metalnessTuningEnabled：两个通道各自独立开关（控制是否应用对应自定义 RM）
     */
    applyMaterialTuningVisibility() {
        const settingsRow = document.getElementById('materialTuningSettingsRow');
        const sec = document.getElementById('materialTuningSection');
        const anyOn = this.smoothnessTuningEnabled || this.metalnessTuningEnabled || this.emissionTuningEnabled;
        if (settingsRow) settingsRow.style.display = this.materialTuningUnlocked ? 'flex' : 'none';
        if (sec) sec.style.display = this.materialTuningUnlocked ? 'block' : 'none';
        // 设置行只放「启用」开关（不在此放滑块）；分部位滑块在对应颜色区域下方，按开关显隐
        this._syncEnableToggles();
        document.querySelectorAll('.mt-channel-rows').forEach(wrap => {
            wrap.style.display = anyOn ? 'block' : 'none';
            const smoothRow = wrap.querySelector('.mt-channel-row[data-kind="smooth"]');
            const metalRow = wrap.querySelector('.mt-channel-row[data-kind="metal"]');
            const emitRow = wrap.querySelector('.mt-channel-row[data-kind="emit"]');
            if (smoothRow) smoothRow.style.display = this.smoothnessTuningEnabled ? 'flex' : 'none';
            if (metalRow) metalRow.style.display = this.metalnessTuningEnabled ? 'flex' : 'none';
            if (emitRow) emitRow.style.display = this.emissionTuningEnabled ? 'flex' : 'none';
        });
        if (anyOn) this._syncMaterialTuningUI();
    }
    _syncEnableToggles() {
        const defs = [
            ['smoothnessToggleBtn', this.smoothnessTuningEnabled, '光滑度'],
            ['metalnessToggleBtn', this.metalnessTuningEnabled, '金属度'],
            ['emissionToggleBtn', this.emissionTuningEnabled, '自发光'],
        ];
        for (const [id, on, label] of defs) {
            const btn = document.getElementById(id);
            if (!btn) continue;
            btn.classList.toggle('on', on);
            btn.textContent = `${label}：${on ? '开' : '关'}`;
        }
    }
    setMaterialTuningUnlocked(unlocked) {
        this.materialTuningUnlocked = !!unlocked;
        this.applyMaterialTuningVisibility();
        this.savePreferences();
    }
    setSmoothnessTuningEnabled(enabled) {
        this.smoothnessTuningEnabled = !!enabled;
        if (this.preview) this.preview.setSmoothnessTuningEnabled(this.smoothnessTuningEnabled);
        this.applyMaterialTuningVisibility();
        this.savePreferences();
    }
    setMetalnessTuningEnabled(enabled) {
        this.metalnessTuningEnabled = !!enabled;
        if (this.preview) this.preview.setMetalnessTuningEnabled(this.metalnessTuningEnabled);
        this.applyMaterialTuningVisibility();
        this.savePreferences();
    }
    setEmissionTuningEnabled(enabled) {
        this.emissionTuningEnabled = !!enabled;
        if (this.preview) this.preview.setEmissionTuningEnabled(this.emissionTuningEnabled);
        this.applyMaterialTuningVisibility();
        this.savePreferences();
    }
    _syncMaterialTuningUI() {
        if (!this.preview) return;
        const s = this.preview.getPartRoughMetalSettings();
        const gS = document.getElementById('mtGlobalSmooth');
        const gM = document.getElementById('mtGlobalMetal');
        const gSv = document.getElementById('mtGlobalSmoothVal');
        const gMv = document.getElementById('mtGlobalMetalVal');
        const bodySmooth = 1 - s.roughness.body;
        if (gS) gS.value = bodySmooth; if (gSv) gSv.textContent = bodySmooth.toFixed(2);
        if (gM) gM.value = s.metalness.body; if (gMv) gMv.textContent = s.metalness.body.toFixed(2);
        const e = this.preview.getPartEmissionSettings();
        const gE = document.getElementById('mtGlobalEmission');
        const gEv = document.getElementById('mtGlobalEmissionVal');
        if (gE) gE.value = e.global; if (gEv) gEv.textContent = e.global.toFixed(2);
        MT_PART_IDS.forEach(id => {
            const sVal = 1 - s.roughness[id];
            const sV = document.getElementById('mt_smooth_val_' + id);
            const sIn = document.querySelector(`.mt-channel-row[data-part="${id}"][data-kind="smooth"] input`);
            if (sIn) sIn.value = sVal; if (sV) sV.textContent = sVal.toFixed(2);
            const mV = document.getElementById('mt_metal_val_' + id);
            const mIn = document.querySelector(`.mt-channel-row[data-part="${id}"][data-kind="metal"] input`);
            if (mIn) mIn.value = s.metalness[id]; if (mV) mV.textContent = s.metalness[id].toFixed(2);
            const eV = document.getElementById('mt_emit_val_' + id);
            const eIn = document.querySelector(`.mt-channel-row[data-part="${id}"][data-kind="emit"] input`);
            const eVal = e.emission[id] != null ? e.emission[id] : 0;
            if (eIn) eIn.value = eVal; if (eV) eV.textContent = eVal.toFixed(2);
        });
    }

    applyDevcode() {
        this.importSkinCode(DEVCODE_NYOR);
        this._seedDevcodePreset();
        this.showToast('✨ 已应用 devcode 金色配色');
    }
    _seedDevcodePreset() {
        try {
            const presets = getPresets();
            if (presets.some(p => p.name === 'devcode 金色 (隐藏)')) return;
            const result = decodeNyorOverlay(DEVCODE_NYOR);
            if (result.error) return;
            addPreset('devcode 金色 (隐藏)', result.colors, { eyeColor: result.eyeColor, hidden: true });
        } catch {}
    }

    /** CNRE 皮肤 dev 原始通道编辑器解锁（标题连点 10 次 或 URL 含 ://CNREskindevtoggle 或设置开关） */
    setCnreSkinDevUnlocked(unlocked) {
        this.cnreSkinDevUnlocked = !!unlocked;
        this.applyDevRawVisibility();
        this._syncCnreDevRawToggle();
        this.savePreferences();
    }
    /** 同步设置面板里的「CNRE 原始通道编辑器」开关状态 */
    _syncCnreDevRawToggle() {
        const btn = document.getElementById('cnreDevRawToggleBtn');
        if (!btn) return;
        const on = !!this.cnreSkinDevUnlocked;
        btn.classList.toggle('on', on);
        btn.textContent = `原始通道：${on ? '开' : '关'}`;
    }
    /** 按 dev 解锁态切换各部位「原始」折叠面板的可见性（CSS 控制，dev 模式同时隐藏旧 raw 行） */
    applyDevRawVisibility() {
        const on = !!this.cnreSkinDevUnlocked;
        document.body.classList.toggle('cnre-dev-raw', on);
        // 解锁瞬间若当前无展开状态，默认展开第一个部位便于立即上手（其余保持折叠）
        if (on) {
            document.querySelectorAll('.dev-raw-editor').forEach((ed, i) => {
                ed.classList.toggle('collapsed', i !== 0);
            });
            COLOR_PARTS.forEach(p => this.updateDevRawUI(p.id));
            this.updateDevRawUI('eye');
        }
    }

    applySolidColor(hex) {
        const c = hex.replace('#', '').toUpperCase();
        if (!isValidColorHex(c)) return;
        COLOR_PARTS.forEach(part => { if (!this.isProtected(part.id)) this.currentColors[part.id] = c; });
        this.updateAllInputs();
        // 同步「纯色」工具自身的色板与 HEX 输入框，避免拖放/应用后该工具显示不同步
        const solidSwatch = document.querySelector('#colorRow_solid .draggable-swatch');
        const solidHex = document.getElementById('solidColorHex');
        if (solidSwatch) { solidSwatch.value = '#' + c; solidSwatch.setAttribute('data-color', c); }
        if (solidHex) solidHex.value = '#' + c;
        this.onColorsChanged();
    }
    applyColorArray(arr) { COLOR_PARTS.forEach((part, i) => { if (i < arr.length && !this.isProtected(part.id)) this.currentColors[part.id] = arr[i]; }); this.updateAllInputs(); this.onColorsChanged(); }

    importSkinCode(code) {
        // 导入前先清空故障集合与原色备份；新格式若含负值会在下方重新写入
        this.glitchChannels = {};
        this.glitchBackup = {};
        // 工具专属皮肤码（JSON，含 tool:1）：不记录恐龙，导入也不切换恐龙
        if (isToolSkinCode(code)) {
            const result = decodeToolSkin(code);
            if (result.error) { this.showToast(result.error); return; }
            // 关键：保留当前恐龙，不自动切换
            if (result.pattern) { this.currentPattern = result.pattern; if (this.el.patternTypeSelect) this.el.patternTypeSelect.value = result.pattern; }
            if (result.patternScale) { this.currentPatternScale = result.patternScale; if (this.el.patternScaleSelect) this.el.patternScaleSelect.value = result.patternScale; }
            this.skinVariation = SCALE_TO_CNRE_VAR[this.currentPatternScale] ?? 8; // 同步 CNRE 纹理粗细字段
            if (typeof result.varValue === 'number') { this.currentVar = result.varValue; if (this.el.varSlider) this.el.varSlider.value = result.varValue; this.updateVarDisplay(); }
            const safeColors = {};
            Object.entries(result.colors || {}).forEach(([k, v]) => { if (isValidColorHex(v) && !this.isLocked(k)) safeColors[k] = v; });
            this.currentColors = this.mergeImportedColors(safeColors);
            this.glitchChannels = result.glitchChannels || {};
            this.glitchMode = result.glitchMode || {};
            this.glitchBackup = result.glitchBackup || {};
            // 故障部位（fluor/invfluor）把显示色同步成高饱和色，使导入后 3D 预览与游戏内一致；
            // base 色已存于 glitchBackup，解除故障时还原，不影响导出（导出用越界 raw 覆盖）。
            this._applyGlitchDisplayColors();
            // 自发光：还原各部位强度 + 全局强度，并开启微调，使导入即见发光效果
            let emissionApplied = false;
            if (result.emission && this.preview) {
                if (typeof result.emission.global === 'number') this.preview.globalEmission = result.emission.global;
                const ep = result.emission.parts || {};
                for (const id of Object.keys(ep)) {
                    if (id in this.preview.partEmission) this.preview.partEmission[id] = ep[id];
                }
                this.emissionTuningEnabled = true;
                this.setMaterialTuningUnlocked(true); // 导入带自发光的工具码即解锁材质微调区（金属度/光滑度仍默认关闭，保留 RAC）
                this.preview.setEmissionTuningEnabled(true);
                emissionApplied = true;
            }
            this.buildColorInputs(); this.refreshSpecialState(); this.renderOfficialSchemeSelect();
            this.updateAllInputs(); this.updateSkinCode(); this.undoRedo.reset(this.snapshot());
            if (emissionApplied) this.applyMaterialTuningVisibility();
            // ★ 关键修复：工具码导入分支此前漏掉 3D 预览刷新，导致导入后模型不更新（看起来像"故障数据没存进"）
            if (this.preview) { this.preview.setEyeColor(this.eyeColor); this.preview.updateColors(this.currentColors); }
            this.showToast('已应用工具专属皮肤码（不切换恐龙）');
            return;
        }
        // Nyor's Overlay 码检测 (JSON 格式)
        if (isNyorOverlayCode(code)) {
            const result = decodeNyorOverlay(code);
            if (result.error) { this.showToast(result.error); return; }
            if (result.pattern) { this.currentPattern = result.pattern; this.el.patternTypeSelect.value = this.currentPattern; }
            if (result.patternScale) { this.currentPatternScale = result.patternScale; this.el.patternScaleSelect.value = result.patternScale; }
            if (typeof result.varValue === 'number') {
                this.currentVar = result.varValue;
                if (this.el.varSlider) this.el.varSlider.value = result.varValue;
                this.updateVarDisplay();
            }
            if (typeof result.isFemale === 'boolean') { this.isFemale = result.isFemale; this.updateGenderUI(); }
            // v0.5.8.20: 校验导入的颜色，非法值(如 NaN 污染)直接丢弃，防止毒害编辑器状态
            if (result.eyeColor && isValidColorHex(result.eyeColor) && !this.isLocked('eye')) { this.eyeColor = result.eyeColor; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor); }
            const nyorSafeColors = {};
            Object.entries(result.colors || {}).forEach(([k, v]) => { if (isValidColorHex(v) && !this.isLocked(k)) nyorSafeColors[k] = v; });
            this.currentColors = { ...this.currentColors, ...nyorSafeColors };
            this.updateAllInputs(); this.updateSkinCode(); this.undoRedo.reset(this.snapshot());
            if (this.preview) this.preview.updateColors(this.currentColors);
            this.showToast('Nyor Overlay 码导入成功!');
            return;
        }
        // CNRE 码检测
        if (isCNRECode(code)) {
            const result = decodeCNRE(code);
            if (result.error) { this.showToast(result.error); return; }
            if (result.pattern) { this.currentPattern = result.pattern; this.el.patternTypeSelect.value = this.currentPattern; }
            // 仅旧格式有纹理位前缀，可反查具体皮肤 (patternMeta)
            if (result.format === 'old' && result.prefix) {
                const resolved = resolvePatternByCode(this.currentDino, parseInt(result.prefix[1], 10));
                if (resolved) { this.currentPattern = resolved.id; this.el.patternTypeSelect.value = this.currentPattern; }
            }
            if (typeof result.isFemale === 'boolean') { this.isFemale = result.isFemale; this.updateGenderUI(); }
            if (result.format === 'old') {
                // 旧「线性码」：解码色为线性，转回 sRGB 供编辑器显示
                if (!this.isLocked('eye')) this.eyeColor = this.hexLinearToSrgb(result.eyeColor);
                this.currentColors = this.mergeImportedColors(this.colorsLinearToSrgb(result.colors));
            } else {
                // 新 S1 短码：解码层已把线性转回 sRGB，原样使用
                if (!this.isLocked('eye')) this.eyeColor = result.eyeColor;
                this.currentColors = this.mergeImportedColors(result.colors);
                this.glitchChannels = result.glitchChannels || {}; // 保留负值通道，供导出 round-trip
                this.glitchBackup = {};
                this.glitchMode = {};
                for (const [id, v] of Object.entries(this.glitchChannels)) {
                    const key = cnreIdToColorKey(id);
                    this.glitchBackup[key] = key === 'eye' ? (this.eyeColor || 'FFFFFF') : (this.currentColors[key] || '000000');
                    this.glitchMode[id] = (v.r > 0 || v.g > 0 || v.b > 0) ? 'pos' : 'neg';
                }
                if ([2, 8, 16].includes(result.skinVariation)) {
                    this.skinVariation = result.skinVariation;
                    // 合并选择器：CNRE 纹理粗细同步到工具纹理粗细（中→中、细→细、粗→粗）
                    this.currentPatternScale = CNRE_VAR_TO_SCALE[result.skinVariation] ?? 'medium';
                    if (this.el.patternScaleSelect) this.el.patternScaleSelect.value = this.currentPatternScale;
                    this.syncVarFromScale();
                }
            }
            this.buildColorInputs(); this.refreshSpecialState(); this.renderOfficialSchemeSelect();
            this._applyGlitchDisplayColors();
            this.updateAllInputs(); this.updateSkinCode(); this.undoRedo.reset(this.snapshot());
            this.loadPreviewModel(); if (this.preview) this.preview.updateColors(this.currentColors);
            this.showToast('CNRE 码导入成功!');
            return;
        }
        const result = parseSkinCode(code);
        if (result.error) { this.showToast(result.error); return; }
        if (result.dinoName) { this.currentDino = result.dinoName; this.syncDinosaurSelectTrigger(); this.updatePatternSelect(result.dinoName); }
        if (result.patternType) { 
            // ★★★ 特殊处理：解析出来的是 A/B/C，转成带 Pattern_ 的格式 ★★★
            this.currentPattern = result.patternType.startsWith('Pattern_') ? result.patternType : `Pattern_${result.patternType}`;
            this.el.patternTypeSelect.value = this.currentPattern; 
        }
        // 图案已确定 → 按皮肤建颜色行 + 设 hasSpecial (覆盖恐龙级) + 渲染官方配色下拉
        this.buildColorInputs(); this.refreshSpecialState(); this.renderOfficialSchemeSelect();
        if (result.patternScale) { this.currentPatternScale = result.patternScale; this.el.patternScaleSelect.value = result.patternScale; this.syncVarFromScale(); }
        this.currentColors = this.mergeImportedColors(result.colors); this.updateAllInputs(); this.updateSkinCode(); this.undoRedo.reset(this.snapshot()); this.loadPreviewModel(); if (this.preview) this.preview.updateColors(this.currentColors); this.showToast('皮肤码导入成功!');
    }

    copyToClipboard(text) { if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => this.showToast('已复制!')); } }
    showToast(msg, duration = 2000) { const existing = document.querySelector('.toast'); if (existing) existing.remove(); const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = msg; document.body.appendChild(toast); setTimeout(() => toast.remove(), duration); }

    renderPresets() {
        const allPresets = getPresets();
        const list = this.el.presetList; if (!list) return; list.innerHTML = '';

        // 过滤：搜索 + 仅故障；隐藏预设（如 devcode）不显示
        const term = (this.presetFilter.term || '').trim().toLowerCase();
        const glitchOnly = !!this.presetFilter.glitchOnly;
        const presets = allPresets.filter((preset, idx) => {
            if (preset.hidden) return false;
            const nameMatch = !term || preset.name.toLowerCase().includes(term) || String(idx + 1).includes(term);
            const hasGlitch = preset.glitchChannels && Object.keys(preset.glitchChannels).length > 0;
            const glitchMatch = !glitchOnly || hasGlitch;
            return nameMatch && glitchMatch;
        });

        if (presets.length === 0) {
            const visibleAll = allPresets.filter(p => !p.hidden).length;
            list.innerHTML = '<span style="color:var(--text-secondary);font-size:0.7rem;">' + (visibleAll === 0 ? '暂无预设' : '没有匹配的预设') + '</span>';
            return;
        }

        presets.forEach((preset, index) => {
            // 因为过滤后 index 变了，需找回原数组索引用于删除
            const originalIndex = allPresets.indexOf(preset);
            const hasGlitch = preset.glitchChannels && Object.keys(preset.glitchChannels).length > 0;
            const bar = document.createElement('div'); bar.className = 'preset-bar' + (hasGlitch ? ' has-glitch' : '');
            const dots = COLOR_PARTS.map(p => `<span class="preset-color-dot" style="background-color:#${preset.colors[p.id] || '000'};"></span>`).join('');
            const glitchIcon = hasGlitch ? `<i class="icon ico-glitch sz14 preset-glitch-icon" title="含故障通道"></i>` : '';
            bar.innerHTML = `<span class="preset-name">${preset.name}</span>${glitchIcon}<span class="preset-colors-preview">${dots}</span><button class="btn btn-sm" data-delete="${originalIndex}" style="padding:0.2rem 0.45rem; flex-shrink:0;"><i class="icon ico-close sz14"></i></button>`;
            bar.addEventListener('click', (e) => { if (e.target.dataset.delete !== undefined || e.target.closest('[data-delete]')) { e.stopPropagation(); const btn = e.target.dataset.delete !== undefined ? e.target : e.target.closest('[data-delete]'); deletePreset(parseInt(btn.dataset.delete)); this.renderPresets(); return; } const p = loadPreset(originalIndex); if (p) { this.applyPresetColors(p.colors, { eyeColor: p.eyeColor, glitchChannels: p.glitchChannels }); this.showToast('已加载: ' + preset.name); } });
            list.appendChild(bar);
        });
    }

    generateGradientDisplay(colors, container) {
        const results = container || this.el.twoColorGradientResults;
        if (!results) return;
        results.innerHTML = '';
        colors.forEach(hex => {
            const swatch = document.createElement('div'); swatch.className = 'gradient-swatch'; swatch.style.backgroundColor = '#' + hex; swatch.title = hex; swatch.setAttribute('draggable', 'true'); swatch.setAttribute('data-color', hex);
            swatch.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'color', hex: hex, part: null, label: '渐变色' })); e.dataTransfer.effectAllowed = 'copy'; const preview = document.getElementById('drag-preview'); if (preview) { preview.style.backgroundColor = '#' + hex; preview.style.display = 'block'; e.dataTransfer.setDragImage(preview, 12, 12); } });
            swatch.addEventListener('dragend', () => { document.getElementById('drag-preview').style.display = 'none'; });
            swatch.addEventListener('click', () => this.copyToClipboard(hex)); results.appendChild(swatch);
        });
    }

    generateAdvancedPaletteDisplay(colors, replacePalette, baseHex) {
        const results = document.getElementById('advancedPaletteResults');
        if (!results) return;
        results.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px;';

        // 找到与用户输入基色最接近的颜色做专门标记
        let baseIndex = -1;
        if (baseHex && GradGen.validateHex(baseHex)) {
            const baseRgb = GradGen.hexToRgb(baseHex);
            let bestDist = Infinity;
            colors.forEach((hex, idx) => {
                const rgb = GradGen.hexToRgb(hex);
                const dist = Math.hypot(rgb.r - baseRgb.r, rgb.g - baseRgb.g, rgb.b - baseRgb.b);
                if (dist < bestDist) { bestDist = dist; baseIndex = idx; }
            });
        }

        colors.forEach((hex, idx) => {
            const swatch = document.createElement('div');
            swatch.className = 'gradient-swatch' + (idx === baseIndex ? ' is-base-color' : '');
            swatch.style.backgroundColor = '#' + hex;
            swatch.title = '#' + hex + (idx === baseIndex ? ' (基色)' : '') + ' (点击复制)';
            swatch.setAttribute('draggable', 'true');
            swatch.setAttribute('data-color', hex);
            swatch.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'color', hex: hex, part: null, label: '调色板' })); e.dataTransfer.effectAllowed = 'copy'; const preview = document.getElementById('drag-preview'); if (preview) { preview.style.backgroundColor = '#' + hex; preview.style.display = 'block'; e.dataTransfer.setDragImage(preview, 12, 12); } });
            swatch.addEventListener('dragend', () => { document.getElementById('drag-preview').style.display = 'none'; });
            swatch.addEventListener('click', () => this.copyToClipboard(hex));
            wrap.appendChild(swatch);
        });
        results.appendChild(wrap);
        // 如果勾选了"替换现有配色"，自动应用
        if (replacePalette) {
            this.applyColorArray(colors);
            this.showToast(`已替换配色 (${Math.min(colors.length, COLOR_PARTS.length)} 色)`);
        }
    }

    generateAdvancedPaletteAction() {
        const baseHex = normalizeHex(document.getElementById('advancedBaseHex')?.value || '');
        if (!GradGen.validateHex(baseHex)) { this.showToast('请输入有效的基色'); return; }
        const options = {
            count: parseInt(document.getElementById('advancedCount')?.value) || 9,
            hueShift: parseInt(document.getElementById('advancedHueShift')?.value) || 0,
            brightnessRange: parseFloat(document.getElementById('advancedBrightnessRange')?.value) || 0.8,
            offset: parseFloat(document.getElementById('advancedOffset')?.value) || 0,
            saturation: parseFloat(document.getElementById('advancedSaturation')?.value) || 1,
            smallerRanges: document.getElementById('advancedSmallerRanges')?.checked ?? true,
        };
        const replacePalette = document.getElementById('advancedReplacePalette')?.checked ?? false;
        const colors = GradGen.generateAdvancedPalette(baseHex, options);
        this.generateAdvancedPaletteDisplay(colors, replacePalette, baseHex);
    }

    togglePresets() {
        this.presetsCollapsed = !this.presetsCollapsed;
        const list = this.el.presetList;
        const searchRow = this.el.presetSearchInput?.parentElement;
        const wrapper = this.el.presetListWrapper;
        const btn = document.getElementById('togglePresetsBtn');
        const hidden = this.presetsCollapsed;
        // 保持 CSS 中定义的 flex 布局，避免展开后溢出
        if (list) list.style.display = hidden ? 'none' : 'flex';
        if (searchRow) searchRow.style.display = hidden ? 'none' : 'flex';
        if (wrapper) wrapper.style.display = hidden ? 'none' : 'flex';
        if (btn) btn.innerHTML = hidden
            ? '<i class="icon ico-arrow-left sz10 rot-right"></i>'
            : '<i class="icon ico-arrow-left sz10 rot-down"></i>';
    }

    initPresetResize() {
        const handle = this.el.presetResizeHandle;
        const wrapper = this.el.presetListWrapper;
        if (!handle || !wrapper) return;
        // 恢复保存的高度
        if (typeof this.presetListHeight === 'number' && this.presetListHeight > 80) {
            wrapper.style.height = this.presetListHeight + 'px';
        }
        let startY = 0, startH = 0, dragging = false;
        const onMove = (e) => {
            if (!dragging) return;
            const dy = e.clientY - startY;
            const h = Math.max(80, Math.min(600, startH + dy));
            wrapper.style.height = h + 'px';
            this.presetListHeight = h;
        };
        const onUp = () => {
            dragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            this.savePreferences();
        };
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            dragging = true;
            startY = e.clientY;
            startH = wrapper.getBoundingClientRect().height;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    toggleCodeCollapse(section) {
        if (!section || !this.codeCollapsed.hasOwnProperty(section)) return;
        this.codeCollapsed[section] = !this.codeCollapsed[section];
        this.syncCodeCollapses();
        this.savePreferences();
    }

    syncCodeCollapses() {
        for (const section of Object.keys(this.codeCollapsed)) {
            const container = document.querySelector(`.code-section[data-code-section="${section}"]`);
            const btn = container?.querySelector('.code-collapse-btn');
            const icon = btn?.querySelector('i');
            const bodies = container?.querySelectorAll('.code-section-body');
            const collapsed = !!this.codeCollapsed[section];
            bodies?.forEach(b => b.style.display = collapsed ? 'none' : '');
            if (icon) icon.className = `icon ico-arrow-left sz10 ${collapsed ? 'rot-right' : 'rot-down'}`;
        }
    }

    randomSolid() { const hex = GradGen.randomHex(); this.applySolidColor('#' + hex); this.showToast('随机纯色: #' + hex); }
    randomAllParts() { COLOR_PARTS.forEach(part => { if (!this.isProtected(part.id)) this.currentColors[part.id] = GradGen.randomHex(); }); this.updateAllInputs(); this.onColorsChanged(); this.showToast('已随机所有部位颜色（锁定/故障部位除外）'); }
    invertColors() {
        const invertHex = (hex) => {
            const h = (hex || 'FFFFFF').slice(0, 6);
            const inv = [0, 2, 4].map(i => (255 - parseInt(h.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('').toUpperCase();
            return inv;
        };
        COLOR_PARTS.forEach(part => { if (!this.isProtected(part.id)) this.currentColors[part.id] = invertHex(this.currentColors[part.id]); });
        if (this.eyeColor && !this.isProtected('eye')) { this.eyeColor = invertHex(this.eyeColor); this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor); }
        this.updateAllInputs(); this.onColorsChanged();
        this.showToast('已反色（锁定/故障部位除外）');
    }

    /** 填充「反色工具」的部位下拉（当前恐龙的全部可调部位 + 眼球） */
    populateInvertParts() {
        // 下拉菜单已移除：目标部位由颜色行右侧「反色」图标或反色工具区源色决定
        this.syncInvertTargetLabel();
    }

    /** 对指定部位颜色直接生成反色并应用（颜色行右侧反色按钮用） */
    invertAndApplyPart(partId) {
        const srcHex = (partId === 'eye') ? ('#' + this.eyeColor) : (this.currentColors[partId] || 'FFFFFF');
        const pair = this.generateInvertForPart(partId, srcHex);
        if (!pair) return;
        if (this._applyHexToPart(partId, pair.inv)) {
            const name = partId === 'eye' ? '眼球' : ((COLOR_PARTS || []).find(p => p.id === partId)?.label || partId);
            this.showToast(`已反色并应用 ${pair.inv} 到「${name}」`);
        }
        // 同时把源色同步到反色小工具（方便查看/再调整），但不显示部位标签
        this.setInvertTarget(partId, pair.src);
    }

    /** 设置反色工具当前目标部位，并可选把源色填为该部位颜色（不显示部位标签） */
    setInvertTarget(partId, srcHex) {
        this.invertTargetPart = partId || 'body';
        // 反色工具不再显示当前目标部位，保持为通用小工具
        this.syncInvertTargetLabel();
        if (srcHex) {
            const hexInput = document.getElementById('invertHexInput');
            const picker = document.getElementById('invertColorPicker');
            const hex = normalizeHex(srcHex);
            if (hexInput && isValidColorHex(hex)) hexInput.value = '#' + hex.toUpperCase();
            if (picker && isValidColorHex(hex)) picker.value = '#' + hex;
        }
        const part = this.invertTargetPart;
        const hexInput = document.getElementById('invertHexInput');
        const pair = this.generateInvertForPart(part, hexInput?.value);
        if (pair) this.showInvertResult(part, pair);
    }

    /** 同步反色工具标题里的目标部位标签：现为空，保持工具通用 */
    syncInvertTargetLabel() {
        const label = document.getElementById('invertTargetLabel');
        if (label) label.textContent = '';
    }

    /** 反色工具：对指定部位，取输入/拖入的 HEX，生成其互补色（255-c），仅返回结果不直接应用 */
    generateInvertForPart(partId, srcHex) {
        const raw = (srcHex || '').trim();
        let hex = '';
        // 优先解析从色板拖入的 JSON 负载 {type:'color', hex:...}
        if (raw.startsWith('{') && raw.includes('"hex"')) {
            try { const obj = JSON.parse(raw); if (obj && obj.hex) hex = normalizeHex(obj.hex); } catch {}
        }
        if (!hex) hex = normalizeHex(raw);
        if (!isValidColorHex(hex)) { this.showToast('请输入/拖入有效的 HEX 颜色'); return null; }
        const inv = [0, 2, 4].map(i => (255 - parseInt(hex.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('').toUpperCase();
        return { src: '#' + hex.toUpperCase(), inv: '#' + inv };
    }

    /** 把 HEX 颜色应用到指定部位 */
    _applyHexToPart(partId, hex) {
        const clean = normalizeHex(hex || '');
        if (!isValidColorHex(clean)) return false;
        const out = '#' + clean.toUpperCase();
        if (partId === 'eye') {
            this.eyeColor = out; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor);
        } else {
            this.currentColors[partId] = out;
        }
        this.updateAllInputs(); this.onColorsChanged();
        return true;
    }

    /** 显示反色结果行（色块 + HEX），点击应用 */
    showInvertResult(partId, pair) {
        const box = document.getElementById('invertResult');
        const swatch = document.getElementById('invertResultSwatch');
        const label = document.getElementById('invertResultHex');
        const applyBtn = document.getElementById('invertApplyBtn');
        if (!box || !swatch || !label) return;
        swatch.style.backgroundColor = pair.inv;
        label.textContent = pair.inv;
        swatch.title = `点击应用到「${partId}」`;
        label.title = `点击应用到「${partId}」`;
        const apply = () => {
            if (this._applyHexToPart(partId, pair.inv)) {
                this.showToast(`已应用反色 ${pair.inv} 到「${partId}」`);
            }
        };
        swatch.onclick = apply;
        label.onclick = apply;
        if (applyBtn) applyBtn.onclick = apply;
        box.style.display = 'flex';
    }

    /** 把单个部位重置为其默认 TMC 颜色（不影响其它部位），区别于整体「重置配色」 */
    resetPartToDefault(partId) {
        const defaults = this._getDefaultColorsForSkin(this.currentDino, this.currentPattern);
        const def = (partId === 'eye')
            ? ((DINOSAUR_DATA[this.currentDino] && DINOSAUR_DATA[this.currentDino].eyeColor) || 'FFFFFF')
            : (defaults[partId] || 'FFFFFF');
        if (partId === 'eye') {
            this.eyeColor = def; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor);
        } else {
            this.currentColors[partId] = def;
        }
        this.updateAllInputs(); this.onColorsChanged();
        this.showToast(`已重置「${partId}」为默认 TMC 色 ${def}`);
    }

    /**
     * 导出烘焙贴图 (Pattern + TMC 部位着色, 不含渗线/法线), 触发 PNG 下载
     */
    exportBakedTexture() {
        if (!this.preview) { this.showToast('预览器尚未就绪'); return; }
        const fname = `${this.currentDino}_${this.currentPattern || 'Pattern_1'}_baked.png`;
        if (this.preview.exportBakedTexturePNG(fname)) {
            this.showToast(`已导出烘焙贴图: ${fname}`);
        } else {
            this.showToast('导出失败: 贴图尚未就绪，请等待模型加载完成');
        }
    }

    /**
     * 颜色对象批量 sRGB → 线性 (CNRE 线性码导出前自动转换; 编辑器颜色始终按 sRGB 处理)
     * @param {Object} colors - { partId: hex }
     */
    colorsSrgbToLinear(colors) {
        const out = {};
        for (const [k, hex] of Object.entries(colors)) {
            out[k] = GradGen.validateHex(hex) ? GradGen.srgbHexToLinearHex(hex) : hex;
        }
        return out;
    }

    /**
     * 颜色对象批量 线性 → sRGB (CNRE 线性码导入后转回编辑器空间)
     */
    colorsLinearToSrgb(colors) {
        const out = {};
        for (const [k, hex] of Object.entries(colors)) {
            out[k] = GradGen.validateHex(hex) ? GradGen.linearHexToSrgbHex(hex) : hex;
        }
        return out;
    }

    /** 单个 hex: sRGB → 线性 (CNRE 导出用, 用于 eyeColor) */
    hexSrgbToLinear(hex) {
        return GradGen.validateHex(hex) ? GradGen.srgbHexToLinearHex(hex) : hex;
    }

    /** 单个 hex: 线性 → sRGB (CNRE 导入用, 用于 eyeColor) */
    hexLinearToSrgb(hex) {
        return GradGen.validateHex(hex) ? GradGen.linearHexToSrgbHex(hex) : hex;
    }

    convertColorSpace(direction) {
        const convertFn = direction === 'srgbToLinear' ? GradGen.srgbHexToLinearHex : GradGen.linearHexToSrgbHex;
        // 转换所有部位颜色
        COLOR_PARTS.forEach(part => {
            const hex = this.currentColors[part.id];
            if (GradGen.validateHex(hex)) {
                this.currentColors[part.id] = convertFn(hex);
            }
        });
        // 转换眼部颜色
        if (GradGen.validateHex(this.eyeColor)) {
            this.eyeColor = convertFn(this.eyeColor);
        }
        this.updateAllInputs();
        this.updateEyeUI();
        this.updateSkinCode();
                this.undoRedo.saveState(this.snapshot());
        if (this.preview) {
            this.preview.forceUpdateColors(this.currentColors);
            this.preview.setEyeColor(this.eyeColor);
        }
        const label = direction === 'srgbToLinear' ? 'sRGB → 线性' : '线性 → sRGB';
        this.showToast(`颜色已转换为 ${label}`);
        this.savePreferences();
    }

    updateColorSpaceLabel() {
        // 标签已移除，保留空方法避免潜在调用报错
    }
    randomGradient() { const h1 = GradGen.randomHex(); const h2 = GradGen.randomHex(); const steps = COLOR_PARTS.length; const colors = GradGen.generateGradient(h1, h2, steps); this.applyColorArray(colors); this.showToast('随机渐变配色'); }
    randomHueShift() { const colors = GradGen.generateRandomHueShift(COLOR_PARTS.length); this.applyColorArray(colors); this.showToast('色相偏移配色'); }

    bindEvents() {
        const safeBind = (id, event, handler) => { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); };

        this.el.patternTypeSelect.addEventListener('change', (e) => {
            // ★★★ 下拉框的值现在已经是 "Pattern_QWERT" 这种标准格式，直接接收 ★★★
            this.currentPattern = e.target.value;
            // 切换皮肤时若旧皮肤被手动解锁了 special，重置为该皮肤的 hasSpecial
            this._specialForced = getPatternHasSpecial(this.currentDino, this.currentPattern) ? true : false;
            this.buildColorInputs();          // 按新皮肤重建颜色行 (special 行可见性随 hasSpecial)
            this.refreshSpecialState();
            this.renderOfficialSchemeSelect();
            this.updateSkinCode();
            this.loadPreviewModel();
            this.savePreferences();
        });
        
        this.el.patternScaleSelect.addEventListener('change', (e) => {
            this.currentPatternScale = e.target.value;
            this.currentVar = { 'fine': 0.0, 'medium': 0.5, 'coarse': 1.0 }[e.target.value] ?? 0.5;
            this.skinVariation = SCALE_TO_CNRE_VAR[this.currentPatternScale] ?? 8; // 同步 CNRE 纹理粗细字段
            if (this.el.varSlider) this.el.varSlider.value = this.currentVar;
            this.updateVarDisplay();
            this.updateSkinCode();
            this.savePreferences();
        });

        this.el.varSlider?.addEventListener('input', (e) => {
            this.currentVar = parseFloat(e.target.value);
            this.currentPatternScale = this.currentVar >= 0.67 ? 'coarse' : (this.currentVar >= 0.34 ? 'medium' : 'fine');
            this.skinVariation = SCALE_TO_CNRE_VAR[this.currentPatternScale] ?? 8; // 同步 CNRE 纹理粗细字段
            if (this.el.patternScaleSelect) this.el.patternScaleSelect.value = this.currentPatternScale;
            this.updateVarDisplay();
            this.updateSkinCode();
        });
        this.el.varSlider?.addEventListener('change', () => { this.savePreferences(); });
        
        this.el.genderMaleBtn.addEventListener('click', () => { if (this.isFemale) { this.isFemale = false; this.updateGenderUI(); if (this.preview) this.preview.updateColors(this.currentColors); } });
        this.el.genderFemaleBtn.addEventListener('click', () => { if (!this.isFemale) { this.isFemale = true; this.updateGenderUI(); if (this.preview) this.preview.updateColors(this.currentColors); } });
        
        
        // 年龄段滑块
        if (this.el.ageStageSlider) {
            this.el.ageStageSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.updateAgeStageLabel(val);
                if (this.preview) this.preview.setAgeStage(val, this.currentDino);
            });
            this.el.ageStageSlider.addEventListener('change', () => this.savePreferences());
        }

        // 官方配色下拉 (v0.5.9.16)：通用配色保持当前图案；图案专属配色才切图案；归档配色仅套色
        this.el.officialSchemeSelect?.addEventListener('change', (e) => {
            const flat = this._officialSchemesFlat;
            if (!flat) return;
            const idx = parseInt(e.target.value, 10);
            const entry = flat[idx];
            if (!entry) return;
            const data = DINOSAUR_DATA[this.currentDino];
            const prevPattern = this.currentPattern;
            // 图案专属配色 → 贴图已导入才切图案（Pattern_ 前缀是下拉 option value 的格式）
            if (entry.patternId) {
                const hasTex = (DINOSAUR_DATA[this.currentDino]?.patterns || []).includes(entry.patternId);
                if (hasTex) {
                    const v = `Pattern_${entry.patternId}`;
                    if (v !== this.currentPattern) {
                        this.currentPattern = v;
                        if (this.el.patternTypeSelect) this.el.patternTypeSelect.value = v;
                    }
                } else {
                    this.showToast(`图案 ${entry.patternId} 贴图尚未导入：已仅应用配色，图案保持不变`, 2600);
                }
            }
            // 官方配色 = 整套替换：清掉旧故障通道
            this.glitchChannels = {};
            this.glitchBackup = {};
            this.glitchMode = {};
            // 以恐龙默认色兜底, 再覆盖官方配色 (配色可能只声明部分通道)
            this.currentColors = this.mergeImportedColors({ ...(data?.colors || {}), ...entry.scheme.colors });
            if (entry.scheme.eyeColor && !this.isLocked('eye')) { this.eyeColor = entry.scheme.eyeColor; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor); }
            this.buildColorInputs(); this.refreshSpecialState();
            this.updateAllInputs(); this.updateSkinCode(); this.onColorsChanged();
            if (prevPattern !== this.currentPattern && this.preview) this.loadPreviewModel();
        });
        
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetToCurrentSkinDefault());
        document.getElementById('refreshModelBtn')?.addEventListener('click', () => { if (this.preview) { this.preview.forceUpdateColors(this.currentColors); this.preview.setEyeColor(this.eyeColor); this.preview.onResize(); this.showToast('模型已刷新'); } else { this.showToast('模型未加载'); } });
        document.getElementById('savePresetBtn')?.addEventListener('click', () => { const name = this.el.presetNameInput.value.trim(); const result = addPreset(name, this.currentColors, { eyeColor: this.eyeColor, glitchChannels: this.glitchChannels }); if (result.success) { this.renderPresets(); this.el.presetNameInput.value = ''; this.showToast('预设已保存'); } else { this.showToast(result.message); } });
        // 清空所有用户数据（预设 + 历史 + 偏好 isle_prefs_v1 + 自定义主题 + 配色延续）
        const clearAllConfirm = document.getElementById('clearAllDataConfirm');
        const showClearAllConfirm = (show) => { if (clearAllConfirm) clearAllConfirm.style.display = show ? 'flex' : 'none'; };
        document.getElementById('clearAllDataBtn')?.addEventListener('click', () => {
            const hasData = !!localStorage.getItem(PREF_KEY) || !!localStorage.getItem(HISTORY_KEY) || getPresets().length > 0 || !!localStorage.getItem('theme');
            if (!hasData) { this.showToast('没有可清空的本地数据'); return; }
            showClearAllConfirm(true);
        });
        document.getElementById('cancelClearAllDataBtn')?.addEventListener('click', () => { showClearAllConfirm(false); });
        document.getElementById('confirmClearAllDataBtn')?.addEventListener('click', () => {
            try {
                localStorage.removeItem(PREF_KEY);
                localStorage.removeItem(HISTORY_KEY);
                localStorage.removeItem('theme');
                clearAllPresets();
            } catch {}
            showClearAllConfirm(false);
            this.showToast('已清空所有本地用户数据，正在恢复默认…');
            setTimeout(() => location.reload(), 600);
        });
        // 清空自定义配色数据（预设 + 历史，保留偏好与主题）— v0.5.9.46
        const clearPresetsConfirm = document.getElementById('clearPresetsConfirm');
        const showPresetsConfirm = (s) => { if (clearPresetsConfirm) clearPresetsConfirm.style.display = s ? 'flex' : 'none'; };
        document.getElementById('clearPresetsDataBtn')?.addEventListener('click', () => {
            if (getPresets().length === 0 && this.colorHistory.length === 0) { this.showToast('没有可清空的配色数据'); return; }
            showPresetsConfirm(true);
        });
        document.getElementById('cancelClearPresetsDataBtn')?.addEventListener('click', () => showPresetsConfirm(false));
        document.getElementById('confirmClearPresetsDataBtn')?.addEventListener('click', () => {
            clearAllPresets();
            this.colorHistory = []; this.saveHistory(); this.renderHistory();
            showPresetsConfirm(false);
            this.showToast('已清空自定义配色数据');
        });
        // 清空用户偏好（恐龙 / 纹理 / 面板宽度等，保留主题与配色）— v0.5.9.46
        const clearPrefsConfirm = document.getElementById('clearPrefsConfirm');
        const showPrefsConfirm = (s) => { if (clearPrefsConfirm) clearPrefsConfirm.style.display = s ? 'flex' : 'none'; };
        document.getElementById('clearPrefsBtn')?.addEventListener('click', () => {
            if (!localStorage.getItem(PREF_KEY)) { this.showToast('没有可清空的偏好'); return; }
            showPrefsConfirm(true);
        });
        document.getElementById('cancelClearPrefsBtn')?.addEventListener('click', () => showPrefsConfirm(false));
        document.getElementById('confirmClearPrefsBtn')?.addEventListener('click', () => {
            try { localStorage.removeItem(PREF_KEY); } catch {}
            showPrefsConfirm(false);
            this.showToast('已清空用户偏好，正在恢复默认…');
            setTimeout(() => location.reload(), 600);
        });
        // 动画速度滑块（v0.5.9.46）— 写入 preview 并触发热保存
        const animSpeedSlider = document.getElementById('animSpeedSlider');
        const animSpeedValue = document.getElementById('animSpeedValue');
        if (animSpeedSlider) {
            animSpeedSlider.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                if (this.preview) this.preview.setTimeScale(v);
                if (animSpeedValue) animSpeedValue.textContent = v.toFixed(1) + 'x';
            });
        }
        document.getElementById('togglePresetsBtn')?.addEventListener('click', () => this.togglePresets());
        if (this.el.presetSearchInput) {
            this.el.presetSearchInput.addEventListener('input', (e) => { this.presetFilter.term = e.target.value; this.renderPresets(); });
        }
        if (this.el.presetGlitchFilter) {
            this.el.presetGlitchFilter.addEventListener('change', (e) => { this.presetFilter.glitchOnly = e.target.checked; this.renderPresets(); });
        }
        this.initPresetResize();
        document.querySelectorAll('.code-collapse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { const section = btn.dataset.collapse; if (section) this.toggleCodeCollapse(section); e.stopPropagation(); });
        });
        // 恢复代码区域折叠状态
        this.syncCodeCollapses();
        document.getElementById('importCodeBtn')?.addEventListener('click', () => { const code = this.el.importCodeInput.value.trim(); if (code) this.importSkinCode(code); });
        this.el.importCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const code = this.el.importCodeInput.value.trim(); if (code) this.importSkinCode(code); } });
        document.getElementById('generateGradientBtn')?.addEventListener('click', () => { const h1 = normalizeHex(document.getElementById('gradHex1')?.value || ''); const h2 = normalizeHex(document.getElementById('gradHex2')?.value || ''); const steps = parseInt(document.getElementById('gradSteps')?.value) || 5; if (GradGen.validateHex(h1) && GradGen.validateHex(h2)) { this.generateGradientDisplay(GradGen.generateGradient(h1, h2, Math.max(2, Math.min(32, steps))), this.el.twoColorGradientResults); } });
        document.getElementById('copyCodeBtn')?.addEventListener('click', () => { this.copyToClipboard(this.el.skinCodeDisplay.textContent); });
        this.el.skinCodeDisplay.addEventListener('click', () => { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(this.el.skinCodeDisplay); selection.removeAllRanges(); selection.addRange(range); });
        document.getElementById('copyCnreBtn')?.addEventListener('click', () => { this.copyToClipboard(this.el.cnreCodeDisplay.textContent); });
        this.el.cnreCodeDisplay?.addEventListener('click', () => { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(this.el.cnreCodeDisplay); selection.removeAllRanges(); selection.addRange(range); });
        document.getElementById('copyNyorBtn')?.addEventListener('click', () => { this.copyToClipboard(this.el.nyorCodeDisplay.textContent); });
        document.getElementById('copyToolBtn')?.addEventListener('click', () => { this.copyToClipboard(this.el.toolCodeDisplay.textContent); });
        this.el.nyorCodeDisplay?.addEventListener('click', () => { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(this.el.nyorCodeDisplay); selection.removeAllRanges(); selection.addRange(range); });
        document.getElementById('exportBakedBtn')?.addEventListener('click', () => this.exportBakedTexture());
        
        const themeBtn = document.getElementById('themeToggleBtn'); if (themeBtn) { themeBtn.addEventListener('click', () => { this.themeManager.toggle(); this.updateThemeIcon(); }); }

        // 设置面板：齿轮开关悬浮浮层，带黑色半透明遮罩；外部点击 / Esc / 关闭按钮 / 点击遮罩 关闭（v0.5.9.46）
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const settingsBackdrop = document.getElementById('settingsBackdrop');
        const settingsCloseBtn = document.getElementById('settingsCloseBtn');
        const openSettings = () => {
            // 神秘小功能：按已解锁状态显示对应入口
            const msRow = document.getElementById('mysteryRow');
            if (msRow) msRow.style.display = this.mysteryUnlocked ? 'flex' : 'none';
            if (settingsPanel) settingsPanel.style.display = 'flex';
            if (settingsBackdrop) settingsBackdrop.style.display = 'block';
        };
        const closeSettings = () => {
            if (settingsPanel) settingsPanel.style.display = 'none';
            if (settingsBackdrop) settingsBackdrop.style.display = 'none';
        };
        if (settingsBtn && settingsPanel) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                settingsPanel.style.display === 'flex' ? closeSettings() : openSettings();
            });
            if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); closeSettings(); });
            if (settingsBackdrop) settingsBackdrop.addEventListener('click', (e) => { e.stopPropagation(); closeSettings(); });
            document.addEventListener('click', (e) => {
                if (settingsPanel.style.display === 'flex' && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target) && !(settingsBackdrop && settingsBackdrop.contains(e.target))) {
                    closeSettings();
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && settingsPanel.style.display === 'flex') closeSettings();
            });
        }
        // 神秘小功能：标题连点 5 次 / 10 次解锁
        const appTitle = document.getElementById('appTitle');
        if (appTitle) appTitle.addEventListener('click', () => this.onTitleClick());

        // 材质微调（标题连点 5 次解锁；解锁后「启用」开关在设置行，分部位滑块在对应颜色区域下方）
        this.applyMaterialTuningVisibility();

        // CNRE 皮肤 dev 原始通道编辑器：URL 含 ://CNREskindevtoggle 亦可解锁（无需连点 10 次）
        if (location.href.indexOf('CNREskindevtoggle') !== -1) this.cnreSkinDevUnlocked = true;
        this.applyDevRawVisibility();
        this._syncCnreDevRawToggle();
        document.getElementById('mtResetBtn')?.addEventListener('click', () => {
            if (this.preview) { this.preview.resetPartRoughMetal(); this.preview.resetPartEmission(); this.preview.setGlobalEmission(1.0); }
            this._syncMaterialTuningUI();
        });
        // 设置行三个「启用」开关：点击切换该通道的微调（开启后对应颜色区域下方才显示分部位滑块）
        const smoothnessToggleBtn = document.getElementById('smoothnessToggleBtn');
        if (smoothnessToggleBtn) smoothnessToggleBtn.addEventListener('click', () => this.setSmoothnessTuningEnabled(!this.smoothnessTuningEnabled));
        const metalnessToggleBtn = document.getElementById('metalnessToggleBtn');
        if (metalnessToggleBtn) metalnessToggleBtn.addEventListener('click', () => this.setMetalnessTuningEnabled(!this.metalnessTuningEnabled));
        const emissionToggleBtn = document.getElementById('emissionToggleBtn');
        if (emissionToggleBtn) emissionToggleBtn.addEventListener('click', () => this.setEmissionTuningEnabled(!this.emissionTuningEnabled));
        // CNRE 皮肤 dev 原始通道编辑器：设置面板里直接开关（与标题连点 10 次 / URL 解锁等价）
        const cnreDevRawToggleBtn = document.getElementById('cnreDevRawToggleBtn');
        if (cnreDevRawToggleBtn) cnreDevRawToggleBtn.addEventListener('click', () => this.setCnreSkinDevUnlocked(!this.cnreSkinDevUnlocked));
        const colorGrid = this.el.colorGrid;
        if (colorGrid) colorGrid.addEventListener('input', (e) => {
            const t = e.target;
            if (!t.classList.contains('mt-channel-row') && !(t.dataset && t.dataset.part && t.dataset.kind)) return;
            if (t.type !== 'range') return;
            const part = t.dataset.part, kind = t.dataset.kind, val = parseFloat(t.value);
            if (!this.preview) return;
            if (kind === 'smooth') {
                const s = this.preview.getPartRoughMetalSettings();
                this.preview.setPartRoughMetal(part, 1 - val, s.metalness[part]);
                const vEl = document.getElementById('mt_smooth_val_' + part); if (vEl) vEl.textContent = val.toFixed(2);
            } else if (kind === 'metal') {
                const s = this.preview.getPartRoughMetalSettings();
                this.preview.setPartRoughMetal(part, s.roughness[part], val);
                const vEl = document.getElementById('mt_metal_val_' + part); if (vEl) vEl.textContent = val.toFixed(2);
            } else if (kind === 'emit') {
                this.preview.setPartEmission(part, val);
                const vEl = document.getElementById('mt_emit_val_' + part); if (vEl) vEl.textContent = val.toFixed(2);
            }
        });

        // devcode 神秘按钮（标题连点 10 次解锁）
        document.getElementById('applyDevcodeBtn')?.addEventListener('click', () => this.applyDevcode());

        const qualitySelect = document.getElementById('qualitySelect'); if (qualitySelect) { qualitySelect.addEventListener('change', (e) => { if (this.preview) this.preview.setQuality(e.target.value); }); }
        document.getElementById('randomAllPartsBtn')?.addEventListener('click', () => this.randomAllParts());
        document.getElementById('randomGlitchNegBtn')?.addEventListener('click', () => this.generateGlitch('neg', 'random'));
        document.getElementById('randomGlitchPosBtn')?.addEventListener('click', () => this.generateGlitch('pos', 'random'));
        document.getElementById('glitchAllNegBtn')?.addEventListener('click', () => this.generateGlitch('neg', 'all'));
        document.getElementById('glitchAllPosBtn')?.addEventListener('click', () => this.generateGlitch('pos', 'all'));
        document.getElementById('randomGlitchFluorBtn')?.addEventListener('click', () => this.generateGlitch('fluor', 'random'));
        document.getElementById('glitchAllFluorBtn')?.addEventListener('click', () => this.generateGlitch('fluor', 'all'));
        document.getElementById('randomGlitchInvBtn')?.addEventListener('click', () => this.generateGlitch('invfluor', 'random'));
        document.getElementById('glitchAllInvBtn')?.addEventListener('click', () => this.generateGlitch('invfluor', 'all'));
        document.getElementById('glitchClearAllBtn')?.addEventListener('click', () => this.clearAllGlitch());
        document.getElementById('srgbToLinearBtn')?.addEventListener('click', () => this.convertColorSpace('srgbToLinear'));
        document.getElementById('linearToSrgbBtn')?.addEventListener('click', () => this.convertColorSpace('linearToSrgb'));
        document.getElementById('randomSolidBtn')?.addEventListener('click', () => this.randomSolid());
        document.getElementById('invertColorsBtn')?.addEventListener('click', () => this.invertColors());
        // 反色工具（v0.5.9.46+）：选部位 + 源色（swatch+HEX） → 生成互补色 → 应用
        // 反色工具（v0.5.9.46+）：源色（swatch+HEX） → 生成互补色 → 应用
        const invertHexInput = document.getElementById('invertHexInput');
        const invertColorPicker = document.getElementById('invertColorPicker');
        const invertGenBtn = document.getElementById('invertGenBtn');
        const invertApplyBtn = document.getElementById('invertApplyBtn');
        this.syncInvertTargetLabel();
        if (invertHexInput) {
            // 文本框与颜色选择器双向同步（复用颜色编辑区行为）
            const syncPickerFromText = () => {
                const hex = normalizeHex(invertHexInput.value || '');
                if (invertColorPicker && isValidColorHex(hex)) invertColorPicker.value = '#' + hex;
            };
            invertHexInput.addEventListener('input', () => { invertHexInput.value = formatHexInput(invertHexInput.value); syncPickerFromText(); });
            if (invertColorPicker) {
                invertColorPicker.addEventListener('input', (e) => {
                    invertHexInput.value = e.target.value.toUpperCase();
                });
            }
            // 拖放：兼容历史/预设色板拖入的 JSON 或纯 HEX（源色行任意元素可接收）
            const acceptDrop = (e) => {
                e.preventDefault();
                const txt = (e.dataTransfer.getData('text/plain') || '').trim();
                if (!txt) return;
                let hex = txt;
                if (txt.startsWith('{') && txt.includes('"hex"')) {
                    try { const obj = JSON.parse(txt); if (obj && obj.hex) hex = obj.hex; } catch {}
                }
                hex = normalizeHex(hex);
                if (isValidColorHex(hex)) {
                    invertHexInput.value = '#' + hex.toUpperCase();
                    if (invertColorPicker) invertColorPicker.value = '#' + hex;
                } else {
                    this.showToast('拖入的不是有效颜色');
                }
            };
            const targets = [invertHexInput, invertColorPicker].filter(Boolean);
            targets.forEach(el => {
                el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-target'); });
                el.addEventListener('dragleave', () => { el.classList.remove('drag-target'); });
                el.addEventListener('drop', (e) => { el.classList.remove('drag-target'); acceptDrop(e); });
            });
        }
        if (invertGenBtn && invertHexInput) {
            const doGen = () => {
                const part = this.invertTargetPart || 'body';
                const pair = this.generateInvertForPart(part, invertHexInput.value);
                if (pair) this.showInvertResult(part, pair);
            };
            invertGenBtn.addEventListener('click', doGen);
            invertHexInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doGen(); });
            if (invertColorPicker) invertColorPicker.addEventListener('change', () => { invertHexInput.value = invertColorPicker.value.toUpperCase(); doGen(); });
        }
        document.getElementById('randomGradientBtn')?.addEventListener('click', () => this.randomGradient());
        document.getElementById('randomHueShiftBtn')?.addEventListener('click', () => this.randomHueShift());
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => { this.colorHistory = []; this.saveHistory(); this.renderHistory(); this.showToast('历史已清空'); });
        
        // 撤销/重做不在这里绑定 —— createUndoRedoUI() 每次重建按钮时会挂上监听。
        // 若在此处再 safeBind 一次，按钮上会有两个 listener，点一下退两步（历史 bug）。

        document.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement?.tagName;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); document.getElementById('undoBtn')?.click(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); document.getElementById('redoBtn')?.click(); }
            if (e.key === 'h' || e.key === 'H') {
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') { e.preventDefault(); this.toggleUI(); }
            }
            if (e.key === 'r' || e.key === 'R') {
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') { e.preventDefault(); document.getElementById('refreshModelBtn')?.click(); }
            }
            if (e.key === 'Escape') { this.closeMobilePanels(); }
            // 年龄段 morph：仅当无输入框焦点时
            if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
                // 叫声按键 1/2/3/4/F
                if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
                    e.preventDefault();
                    if (this.preview && this.preview.hasAnimData()) {
                        this.preview.playVocal('Digit' + e.key);
                    }
                }
                if (e.key === 'f' || e.key === 'F') {
                    e.preventDefault();
                    if (this.preview && this.preview.hasAnimData()) {
                        this.preview.playVocal('KeyF');
                    }
                }
            }
        });


        const uiToggleBtn = document.getElementById('uiToggleBtn');
        if (uiToggleBtn) uiToggleBtn.addEventListener('click', () => this.toggleUI());
        const uiToggleBtnFloating = document.getElementById('uiToggleBtnFloating');
        if (uiToggleBtnFloating) uiToggleBtnFloating.addEventListener('click', () => this.toggleUI());

        // ===== 移动端面板切换 =====
        document.getElementById('leftPanelToggle')?.addEventListener('click', () => this.toggleMobilePanel('left'));
        document.getElementById('rightPanelToggle')?.addEventListener('click', () => this.toggleMobilePanel('right'));
        document.getElementById('panel-backdrop')?.addEventListener('click', () => this.closeMobilePanels());

        // 切回桌面时自动关闭移动端面板
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) this.closeMobilePanels();
        });

        // 隐藏 UI 时，左键双击页面任意位置重新显示 UI
        document.addEventListener('dblclick', (e) => {
            if (this.uiHidden && e.button === 0) this.toggleUI();
        });

        // ===== 调色板选项卡切换 =====
        document.querySelectorAll('.palette-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                document.querySelectorAll('.palette-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target));
                document.querySelectorAll('.palette-tab-panel').forEach(p => p.classList.toggle('active', p.id === (target === 'twoColor' ? 'twoColorPanel' : 'advancedPanel')));
                if (target === 'advanced') this.generateAdvancedPaletteAction();
            });
        });

        // ===== 高级调色板 =====
        safeBind('generateAdvancedPaletteBtn', 'click', () => this.generateAdvancedPaletteAction());

        // 滑块实时更新数值显示 + 防抖生成
        const advSliders = [
            { id: 'advancedHueShift', valId: 'advancedHueShiftValue', fmt: v => v + '°', integer: true },
            { id: 'advancedBrightnessRange', valId: 'advancedBrightnessRangeValue', fmt: v => parseFloat(v).toFixed(2) },
            { id: 'advancedOffset', valId: 'advancedOffsetValue', fmt: v => parseFloat(v).toFixed(2) },
            { id: 'advancedSaturation', valId: 'advancedSaturationValue', fmt: v => parseFloat(v).toFixed(2) },
        ];
        let advDebounce;
        advSliders.forEach(({ id, valId, fmt }) => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(valId);
            if (!el) return;
            el.addEventListener('input', () => {
                if (valEl) valEl.textContent = fmt(el.value);
                clearTimeout(advDebounce);
                advDebounce = setTimeout(() => this.generateAdvancedPaletteAction(), 40);
            });
        });
        // 颜色数量数字输入也实时生成
        const advCountEl = document.getElementById('advancedCount');
        if (advCountEl) {
            advCountEl.addEventListener('input', () => {
                clearTimeout(advDebounce);
                advDebounce = setTimeout(() => this.generateAdvancedPaletteAction(), 40);
            });
        }
    }

    toggleUI() {
        this.uiHidden = !this.uiHidden;
        document.getElementById('app-container')?.classList.toggle('ui-hidden', this.uiHidden);
        if (this.uiHidden) this.closeMobilePanels();
        const eyeIcon = '<i class="icon ico-eye sz18"></i>';
        const eyeOffIcon = '<i class="icon ico-eye-off sz18"></i>';
        const syncBtn = (btn) => {
            if (!btn) return;
            btn.innerHTML = this.uiHidden ? eyeOffIcon : eyeIcon;
            btn.title = this.uiHidden ? '显示 UI (H)' : '隐藏 UI (H)';
            btn.classList.toggle('active', this.uiHidden);
        };
        syncBtn(document.getElementById('uiToggleBtn'));
        syncBtn(document.getElementById('uiToggleBtnFloating'));
        requestAnimationFrame(() => {
            if (this.preview) this.preview.onResize();
        });
    }

    toggleMobilePanel(side) {
        const panel = document.getElementById(side === 'left' ? 'left-panel' : 'right-panel');
        const toggleBtn = document.getElementById(side === 'left' ? 'leftPanelToggle' : 'rightPanelToggle');
        const backdrop = document.getElementById('panel-backdrop');
        const otherPanel = document.getElementById(side === 'left' ? 'right-panel' : 'left-panel');
        const otherBtn = document.getElementById(side === 'left' ? 'rightPanelToggle' : 'leftPanelToggle');

        if (!panel) return;
        const isOpen = panel.classList.contains('mobile-open');

        // Close the other panel first
        otherPanel?.classList.remove('mobile-open');
        otherBtn?.classList.remove('active');

        if (isOpen) {
            panel.classList.remove('mobile-open');
            toggleBtn?.classList.remove('active');
            backdrop?.classList.remove('active');
        } else {
            panel.classList.add('mobile-open');
            toggleBtn?.classList.add('active');
            backdrop?.classList.add('active');
        }
    }

    closeMobilePanels() {
        document.getElementById('left-panel')?.classList.remove('mobile-open');
        document.getElementById('right-panel')?.classList.remove('mobile-open');
        document.getElementById('leftPanelToggle')?.classList.remove('active');
        document.getElementById('rightPanelToggle')?.classList.remove('active');
        document.getElementById('panel-backdrop')?.classList.remove('active');
    }

    updateThemeIcon() {
        const theme = this.themeManager.getEffectiveTheme();
        const themeBtn = document.getElementById('themeToggleBtn');
        const sunIcon = '<i class="icon ico-sun sz16"></i>';
        const moonIcon = '<i class="icon ico-moon sz16"></i>';
        if (themeBtn) {
            themeBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
            themeBtn.title = theme === 'dark' ? '日间模式' : '夜间模式';
        }
    }
}