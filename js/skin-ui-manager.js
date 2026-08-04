import { COLOR_PARTS } from './skin-color-parts.js';
import { DINOSAUR_DATA, HANNIBAL_COLORS, DIET_COLORS, DIET_LABELS } from './skin-dino-data.js';
import { generateSkinCode, parseSkinCode, isValidColorHex } from './skin-code-generator.js';
import { encodeCNRE, decodeCNRE, isCNRECode } from './skin-cnre-code-generator.js';
import { encodeNyorOverlay, decodeNyorOverlay, isNyorOverlayCode } from './skin-nyor-overlay.js';
import { UndoRedoManager } from './skin-undo-redo.js';
import { addPreset, deletePreset, loadPreset, getPresets, clearAllPresets } from './skin-preset-manager.js';
import * as GradGen from './skin-gradient-generator.js';
import { ThemeManager } from './skin-theme-manager.js';
import { DinoPreview } from './skin-three-preview.js';

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
export class UIManager {
    constructor() {
        this.currentDino = 'Dilophosaurus';
        this.currentDinoHasSpecial = !!DINOSAUR_DATA['Dilophosaurus'].hasSpecial;
        this.currentColors = { ...DINOSAUR_DATA['Dilophosaurus'].colors };
        // ★★★ 修改：默认值全部带上 Pattern_ 前缀 ★★★
        this.currentPattern = 'Pattern_A'; 
        this.currentPatternScale = 'medium';
        this.currentVar = 0.5; // 连续 var 值 0-1 (Nyor overlay: 1.0=细腻, 0.0=粗糙)
        this.isFemale = false;
        this.undoRedo = new UndoRedoManager();
        this.themeManager = new ThemeManager();
        this.preview = null;
        this.colorHistory = this.loadHistory();
        this.eyeColor = DINOSAUR_DATA['Dilophosaurus'].eyeColor || 'FFFFFF';
        this.currentColorSpace = 'srgb'; // 'srgb' 或 'linear'
        this.presetsCollapsed = false;
        this.uiHidden = false;
        this.pendingPreviewPrefs = null;
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
                this.currentDinoHasSpecial = !!DINOSAUR_DATA[data.dino].hasSpecial;
                this.currentColors = { ...DINOSAUR_DATA[data.dino].colors };
                // 未保存眼色时，使用该恐龙的默认眼色
                if (!data.eyeColor && DINOSAUR_DATA[data.dino].eyeColor) {
                    this.eyeColor = DINOSAUR_DATA[data.dino].eyeColor;
                }
            }
            if (data.pattern) this.currentPattern = data.pattern;
            if (data.patternScale) this.currentPatternScale = data.patternScale;
            if (typeof data.varValue === 'number') this.currentVar = data.varValue;
            if (typeof data.isFemale === 'boolean') this.isFemale = data.isFemale;
            if (data.eyeColor) this.eyeColor = data.eyeColor;
            this.pendingPreviewPrefs = data.preview || null;
        } catch {}
    }

    savePreferences() {
        try {
            const data = {
                dino: this.currentDino,
                pattern: this.currentPattern,
                patternScale: this.currentPatternScale,
                varValue: this.currentVar,
                isFemale: this.isFemale,
                eyeColor: this.eyeColor,
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
        const ids = ['dinosaurSelect', 'patternTypeSelect', 'patternScaleSelect', 'varSlider', 'varValue', 'presetSchemeSelect', 'colorGrid', 'skinCodeDisplay', 'cnreCodeDisplay', 'nyorCodeDisplay', 'solidColorHex', 'gradHex1', 'gradHex2', 'gradSteps', 'twoColorGradientResults', 'presetList', 'presetNameInput', 'importCodeInput', 'genderMaleBtn', 'genderFemaleBtn', 'eyeColorHex', 'qualitySelect'];
        ids.forEach(id => { this.el[id] = document.getElementById(id); });
    }

    init() {
        this.themeManager.init();
        this.themeManager.onThemeChange = (theme) => { if (this.preview) this.preview.updateTheme(theme); this.savePreferences(); };
        this.initDinosaurSelect();
        // 恢复保存的图案和纹理比例
        if (this.el.patternTypeSelect && this.currentPattern) this.el.patternTypeSelect.value = this.currentPattern;
        if (this.el.patternScaleSelect && this.currentPatternScale) this.el.patternScaleSelect.value = this.currentPatternScale;
        if (this.el.varSlider && typeof this.currentVar === 'number') { this.el.varSlider.value = this.currentVar; this.updateVarDisplay(); }
        this.initPresetSchemeSelect();
        this.buildColorInputs();
        this.undoRedo.reset(this.currentColors);
        this.updateSkinCode();
        this.renderPresets();
        this.renderHistory();
        this.bindEvents();
        this.updateThemeIcon();
        this.updateGenderUI();
        setTimeout(() => this.initPreview(), 100);
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
        setTimeout(() => this.loadPreviewModel(), 500);
    }

    async loadPreviewModel() {
        // 尝试加载当前选中的图案。如果不成功，three.js 底层会自动 fallback 到彩色测试纹理
        const success = await this.preview.loadModel(this.currentDino, this.currentPattern);
        if (success) { 
            this.preview.updateColors(this.currentColors); 
            this.preview.setEyeColor(this.eyeColor); 
        }
    }

    initDinosaurSelect() {
        const select = this.el.dinosaurSelect;
        select.innerHTML = '';
        const diets = { herbivore: [], omnivore: [], carnivore: [] };
        
        for (const [key, data] of Object.entries(DINOSAUR_DATA)) {
            const dietType = data.diet || 'herbivore'; 
            if (diets[dietType]) { diets[dietType].push({ key, name: data.name }); }
        }
        
        const dietOrder = ['herbivore', 'omnivore', 'carnivore'];
        for (const diet of dietOrder) {
            const dinos = diets[diet];
            if (dinos.length === 0) continue;
            const optgroup = document.createElement('optgroup');
            optgroup.label = `── ${DIET_LABELS[diet]} ──`;
            dinos.forEach(d => {
                const option = document.createElement('option');
                option.value = d.key;
                option.textContent = '● ' + d.name;
                option.style.color = DIET_COLORS[diet];
                if (d.key === this.currentDino) option.selected = true;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }

        // 初始化时更新图案下拉列表
        this.updatePatternSelect(this.currentDino);
    }

    // ★★★ 核心修改：动态生成图案下拉列表 ★★★
    updatePatternSelect(dinoKey) {
        const select = this.el.patternTypeSelect;
        select.innerHTML = '';
        
        const dinoData = DINOSAUR_DATA[dinoKey];
        if (!dinoData || !dinoData.patterns || dinoData.patterns.length === 0) {
            // 如果没有图案数据，默认回退给三个占位符
            ['A', 'B', 'C'].forEach(key => {
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
        const select = this.el.presetSchemeSelect;
        select.innerHTML = '<option value="">-- 选择预设配色 --</option>';
        const specialGroup = document.createElement('optgroup');
        specialGroup.label = '── 特殊配色 ──';
        const hannibalOpt = document.createElement('option');
        hannibalOpt.value = 'hannibal'; hannibalOpt.textContent = '汉尼拔配色';
        specialGroup.appendChild(hannibalOpt);
        select.appendChild(specialGroup);
        
        const diets = { herbivore: [], omnivore: [], carnivore: [] };
        for (const [key, data] of Object.entries(DINOSAUR_DATA)) {
            const dietType = data.diet || 'herbivore';
            if (diets[dietType]) { diets[dietType].push({ key, name: data.name }); }
        }
        
        for (const [diet, dinos] of Object.entries(diets)) {
            if (dinos.length === 0) continue;
            const optgroup = document.createElement('optgroup');
            optgroup.label = `── ${DIET_LABELS[diet]}恐龙 ──`;
            dinos.forEach(d => {
                const option = document.createElement('option');
                option.value = 'dino_' + d.key; option.textContent = d.name;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
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
        input.style.width = '32px'; input.style.height = '32px'; input.style.padding = '0';
        input.style.border = '2px solid var(--border)'; input.style.borderRadius = '4px';
        input.style.cursor = 'grab'; input.style.background = 'none';
        
        input.addEventListener('dragstart', (e) => {
            const hex = input.getAttribute('data-color');
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'color', hex: hex, part: partId, label: label }));
            e.dataTransfer.effectAllowed = 'copy';
            input.classList.add('dragging');
            const dragPreview = document.getElementById('drag-preview');
            if (dragPreview) { dragPreview.style.backgroundColor = '#' + hex; dragPreview.style.display = 'block'; e.dataTransfer.setDragImage(dragPreview, 12, 12); }
        });
        input.addEventListener('dragend', () => { input.classList.remove('dragging'); document.getElementById('drag-preview').style.display = 'none'; document.querySelectorAll('.drag-target').forEach(el => { el.classList.remove('drag-target'); }); });
        return input;
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
                    if (targetPartId === 'eye') { this.eyeColor = hex; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(hex); this.showToast(`已应用颜色到眼部`); return; }
                    if (targetPartId === 'solid') { this.applySolidColor('#' + hex); return; }
                    if (targetPartId && hex) { this.currentColors[targetPartId] = hex; this.updateAllInputs(); this.onColorsChanged(); this.addToHistory(hex); this.showToast(`已应用颜色到 ${targetLabel || targetPartId}`); }
                }
            } catch (err) { console.warn('拖拽解析失败', err); }
        });
    }

    createColorInputGroup(part, disabled = false) {
        const hexValue = this.currentColors[part.id] || part.defaultHex;
        const group = document.createElement('div');
        group.className = disabled ? 'color-row disabled' : 'color-row';
        group.id = `colorRow_${part.id}`;
        group.style.cursor = disabled ? 'not-allowed' : 'default';

        // 拆分中英文标签
        const parts = part.label.split(' ');
        const cnLabel = parts[0] || part.label;
        const enLabel = parts.slice(1).join(' ') || '';

        const info = document.createElement('div'); info.className = 'color-info';
        const dot = document.createElement('span'); dot.className = 'color-dot'; dot.style.backgroundColor = part.maskColor; info.appendChild(dot);
        const name = document.createElement('span'); name.className = 'color-name';
        name.textContent = cnLabel;
        if (enLabel) { const en = document.createElement('span'); en.className = 'color-en'; en.textContent = enLabel; name.appendChild(en); }
        info.appendChild(name);
        group.appendChild(info);

        const controls = document.createElement('div'); controls.className = 'color-controls';
        const swatch = this.createDraggableSwatch(hexValue, part.id, part.label); controls.appendChild(swatch);
        const hexInput = document.createElement('input'); hexInput.type = 'text'; hexInput.className = 'hex-input'; hexInput.id = `hex_${part.id}`; hexInput.value = '#' + hexValue; hexInput.maxLength = 7;
        if (disabled) {
            swatch.disabled = true;
            swatch.style.cursor = 'not-allowed';
            hexInput.disabled = true;
        }
        controls.appendChild(hexInput);
        group.appendChild(controls);

        if (disabled) return group;
        this.makeDropTarget(group, part.id, part.label);
        let debounceTimer;
        const debouncedUpdate = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => this.onColorsChanged(), 100); };
        swatch.addEventListener('input', (e) => { const hex = normalizeHex(e.target.value); hexInput.value = '#' + hex; this.currentColors[part.id] = hex; swatch.setAttribute('data-color', hex); debouncedUpdate(); });
        swatch.addEventListener('change', (e) => { const hex = normalizeHex(e.target.value); hexInput.value = '#' + hex; this.currentColors[part.id] = hex; swatch.setAttribute('data-color', hex); clearTimeout(debounceTimer); this.onColorsChanged(); });
        hexInput.addEventListener('input', (e) => { e.target.value = formatHexInput(e.target.value); const val = normalizeHex(e.target.value); if (val.length === 6 && isValidColorHex(val)) { this.currentColors[part.id] = val; swatch.value = '#' + val; swatch.setAttribute('data-color', val); debouncedUpdate(); } });
        return group;
    }

    createEyeColorRow() {
        const grid = this.el.colorGrid;
        const group = document.createElement('div');
        group.className = 'color-row eye-row';
        group.id = 'colorRow_eye';

        const info = document.createElement('div'); info.className = 'color-info';
        const dot = document.createElement('span'); dot.className = 'color-dot'; info.appendChild(dot);
        const name = document.createElement('span'); name.className = 'color-name';
        name.textContent = '眼部';
        const en = document.createElement('span'); en.className = 'color-en'; en.textContent = 'Eye'; name.appendChild(en);
        info.appendChild(name);
        group.appendChild(info);

        const controls = document.createElement('div'); controls.className = 'color-controls';
        const swatch = document.createElement('input');
        swatch.type = 'color'; swatch.value = '#' + this.eyeColor; swatch.className = 'draggable-swatch';
        swatch.setAttribute('draggable', 'true'); swatch.setAttribute('data-color', this.eyeColor);
        swatch.setAttribute('data-part', 'eye'); swatch.setAttribute('data-label', '眼部');
        swatch.style.width = '32px'; swatch.style.height = '32px'; swatch.style.padding = '0';
        swatch.style.border = '2px solid var(--border)'; swatch.style.borderRadius = '4px';
        swatch.style.cursor = 'grab'; swatch.style.background = 'none';
        swatch.addEventListener('dragstart', (e) => { const hex = swatch.getAttribute('data-color'); e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'color', hex: hex, part: 'eye', label: '眼部' })); e.dataTransfer.effectAllowed = 'copy'; const preview = document.getElementById('drag-preview'); if (preview) { preview.style.backgroundColor = '#' + hex; preview.style.display = 'block'; e.dataTransfer.setDragImage(preview, 12, 12); } });
        swatch.addEventListener('dragend', () => { document.getElementById('drag-preview').style.display = 'none'; });
        controls.appendChild(swatch);

        const hexInput = document.createElement('input');
        hexInput.type = 'text'; hexInput.className = 'hex-input'; hexInput.id = 'hex_eye';
        hexInput.value = '#' + this.eyeColor; hexInput.maxLength = 7;
        hexInput.addEventListener('input', (e) => {
            e.target.value = formatHexInput(e.target.value);
            const val = normalizeHex(e.target.value);
            if (val.length === 6 && isValidColorHex(val)) { this.eyeColor = val; swatch.value = '#' + val; swatch.setAttribute('data-color', val); if (this.preview) this.preview.setEyeColor(val); }
        });
        hexInput.addEventListener('change', () => this.savePreferences());
        controls.appendChild(hexInput);
        group.appendChild(controls);

        swatch.addEventListener('input', (e) => { const hex = normalizeHex(e.target.value); hexInput.value = '#' + hex; swatch.setAttribute('data-color', hex); this.eyeColor = hex; if (this.preview) this.preview.setEyeColor(hex); this.savePreferences(); });

        this.makeDropTarget(group, 'eye', '眼部');
        grid.appendChild(group);
    }

    updateEyeUI() {
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
        swatch.style.width = '32px'; swatch.style.height = '32px'; swatch.style.padding = '0';
        swatch.style.border = '2px solid var(--border)'; swatch.style.borderRadius = '4px';
        swatch.style.cursor = 'grab'; swatch.style.background = 'none';
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
        const undoBtn = document.createElement('button'); undoBtn.className = 'btn btn-sm'; undoBtn.id = 'undoBtn'; undoBtn.title = '撤销 (Ctrl+Z)'; undoBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:3px;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>撤销'; undoBtn.addEventListener('click', () => { const colors = this.undoRedo.undo(); if (colors) { this.currentColors = colors; this.updateAllInputs(); this.updateSkinCode(); if (this.preview) this.preview.updateColors(colors); } });
        const redoBtn = document.createElement('button'); redoBtn.className = 'btn btn-sm'; redoBtn.id = 'redoBtn'; redoBtn.title = '重做 (Ctrl+Y)'; redoBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:3px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>重做'; redoBtn.addEventListener('click', () => { const colors = this.undoRedo.redo(); if (colors) { this.currentColors = colors; this.updateAllInputs(); this.updateSkinCode(); if (this.preview) this.preview.updateColors(colors); } });
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

    buildColorInputs() {
        const grid = this.el.colorGrid; grid.innerHTML = '';
        COLOR_PARTS.forEach(part => {
            const isDisabled = part.id === 'special' && !this.currentDinoHasSpecial;
            const inputGroup = this.createColorInputGroup(part, isDisabled); grid.appendChild(inputGroup);
        });
        this.createEyeColorRow(); this.createSolidColorUI(); this.createUndoRedoUI(); this.createGradientUI();
    }

    updateGenderUI() {
        const maleBtn = this.el.genderMaleBtn; const femaleBtn = this.el.genderFemaleBtn;
        if (maleBtn && femaleBtn) { maleBtn.classList.toggle('active', !this.isFemale); femaleBtn.classList.toggle('active', this.isFemale); }
        if (this.preview) this.preview.setGender(this.isFemale);
                this.savePreferences();
    }

    onColorsChanged() {
        COLOR_PARTS.forEach(p => this.addToHistory(this.currentColors[p.id]));
        this.updateSkinCode(); this.undoRedo.saveState(this.currentColors);
        if (this.preview) this.preview.updateColors(this.currentColors);
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

    syncVarFromScale() {
        this.currentVar = { 'fine': 1.0, 'medium': 0.5, 'coarse': 0.0 }[this.currentPatternScale] ?? 0.5;
        if (this.el.varSlider) this.el.varSlider.value = this.currentVar;
        this.updateVarDisplay();
    }

    updateSkinCode() {
        const code = generateSkinCode(this.currentDino, this.currentColors, this.currentPattern, this.currentPatternScale);
        if (this.el.skinCodeDisplay) this.el.skinCodeDisplay.textContent = code;
        // CNRE 线性码
        const cnreCode = encodeCNRE({
            isFemale: this.isFemale,
            pattern: this.currentPattern,
            colors: this.currentColors,
            eyeColor: this.eyeColor,
            colorSpace: 'linear'
        });
        if (this.el.cnreCodeDisplay) this.el.cnreCodeDisplay.textContent = cnreCode;
        // Nyor's Overlay 码
        const nyorCode = encodeNyorOverlay({
            isFemale: this.isFemale,
            pattern: this.currentPattern,
            varValue: this.currentVar,
            patternScale: this.currentPatternScale,
            colors: this.currentColors,
            eyeColor: this.eyeColor
        });
        if (this.el.nyorCodeDisplay) this.el.nyorCodeDisplay.textContent = nyorCode;
    }

    switchDinosaur(dinoKey) {
        this.currentDino = dinoKey;
        const newDinoData = DINOSAUR_DATA[dinoKey];
        this.currentDinoHasSpecial = !!(newDinoData && newDinoData.hasSpecial);
        this.buildColorInputs();
        // 切换恐龙时，重置该恐龙的图案下拉列表
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
            this.currentPattern = 'Pattern_A';
            this.el.patternTypeSelect.value = 'Pattern_A';
        }
        
        this.updateSkinCode(); this.undoRedo.saveState(this.currentColors);
        // 切换恐龙时保持用户当前眼部颜色，不再覆盖为恐龙默认眼色
        this.loadPreviewModel();
        this.savePreferences();
    }

    applyPresetColors(colorsObj) { this.currentColors = { ...colorsObj }; this.updateAllInputs(); this.updateSkinCode(); this.undoRedo.saveState(this.currentColors); if (this.preview) this.preview.updateColors(this.currentColors); }
    applySolidColor(hex) { const c = hex.replace('#', '').toUpperCase(); if (isValidColorHex(c)) { COLOR_PARTS.forEach(part => { this.currentColors[part.id] = c; }); this.updateAllInputs(); this.onColorsChanged(); } }
    applyColorArray(arr) { COLOR_PARTS.forEach((part, i) => { if (i < arr.length) this.currentColors[part.id] = arr[i]; }); this.updateAllInputs(); this.onColorsChanged(); }

    importSkinCode(code) {
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
            if (result.eyeColor) { this.eyeColor = result.eyeColor; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor); }
            this.currentColors = { ...this.currentColors, ...result.colors };
            this.updateAllInputs(); this.updateSkinCode(); this.undoRedo.reset(this.currentColors);
            if (this.preview) this.preview.updateColors(this.currentColors);
            this.showToast('Nyor Overlay 码导入成功!');
            return;
        }
        // CNRE 码检测
        if (isCNRECode(code)) {
            const result = decodeCNRE(code);
            if (result.error) { this.showToast(result.error); return; }
            if (result.pattern) { this.currentPattern = result.pattern; this.el.patternTypeSelect.value = this.currentPattern; }
            if (typeof result.isFemale === 'boolean') { this.isFemale = result.isFemale; this.updateGenderUI(); }
            if (result.eyeColor) { this.eyeColor = result.eyeColor; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor); }
            this.currentColors = { ...result.colors };
            this.updateAllInputs(); this.updateSkinCode(); this.undoRedo.reset(this.currentColors);
            this.loadPreviewModel(); if (this.preview) this.preview.updateColors(this.currentColors);
            this.showToast('CNRE 码导入成功!');
            return;
        }
        const result = parseSkinCode(code);
        if (result.error) { this.showToast(result.error); return; }
        if (result.dinoName) { this.currentDino = result.dinoName; this.currentDinoHasSpecial = !!(DINOSAUR_DATA[result.dinoName] && DINOSAUR_DATA[result.dinoName].hasSpecial); this.buildColorInputs(); this.el.dinosaurSelect.value = result.dinoName; this.updatePatternSelect(result.dinoName); }
        if (result.patternType) { 
            // ★★★ 特殊处理：解析出来的是 A/B/C，转成带 Pattern_ 的格式 ★★★
            this.currentPattern = result.patternType.startsWith('Pattern_') ? result.patternType : `Pattern_${result.patternType}`;
            this.el.patternTypeSelect.value = this.currentPattern; 
        }
        if (result.patternScale) { this.currentPatternScale = result.patternScale; this.el.patternScaleSelect.value = result.patternScale; this.syncVarFromScale(); }
        this.currentColors = { ...result.colors }; this.updateAllInputs(); this.updateSkinCode(); this.undoRedo.reset(this.currentColors); this.loadPreviewModel(); if (this.preview) this.preview.updateColors(this.currentColors); this.showToast('皮肤码导入成功!');
    }

    copyToClipboard(text) { if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => this.showToast('已复制!')); } }
    showToast(msg) { const existing = document.querySelector('.toast'); if (existing) existing.remove(); const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = msg; document.body.appendChild(toast); setTimeout(() => toast.remove(), 2000); }

    renderPresets() {
        const presets = getPresets(); const list = this.el.presetList; if (!list) return; list.innerHTML = '';
        if (presets.length === 0) { list.innerHTML = '<span style="color:var(--text-secondary);font-size:0.7rem;">暂无预设</span>'; return; }
        presets.forEach((preset, index) => {
            const bar = document.createElement('div'); bar.className = 'preset-bar';
            const dots = COLOR_PARTS.map(p => `<span class="preset-color-dot" style="background-color:#${preset.colors[p.id] || '000'};"></span>`).join('');
            bar.innerHTML = `<span class="preset-name" title="${preset.name}">${preset.name}</span><span class="preset-colors-preview">${dots}</span><button class="btn btn-sm" data-delete="${index}" style="margin-left:auto; padding:0.15rem 0.35rem; flex-shrink:0;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;
            bar.addEventListener('click', (e) => { if (e.target.dataset.delete !== undefined || e.target.closest('[data-delete]')) { e.stopPropagation(); const btn = e.target.dataset.delete !== undefined ? e.target : e.target.closest('[data-delete]'); deletePreset(parseInt(btn.dataset.delete)); this.renderPresets(); return; } const colors = loadPreset(index); if (colors) { this.applyPresetColors(colors); this.showToast('已加载: ' + preset.name); } });
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
        const btn = document.getElementById('togglePresetsBtn');
        if (list) list.style.display = this.presetsCollapsed ? 'none' : 'block';
        if (btn) btn.innerHTML = this.presetsCollapsed
            ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>'
            : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    }
    randomSolid() { const hex = GradGen.randomHex(); this.applySolidColor('#' + hex); this.showToast('随机纯色: #' + hex); }
    randomAllParts() { COLOR_PARTS.forEach(part => { this.currentColors[part.id] = GradGen.randomHex(); }); this.updateAllInputs(); this.onColorsChanged(); this.showToast('已随机所有部位颜色'); }

    convertColorSpace(direction) {
        const convertFn = direction === 'srgbToLinear' ? GradGen.srgbHexToLinearHex : GradGen.linearHexToSrgbHex;
        const targetSpace = direction === 'srgbToLinear' ? 'linear' : 'srgb';
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
        this.currentColorSpace = targetSpace;
        this.updateAllInputs();
        this.updateEyeUI();
        this.updateSkinCode();
                this.undoRedo.saveState(this.currentColors);
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

        this.el.dinosaurSelect.addEventListener('change', (e) => { this.switchDinosaur(e.target.value); });
        
        this.el.patternTypeSelect.addEventListener('change', (e) => {
            // ★★★ 下拉框的值现在已经是 "Pattern_QWERT" 这种标准格式，直接接收 ★★★
            this.currentPattern = e.target.value; 
            this.updateSkinCode();
                        this.loadPreviewModel();
            this.savePreferences();
        });
        
        this.el.patternScaleSelect.addEventListener('change', (e) => {
            this.currentPatternScale = e.target.value;
            this.currentVar = { 'fine': 1.0, 'medium': 0.5, 'coarse': 0.0 }[e.target.value] ?? 0.5;
            if (this.el.varSlider) this.el.varSlider.value = this.currentVar;
            this.updateVarDisplay();
            this.updateSkinCode();
            this.savePreferences();
        });

        this.el.varSlider?.addEventListener('input', (e) => {
            this.currentVar = parseFloat(e.target.value);
            this.currentPatternScale = this.currentVar >= 0.67 ? 'fine' : (this.currentVar >= 0.34 ? 'medium' : 'coarse');
            if (this.el.patternScaleSelect) this.el.patternScaleSelect.value = this.currentPatternScale;
            this.updateVarDisplay();
            this.updateSkinCode();
        });
        this.el.varSlider?.addEventListener('change', () => { this.savePreferences(); });
        
        this.el.genderMaleBtn.addEventListener('click', () => { if (this.isFemale) { this.isFemale = false; this.updateGenderUI(); if (this.preview) this.preview.updateColors(this.currentColors); } });
        this.el.genderFemaleBtn.addEventListener('click', () => { if (!this.isFemale) { this.isFemale = true; this.updateGenderUI(); if (this.preview) this.preview.updateColors(this.currentColors); } });
        
        document.getElementById('applyPresetSchemeBtn')?.addEventListener('click', () => {
            const scheme = this.el.presetSchemeSelect.value;
            if (scheme === 'hannibal') { this.applyPresetColors(HANNIBAL_COLORS); } 
            else if (scheme.startsWith('dino_')) { const dinoKey = scheme.replace('dino_', ''); const data = DINOSAUR_DATA[dinoKey]; if (data) { this.applyPresetColors(data.colors); if (data.eyeColor) { this.eyeColor = data.eyeColor; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor); } } }
            this.savePreferences();
        });
        
        document.getElementById('resetBtn')?.addEventListener('click', () => { const data = DINOSAUR_DATA[this.currentDino]; if (data) { this.applyPresetColors(data.colors); this.resetGradientUI(); if (data.eyeColor) { this.eyeColor = data.eyeColor; this.updateEyeUI(); if (this.preview) this.preview.setEyeColor(this.eyeColor); } this.savePreferences(); } });
        document.getElementById('refreshModelBtn')?.addEventListener('click', () => { if (this.preview) { this.preview.forceUpdateColors(this.currentColors); this.preview.setEyeColor(this.eyeColor); this.preview.onResize(); this.showToast('模型已刷新'); } else { this.showToast('模型未加载'); } });
        document.getElementById('savePresetBtn')?.addEventListener('click', () => { const name = this.el.presetNameInput.value.trim(); const result = addPreset(name, this.currentColors); if (result.success) { this.renderPresets(); this.el.presetNameInput.value = ''; this.showToast('预设已保存'); } else { this.showToast(result.message); } });
        const clearConfirm = document.getElementById('clearPresetsConfirm');
        const showClearConfirm = (show) => { if (clearConfirm) clearConfirm.style.display = show ? 'flex' : 'none'; };
        document.getElementById('clearPresetsBtn')?.addEventListener('click', () => { if (getPresets().length === 0) return; showClearConfirm(true); });
        document.getElementById('confirmClearPresetsBtn')?.addEventListener('click', () => { clearAllPresets(); this.renderPresets(); showClearConfirm(false); this.showToast('已清空'); });
        document.getElementById('cancelClearPresetsBtn')?.addEventListener('click', () => { showClearConfirm(false); });
        document.getElementById('togglePresetsBtn')?.addEventListener('click', () => this.togglePresets());
        document.getElementById('importCodeBtn')?.addEventListener('click', () => { const code = this.el.importCodeInput.value.trim(); if (code) this.importSkinCode(code); });
        this.el.importCodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const code = this.el.importCodeInput.value.trim(); if (code) this.importSkinCode(code); } });
        document.getElementById('generateGradientBtn')?.addEventListener('click', () => { const h1 = normalizeHex(document.getElementById('gradHex1')?.value || ''); const h2 = normalizeHex(document.getElementById('gradHex2')?.value || ''); const steps = parseInt(document.getElementById('gradSteps')?.value) || 5; if (GradGen.validateHex(h1) && GradGen.validateHex(h2)) { this.generateGradientDisplay(GradGen.generateGradient(h1, h2, Math.max(2, Math.min(32, steps))), this.el.twoColorGradientResults); } });
        document.getElementById('copyCodeBtn')?.addEventListener('click', () => { this.copyToClipboard(this.el.skinCodeDisplay.textContent); });
        this.el.skinCodeDisplay.addEventListener('click', () => { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(this.el.skinCodeDisplay); selection.removeAllRanges(); selection.addRange(range); });
        document.getElementById('copyCnreBtn')?.addEventListener('click', () => { this.copyToClipboard(this.el.cnreCodeDisplay.textContent); });
        this.el.cnreCodeDisplay?.addEventListener('click', () => { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(this.el.cnreCodeDisplay); selection.removeAllRanges(); selection.addRange(range); });
        document.getElementById('copyNyorBtn')?.addEventListener('click', () => { this.copyToClipboard(this.el.nyorCodeDisplay.textContent); });
        this.el.nyorCodeDisplay?.addEventListener('click', () => { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(this.el.nyorCodeDisplay); selection.removeAllRanges(); selection.addRange(range); });
        
        const themeBtn = document.getElementById('themeToggleBtn'); if (themeBtn) { themeBtn.addEventListener('click', () => { this.themeManager.toggle(); this.updateThemeIcon(); }); }
        const qualitySelect = document.getElementById('qualitySelect'); if (qualitySelect) { qualitySelect.addEventListener('change', (e) => { if (this.preview) this.preview.setQuality(e.target.value); }); }
        document.getElementById('randomAllPartsBtn')?.addEventListener('click', () => this.randomAllParts());
        document.getElementById('srgbToLinearBtn')?.addEventListener('click', () => this.convertColorSpace('srgbToLinear'));
        document.getElementById('linearToSrgbBtn')?.addEventListener('click', () => this.convertColorSpace('linearToSrgb'));
        document.getElementById('randomSolidBtn')?.addEventListener('click', () => this.randomSolid());
        document.getElementById('randomGradientBtn')?.addEventListener('click', () => this.randomGradient());
        document.getElementById('randomHueShiftBtn')?.addEventListener('click', () => this.randomHueShift());
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => { this.colorHistory = []; this.saveHistory(); this.renderHistory(); this.showToast('历史已清空'); });
        
        safeBind('undoBtn', 'click', () => { const colors = this.undoRedo.undo(); if (colors) { this.currentColors = colors; this.updateAllInputs(); this.updateSkinCode(); if (this.preview) this.preview.updateColors(colors); } });
        safeBind('redoBtn', 'click', () => { const colors = this.undoRedo.redo(); if (colors) { this.currentColors = colors; this.updateAllInputs(); this.updateSkinCode(); if (this.preview) this.preview.updateColors(colors); } });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); document.getElementById('undoBtn')?.click(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); document.getElementById('redoBtn')?.click(); }
            if (e.key === 'h' || e.key === 'H') {
                const activeTag = document.activeElement?.tagName;
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') { e.preventDefault(); this.toggleUI(); }
            }
            if (e.key === 'r' || e.key === 'R') {
                const activeTag = document.activeElement?.tagName;
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') { e.preventDefault(); document.getElementById('refreshModelBtn')?.click(); }
            }
            if (e.key === 'Escape') { this.closeMobilePanels(); }
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
        const eyeIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        const eyeOffIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
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
        const sunIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>';
        const moonIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        if (themeBtn) {
            themeBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
            themeBtn.title = theme === 'dark' ? '日间模式' : '夜间模式';
        }
    }
}