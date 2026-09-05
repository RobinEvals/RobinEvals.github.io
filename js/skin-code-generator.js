import { DINOSAUR_DATA } from './skin-dino-data.js?v=0.5.9.78';

const PATTERN_SCALE_MAP = { 'fine': '0', 'medium': '1', 'coarse': '2' };

/**
 * Pattern 名称 → 数字码 (单数字 0-9)
 * Pattern_1 → 0, Pattern_2 → 1, Pattern_3 → 2, Pattern_4 → 3 ...
 * (旧码兼容: Pattern_A → 0, Pattern_B → 1, Pattern_C → 2 ...)
 * 非字母/数字 pattern (Juvenile, Hatchling 等) → 默认 0
 */
function patternToDigit(pattern) {
    if (!pattern) return '0';
    const letter = pattern.startsWith('Pattern_') ? pattern.slice(8) : pattern;
    // 单个大写字母 A-Z → 0-9 (只支持 A-J, 即 0-9)
    if (letter.length === 1 && /^[A-Z]$/.test(letter)) {
        const idx = letter.charCodeAt(0) - 65; // A=0, B=1, ... J=9
        if (idx >= 0 && idx <= 9) return String(idx);
    }
    // 纯数字 → 数字-1 (4=第4个皮肤 → 索引3)
    if (/^\d+$/.test(letter)) {
        const num = parseInt(letter, 10);
        if (num >= 1 && num <= 10) return String(num - 1); // 1→0, 2→1, ... 10→9
    }
    return '0';
}

/**
 * 数字码 → Pattern 名称
 * 0 → Pattern_1, 1 → Pattern_2, 2 → Pattern_3 ...
 */
function digitToPattern(digit) {
    const idx = parseInt(digit, 10);
    if (idx >= 0 && idx <= 9) return 'Pattern_' + (idx + 1);
    return 'Pattern_1';
}

export function generateSkinCode(dinoName, colors, patternType = 'Pattern_1', patternScale = 'medium') {
    const orderedParts = ['underbelly', 'body', 'flank', 'markings', 'maleDisplay', 'teeth', 'mouth', 'claws'];
    const colorString = orderedParts.map(id => (colors[id] || '000000') + 'FF').join('');
    const typeCode = patternToDigit(patternType);
    const scaleCode = PATTERN_SCALE_MAP[patternScale] || '1';
    const patternCode = typeCode + scaleCode + '0';
    return `${dinoName}${patternCode}${colorString}`;
}

export function parseSkinCode(code) {
    if (!code || typeof code !== 'string') return null;
    // 兼容旧码(40位hex=5部位)和新码(64位hex=8部位)
    const match = code.match(/^([A-Za-z]+)(\d{3})([0-9A-Fa-f]{64}|[0-9A-Fa-f]{40})$/);
    if (!match) return null;
    const [, dinoName, patternCode, colorData] = match;
    let resolvedDino = dinoName;
    if (!DINOSAUR_DATA[dinoName]) {
        const lowerName = dinoName.toLowerCase();
        const foundKey = Object.keys(DINOSAUR_DATA).find(key => key.toLowerCase() === lowerName);
        if (!foundKey) return { error: `未知恐龙: ${dinoName}` };
        resolvedDino = foundKey;
    }
    const typeDigit = patternCode[0];
    const scaleDigit = patternCode[1];
    const scaleMapReverse = { '0': 'fine', '1': 'medium', '2': 'coarse' };
    const colorParts = [];
    for (let i = 0; i < colorData.length; i += 8) {
        const chunk = colorData.slice(i, i + 8);
        const hex = chunk.slice(0, 6).toUpperCase();
        colorParts.push(hex);
    }
    const orderedIds = ['underbelly', 'body', 'flank', 'markings', 'maleDisplay', 'teeth', 'mouth', 'claws'];
    const colors = {};
    orderedIds.forEach((id, i) => { colors[id] = colorParts[i] || '000000'; });
    // 旧码只有5个部位，teeth/mouth/claws 用默认值
    if (colorParts.length < 6) {
        colors.teeth = 'FFFFFF';
        colors.mouth = '7C5859';
        colors.claws = '312E27';
    }
    colors.special = '000000';
    return { dinoName: resolvedDino, colors, patternCode, patternType: digitToPattern(typeDigit), patternScale: scaleMapReverse[scaleDigit] || 'medium' };
}

export function isValidColorHex(hex) { return /^[0-9A-Fa-f]{6}$/.test(hex); }