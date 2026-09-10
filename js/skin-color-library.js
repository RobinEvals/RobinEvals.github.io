// 单色偏好库 + 稳定分享码（v0.5.9.80）
// 与整套皮肤预设（skin-preset-manager.js）相互独立：这里只存「单个颜色」，
// 数据模型与拖拽 payload 完全一致：{ hex, label?, glitch?: { channels:{r,g,b}, mode } }
// 这样偏好色天然支持故障色（含 raw 模式的超大数值），套用时复用 drag/drop 的 apply 逻辑。

const COLOR_LIBRARY_KEY = 'isle_color_library_v1';
const MAX_LIBRARY = 200;
const SHARE_PREFIX = 'ISLECOLOR1.';

// ---------- 本地偏好库（localStorage）----------

export function loadLibrary() {
    try { const d = localStorage.getItem(COLOR_LIBRARY_KEY); return d ? JSON.parse(d) : []; }
    catch { return []; }
}

export function saveLibrary(arr) {
    try { localStorage.setItem(COLOR_LIBRARY_KEY, JSON.stringify(arr)); }
    catch (e) { console.warn('偏好色库存储空间不足', e); }
}

/** 新增一个偏好色。entry = { name, hex, label?, display?, glitch? } */
export function addColor(entry) {
    const lib = loadLibrary();
    if (lib.length >= MAX_LIBRARY) lib.pop(); // 超出上限丢弃最旧
    const item = {
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: (entry.name || '未命名').toString().slice(0, 40),
        hex: (entry.hex || '000000').toString().toUpperCase().replace('#', '').slice(0, 6),
        label: (entry.label || '').toString().slice(0, 40),
        display: (entry.display || entry.hex || '000000').toString().toUpperCase().replace('#', '').slice(0, 6),
        glitch: entry.glitch ? JSON.parse(JSON.stringify(entry.glitch)) : null,
        ts: Date.now()
    };
    lib.unshift(item);
    saveLibrary(lib);
    return item;
}

export function removeColor(id) {
    const lib = loadLibrary().filter(x => x.id !== id);
    saveLibrary(lib);
    return lib;
}

export function clearLibrary() { saveLibrary([]); }

/** 重命名偏好色。成功返回 true，失败（未找到）返回 false。 */
export function renameColor(id, newName) {
    const lib = loadLibrary();
    const idx = lib.findIndex(x => x.id === id);
    if (idx < 0) return false;
    lib[idx].name = (newName || lib[idx].name).toString().slice(0, 40);
    saveLibrary(lib);
    return true;
}

// ---------- 稳定分享码（ISLECOLOR1. + base64url，UTF-8 安全）----------

function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

/** 编码单个颜色为可分享字符串。color = { hex, label?, glitch? } */
export function encodeShareColor(color) {
    const obj = {
        v: 1,
        hex: (color.hex || '000000').replace('#', '').toUpperCase(),
        label: color.label || '',
        glitch: color.glitch || null
    };
    return SHARE_PREFIX + b64urlEncode(JSON.stringify(obj));
}

/** 解码分享码；失败返回 null。返回 { hex, label, glitch } */
export function decodeShareColor(code) {
    if (typeof code !== 'string') return null;
    const trimmed = code.trim();
    if (!trimmed.startsWith(SHARE_PREFIX)) return null;
    try {
        const obj = JSON.parse(b64urlDecode(trimmed.slice(SHARE_PREFIX.length)));
        if (!obj || typeof obj.hex !== 'string') return null;
        return {
            hex: obj.hex.replace('#', '').toUpperCase().slice(0, 6),
            label: typeof obj.label === 'string' ? obj.label : '',
            glitch: obj.glitch || null
        };
    } catch { return null; }
}
