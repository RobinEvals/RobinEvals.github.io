/**
 * CNRE 社区服务器皮肤码生成器
 *
 * 格式: !skin[性别纹理3位][10 x 色块12位]  —— 整段连写，无空格
 * 色块: RRR(000-255) GGG(000-255) BBB(000-255) AAA(000-100百分比)
 *
 * 前缀3位 (性别 x 纹理):
 *   [性别1位][纹理2位]
 *   性别: 0=雄性, 1=雌性
 *   纹理: pattern_index * 10, 不足补零
 *     A=0 → 00, B=1 → 10, C=2 → 20, D=3 → 30, E=4 → 40 ...
 *
 * 示例:
 *   000 = 雄性 Pattern_A    100 = 雌性 Pattern_A
 *   010 = 雄性 Pattern_B    110 = 雌性 Pattern_B
 *   020 = 雄性 Pattern_C    120 = 雌性 Pattern_C
 *   030 = 雄性 Pattern_D    130 = 雌性 Pattern_D
 *
 * 色块顺序 (10个):
 *   maleDisplay, markings, body, flank, underbelly,
 *   teeth, mouth, claws, special, eye
 */

import { srgbHexToLinearHex } from './skin-gradient-generator.js';

// CNRE 色块顺序
const CNRE_PART_ORDER = [
    'maleDisplay', 'markings', 'body', 'flank',
    'underbelly', 'teeth', 'mouth', 'claws', 'special', 'eye'
];

// teeth/mouth/claws 默认色 (当 colors 中没有这些部位时使用)
const CNRE_DEFAULTS = {
    teeth: 'FFFFFF',
    mouth: '7C5859',
    claws: '312E27'
};

/**
 * 从 pattern 名称提取数字索引
 * Pattern_A → 0, Pattern_B → 1, Pattern_C → 2, Pattern_D → 3 ...
 * Pattern_4 → 3 (数字代表第几个皮肤, 1-indexed → 0-indexed)
 * 非字母/数字 pattern (Juvenile, Hatchling, Python 等) → 默认 0
 */
function patternToIndex(pattern) {
    if (!pattern) return 0;
    // 去掉 Pattern_ 前缀
    const letter = pattern.startsWith('Pattern_') ? pattern.slice(8) : pattern;
    // 单个大写字母 A-Z → 0-25
    if (letter.length === 1 && /^[A-Z]$/.test(letter)) {
        return letter.charCodeAt(0) - 65; // A=0, B=1, ... Z=25
    }
    // 纯数字 → 数字-1 (4=第4个皮肤 → 索引3)
    if (/^\d+$/.test(letter)) {
        const num = parseInt(letter, 10);
        if (num >= 1 && num <= 26) return num - 1; // 1→0, 2→1, 3→2, 4→3...
    }
    // Juvenile, Hatchling, Python 等非服务器纹理 → 默认 0
    return 0;
}

/**
 * 从数字索引还原 pattern 名称
 * 0 → Pattern_A, 1 → Pattern_B, 2 → Pattern_C ...
 */
function indexToPattern(index) {
    if (index < 0 || index > 25) index = 0;
    return 'Pattern_' + String.fromCharCode(65 + index);
}

/**
 * 计算 CNRE 前缀 (3位)
 * gender_digit(0/1) + pattern_code(2位, index*10)
 */
function buildPrefix(isFemale, pattern) {
    const genderDigit = isFemale ? '1' : '0';
    const patternCode = String(patternToIndex(pattern) * 10).padStart(2, '0');
    return genderDigit + patternCode;
}

/**
 * 解析 CNRE 前缀 → {isFemale, pattern}
 */
function parsePrefix(prefix) {
    const genderDigit = prefix[0];
    const patternCode = prefix.slice(1); // "00", "10", "20" ...
    const isFemale = genderDigit === '1';
    const patternIndex = Math.round(parseInt(patternCode, 10) / 10);
    return { isFemale, pattern: indexToPattern(patternIndex) };
}

function pad3(val, max) {
    return String(Math.max(0, Math.min(max, Math.round(val)))).padStart(3, '0');
}

function hexToCNREBlock(hex, alpha = 100) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return pad3(r, 255) + pad3(g, 255) + pad3(b, 255) + pad3(alpha, 100);
}

function cnreBlockToHex(block) {
    const r = parseInt(block.slice(0, 3), 10);
    const g = parseInt(block.slice(3, 6), 10);
    const b = parseInt(block.slice(6, 9), 10);
    return [r, g, b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('');
}

/**
 * 编码为 CNRE 皮肤码
 * @param {Object} params
 * @param {boolean} params.isFemale - 是否雌性
 * @param {string} params.pattern - Pattern_A / Pattern_B / Pattern_C / Pattern_D ...
 * @param {Object} params.colors - 颜色对象
 * @param {string} params.eyeColor - 眼球颜色 hex (6位无#)
 * @param {string} params.colorSpace - 'srgb' (默认) 或 'linear'（自动把sRGB转线性后编码）
 * @returns {string} CNRE 皮肤码字符串
 */
export function encodeCNRE({ isFemale, pattern, colors, eyeColor, colorSpace = 'srgb' }) {
    const prefix = buildPrefix(isFemale, pattern);

    const fullColors = { ...CNRE_DEFAULTS, ...colors };
    fullColors.eye = eyeColor || 'FFFFFF';

    const blocks = CNRE_PART_ORDER.map(part => {
        const hex = fullColors[part] || 'FFFFFF';
        const finalHex = colorSpace === 'linear' ? srgbHexToLinearHex(hex.replace('#', '')) : hex.replace('#', '');
        return hexToCNREBlock(finalHex, 100);
    });

    return '!skin ' + prefix + blocks.join('');
}

/**
 * 解析 CNRE 皮肤码
 * @param {string} code - CNRE 皮肤码字符串
 * @returns {Object} {isFemale, pattern, colors, eyeColor} 或 {error}
 */
export function decodeCNRE(code) {
    if (!code || typeof code !== 'string') return null;

    code = code.trim();

    // 去掉所有空格（兼容用户粘贴带空格的码），CNRE 码本身无空格连写
    const clean = code.replace(/\s+/g, '');

    // 匹配 !skin + 3位性别纹理前缀 + 颜色数据
    const match = clean.match(/^!skin(\d{3})(\d+)$/i);
    if (!match) return { error: 'CNRE 码格式错误: 应以 !skin 开头' };

    const prefix = match[1];
    const colorStr = match[2];

    if (colorStr.length < 120) {
        return { error: `颜色数据不完整: 需要 120 位, 实际 ${colorStr.length} 位` };
    }

    // 只取前120位 (10个色块 x 12位)
    const trimmedColorStr = colorStr.slice(0, 120);

    const genderInfo = parsePrefix(prefix);

    const colors = {};
    for (let i = 0; i < 10; i++) {
        const block = trimmedColorStr.slice(i * 12, (i + 1) * 12);
        const part = CNRE_PART_ORDER[i];
        colors[part] = cnreBlockToHex(block);
    }

    const eyeColor = colors.eye || 'FFFFFF';
    delete colors.eye;

    return {
        isFemale: genderInfo.isFemale,
        pattern: genderInfo.pattern,
        colors: colors,
        eyeColor: eyeColor,
        prefix: prefix
    };
}

/**
 * 判断字符串是否为 CNRE 皮肤码
 */
export function isCNRECode(code) {
    return code && typeof code === 'string' && /^!skin/i.test(code.trim());
}
