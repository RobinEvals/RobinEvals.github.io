/**
 * Nyor's Overlay 皮肤码生成器
 *
 * JSON 格式:
 * {
 *   "v": 1,              // 版本号
 *   "c": [               // 10 组颜色，线性空间 0-1 浮点 [r,g,b,a]
 *     [r,g,b,a],         // [0] maleDisplay  雄性展示
 *     [r,g,b,a],         // [1] markings      花纹
 *     [r,g,b,a],         // [2] body          身体
 *     [r,g,b,a],         // [3] flank         侧腹
 *     [r,g,b,a],         // [4] underbelly    肚皮
 *     [r,g,b,a],         // [5] teeth         牙齿
 *     [r,g,b,a],         // [6] mouth         口腔
 *     [r,g,b,a],         // [7] claws         爪子
 *     [r,g,b,a],         // [8] detail/special 细节/特殊区域
 *     [r,g,b,a]          // [9] eyes          眼睛
 *   ],
 *   "p": 0,              // 花纹图案 0=A, 1=B, 2=C...
 *   "var": 1.000,        // 变体 0-1 (1.0=粗糙, 0.5=中等, 0.0=细腻)
 *   "g": 0               // 性别 0=雄, 1=雌
 * }
 *
 * 颜色空间: 线性 RGB，0-1 浮点
 * 与编辑器 sRGB hex 互转时使用标准 sRGB 传递函数
 * 色块顺序与 CNRE 码完全一致
 */

// Nyor overlay 色块顺序 (与 CNRE 相同)
const NYOR_PART_ORDER = [
    'maleDisplay', 'markings', 'body', 'flank',
    'underbelly', 'teeth', 'mouth', 'claws', 'special', 'eye'
];

// teeth/mouth/claws/special 默认色 (当 colors 中没有这些部位时使用)
const NYOR_DEFAULTS = {
    teeth: 'FFFFFF',
    mouth: '7C5859',
    claws: '312E27',
    special: '000000'
};

// patternScale ↔ var 映射
// var=1.0 → coarse(粗糙), var=0.5 → medium(中等), var=0.0 → fine(细腻)
const SCALE_TO_VAR = { 'fine': 0.0, 'medium': 0.5, 'coarse': 1.0 };

function varToScale(v) {
    const digit = Math.round(v * 2);
    return ['fine', 'medium', 'coarse'][Math.max(0, Math.min(2, digit))];
}

// 强制三位小数格式，与 Nyor's overlay 原始格式一致
function f3(v) {
    return v.toFixed(3);
}

// pattern 名称 ↔ 数字索引
// Pattern_1 → 0, Pattern_2 → 1, Pattern_3 → 2 ...
// (旧码兼容: Pattern_A → 0, Pattern_B → 1, Pattern_C → 2 ...)
function patternToIndex(pattern) {
    if (!pattern) return 0;
    const letter = pattern.startsWith('Pattern_') ? pattern.slice(8) : pattern;
    if (letter.length === 1 && /^[A-Z]$/.test(letter)) {
        const idx = letter.charCodeAt(0) - 65;
        if (idx >= 0 && idx <= 25) return idx;
    }
    if (/^\d+$/.test(letter)) {
        const num = parseInt(letter, 10);
        if (num >= 1 && num <= 26) return num - 1;
    }
    return 0;
}

function indexToPattern(index) {
    if (index < 0 || index > 25) index = 0;
    return 'Pattern_' + (index + 1);
}

// ===== sRGB hex ↔ 线性 float 转换 =====

function srgbHexToLinearFloats(hex) {
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [
        r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4),
        g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4),
        b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)
    ];
}

function linearFloatsToSrgbHex(r, g, b) {
    const toSrgb = (c) => {
        const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, s)) * 255);
    };
    return [toSrgb(r), toSrgb(g), toSrgb(b)]
        .map(x => x.toString(16).padStart(2, '0').toUpperCase())
        .join('');
}

// ===== 编码 / 解码 =====

/**
 * 编码为 Nyor's Overlay 皮肤码
 * @param {Object} params
 * @param {boolean} params.isFemale - 是否雌性
 * @param {string} params.pattern - Pattern_1 / Pattern_2 / Pattern_3 ...
 * @param {string} params.patternScale - 'fine' / 'medium' / 'coarse' (当 varValue 未提供时使用)
 * @param {number} [params.varValue] - 连续 var 值 0-1 (优先使用，精确导出)
 * @param {Object} params.colors - 颜色对象 (sRGB hex, 6位无#)
 * @param {string} params.eyeColor - 眼球颜色 hex (6位无#)
 * @returns {string} JSON 字符串 (浮点数强制三位小数)
 */
export function encodeNyorOverlay({ isFemale, pattern, patternCode, patternScale, varValue, colors, eyeColor }) {
    const fullColors = { ...NYOR_DEFAULTS, ...colors };
    fullColors.eye = eyeColor || 'FFFFFF';

    const c = NYOR_PART_ORDER.map(part => {
        const hex = (fullColors[part] || 'FFFFFF').replace('#', '');
        const [r, g, b] = srgbHexToLinearFloats(hex);
        return `[${f3(r)},${f3(g)},${f3(b)},1.000]`;
    }).join(',');

    const varNum = typeof varValue === 'number' ? varValue : (SCALE_TO_VAR[patternScale] ?? 0.5);

    // p 优先用显式 patternCode (数字或字符串); 省略则按旧规则推导
    const pVal = patternCode != null ? patternCode : patternToIndex(pattern);

    return `{"v":1,"c":[${c}],"p":${typeof pVal === 'string' ? JSON.stringify(pVal) : pVal},"var":${f3(varNum)},"g":${isFemale ? 1 : 0}}`;
}

/**
 * 解析 Nyor's Overlay 皮肤码
 * @param {string} code - JSON 字符串
 * @returns {Object} {isFemale, pattern, patternScale, colors, eyeColor} 或 {error}
 */
export function decodeNyorOverlay(code) {
    if (!code || typeof code !== 'string') return { error: '空码' };

    let obj;
    try {
        obj = JSON.parse(code.trim());
    } catch {
        return { error: 'JSON 解析失败，请检查格式' };
    }

    if (typeof obj.v !== 'number' || !Array.isArray(obj.c)) {
        return { error: 'Nyor overlay 码格式错误' };
    }

    if (obj.c.length < 8) {
        return { error: `颜色数据不完整: 需要 10 组, 实际 ${obj.c.length} 组` };
    }

    const colors = {};
    const count = Math.min(obj.c.length, NYOR_PART_ORDER.length);
    for (let i = 0; i < count; i++) {
        const part = NYOR_PART_ORDER[i];
        const [r, g, b] = obj.c[i];
        colors[part] = linearFloatsToSrgbHex(r, g, b);
    }

    const eyeColor = colors.eye || 'FFFFFF';
    delete colors.eye;

    const rawVar = typeof obj.var === 'number' ? obj.var : 0.5;

    return {
        isFemale: obj.g === 1,
        pattern: indexToPattern(obj.p || 0),
        patternScale: varToScale(rawVar),
        varValue: rawVar,
        colors,
        eyeColor
    };
}

/**
 * 判断字符串是否为 Nyor's Overlay 皮肤码
 */
export function isNyorOverlayCode(code) {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    if (!trimmed.startsWith('{')) return false;
    try {
        const obj = JSON.parse(trimmed);
        return typeof obj.v === 'number' && Array.isArray(obj.c) && obj.c.length >= 8;
    } catch {
        return false;
    }
}
