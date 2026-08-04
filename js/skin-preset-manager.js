const STORAGE_KEY = 'isle_skin_presets_v3';
const MAX_PRESETS = 100;

export function getPresets() {
    try { const data = localStorage.getItem(STORAGE_KEY); return data ? JSON.parse(data) : []; } catch { return []; }
}

export function savePresets(presets) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(presets)); } catch (e) { console.warn('存储空间不足'); }
}

export function addPreset(name, colors) {
    const presets = getPresets();
    if (presets.length >= MAX_PRESETS) return { success: false, message: '预设已达上限 (100个)' };
    if (!name || name.trim() === '') name = String(presets.length + 1);
    presets.push({ name: name.trim(), colors: { ...colors }, timestamp: Date.now() });
    savePresets(presets);
    return { success: true, presets };
}

export function deletePreset(index) {
    const presets = getPresets();
    if (index >= 0 && index < presets.length) { presets.splice(index, 1); savePresets(presets); }
    return presets;
}

export function loadPreset(index) {
    const presets = getPresets();
    if (index >= 0 && index < presets.length) return { ...presets[index].colors };
    return null;
}

export function clearAllPresets() { savePresets([]); }