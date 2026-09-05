// 工具专属皮肤码 (v0.5.9.58)
// 与官方 CNRE / Nyor Overlay 码不同：本码不记录恐龙种类，导入时也不会自动切换恐龙。
// 它保存每个部位的「基础颜色 + 故障(raw/mode)」以及纹理粗细，用于在本工具内完整还原一套皮肤。
// 覆盖全部 10 个部位：body / underbelly / flank / markings / maleDisplay / special / teeth / mouth / claws / eye。
import { colorKeyToCnreId, cnreIdToColorKey } from './skin-cnre-code-generator.js?v=0.5.9.78';

// 全部部位（UI 键，含眼睛）
const ALL_TOOL_PARTS = ['body', 'underbelly', 'flank', 'markings', 'maleDisplay', 'special', 'teeth', 'mouth', 'claws', 'eye'];

const _r4 = (n) => (typeof n === 'number' ? Math.round(n * 10000) / 10000 : 0);

/**
 * 编码工具专属皮肤码。
 * @param {Object} o
 * @param {string} o.pattern - 图案名 (Pattern_x)
 * @param {string} o.patternScale - 'fine' | 'medium' | 'coarse'
 * @param {number} [o.varValue] - 连续纹理粗细 0~1
 * @param {Object} o.colors - UI 键 → 当前显示 hex（故障部位为故障显示色）
 * @param {Object} o.glitchChannels - CNRE 通道 id → {r,g,b} 越界线性值
 * @param {Object} o.glitchMode - CNRE 通道 id → 'neg'|'pos'|...
 * @param {Object} o.glitchBackup - UI 键 → 故障前基础 hex
 * @param {Object} [o.emission] - { global:number, parts:{partId:number} } 分部位自发光（皮肤码内完整还原）
 */
export function encodeToolSkin({ pattern, patternScale, varValue, colors = {}, glitchChannels = {}, glitchMode = {}, glitchBackup = {}, emission = null }) {
    const parts = {};
    for (const id of ALL_TOOL_PARTS) {
        const cnreId = colorKeyToCnreId(id);
        const glitched = !!glitchChannels[cnreId];
        const base = (glitched ? (glitchBackup[id] || colors[id]) : colors[id]) || '000000';
        const entry = { color: base.toUpperCase() };
        if (glitched) {
            const ch = glitchChannels[cnreId];
            entry.glitch = {
                mode: glitchMode[cnreId] || ((ch.r > 0 || ch.g > 0 || ch.b > 0) ? 'pos' : 'neg'),
                raw: [_r4(ch.r), _r4(ch.g), _r4(ch.b)]
            };
        }
        parts[id] = entry;
    }
    const payload = {
        tool: 1,
        pattern: pattern || null,
        scale: patternScale || 'medium',
        var: (typeof varValue === 'number') ? _r4(varValue) : 0.5,
        parts
    };
    if (emission && typeof emission === 'object') {
        const emParts = {};
        for (const id of ALL_TOOL_PARTS) {
            if (emission.parts && typeof emission.parts[id] === 'number') emParts[id] = _r4(emission.parts[id]);
        }
        payload.emission = {
            global: (typeof emission.global === 'number') ? _r4(Math.max(0, Math.min(2, emission.global))) : 1,
            parts: emParts
        };
    }
    return JSON.stringify(payload);
}

/**
 * 解码工具专属皮肤码。
 * @returns {Object} { pattern, patternScale, varValue, colors, glitchChannels, glitchMode, glitchBackup, emission } 或 {error}
 */
export function decodeToolSkin(str) {
    let obj;
    try { obj = JSON.parse(str); } catch (e) { return { error: '工具专属皮肤码不是合法 JSON' }; }
    if (!obj || obj.tool !== 1) return { error: '不是工具专属皮肤码（缺少 tool 标记）' };
    const parts = obj.parts || {};
    const colors = {};
    const glitchChannels = {};
    const glitchMode = {};
    const glitchBackup = {};
    for (const id of ALL_TOOL_PARTS) {
        const p = parts[id];
        if (!p || typeof p.color !== 'string') continue;
        const cnreId = colorKeyToCnreId(id);
        const base = p.color.toUpperCase();
        colors[id] = base;
        if (p.glitch && Array.isArray(p.glitch.raw) && p.glitch.raw.length === 3) {
            const raw = p.glitch.raw.map(Number);
            if (raw.every(n => typeof n === 'number' && !Number.isNaN(n))) {
                glitchChannels[cnreId] = { r: raw[0], g: raw[1], b: raw[2] };
                glitchMode[cnreId] = p.glitch.mode || ((raw[0] > 0 || raw[1] > 0 || raw[2] > 0) ? 'pos' : 'neg');
                glitchBackup[id] = base;
            }
        }
    }
    // 自发光：全局强度 + 各部位强度
    let emission = null;
    if (obj.emission && typeof obj.emission === 'object') {
        const emParts = {};
        const srcParts = (obj.emission.parts && typeof obj.emission.parts === 'object') ? obj.emission.parts : {};
        for (const id of ALL_TOOL_PARTS) {
            if (typeof srcParts[id] === 'number' && !Number.isNaN(srcParts[id])) emParts[id] = Math.max(0, Math.min(1, srcParts[id]));
        }
        emission = {
            global: (typeof obj.emission.global === 'number') ? Math.max(0, Math.min(2, obj.emission.global)) : 1,
            parts: emParts
        };
    }
    return {
        pattern: (typeof obj.pattern === 'string') ? obj.pattern : null,
        patternScale: (obj.scale === 'fine' || obj.scale === 'coarse') ? obj.scale : 'medium',
        varValue: (typeof obj.var === 'number') ? obj.var : undefined,
        colors, glitchChannels, glitchMode, glitchBackup, emission
    };
}

/** 判断一段文本是否为本工具专属皮肤码（用于导入时分流） */
export function isToolSkinCode(str) {
    if (typeof str !== 'string') return false;
    const t = str.trim();
    if (!t.startsWith('{')) return false;
    try { const o = JSON.parse(t); return !!(o && o.tool === 1); } catch (e) { return false; }
}
