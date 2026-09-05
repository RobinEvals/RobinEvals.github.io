/**
 * CNRE 社区服务器皮肤码生成器
 *
 * ============================================================================
 *  v0.5.9.2 起：CNRE 官方彻底重写了皮肤码格式（逆向自 CNRE UPDATED.txt 核心 JS）
 *  旧十进制 "v3" 格式已删除，改为二进制 "S1" 短码（URL-safe Base64）。
 *
 *  新格式结构（共 163 字节 = 3 + 10×16）：
 *    [0]   magic 'S'  (83)
 *    [1]   magic '1'  (49)
 *    [2]   header 字节：
 *            bit0      = isFemale (1=雌性)
 *            bit1..2   = patternIndex (0..2 → Pattern_1/2/3)
 *            bit3..4   = variation index → 取值 [2, 8, 16]（官方新增：纹理粗细）
 *    [3 ..] 10 个通道块，每块 16 字节 = 4×float32 (r, g, b, a)
 *            顺序：body, underbelly, markings, flank, details(=旧 special),
 *                  maleDisplay, eyes(=旧 eye), teeth, mouth, claws
 *
 *  每个通道存的是 **线性 (linear) RGB**（0~1，sRGB 传递函数逆变换后的值），
 *  近乎无损（float32 精度），不再有 500 量化、4.99 拉伸、荧光/故障模式位。
 *
 *  颜色空间说明（重要，v0.5.9.8 修正）：
 *    游戏服务器按 **线性** 读取通道值，再做 sRGB 输出。若直接存 sRGB 归一化，
 *    进游戏会整体发淡（亮部过曝、暗部被提亮）。因此导出前先把编辑器里的 sRGB
 *    颜色经标准 sRGB 传递函数转成线性再编码；导入时再转回 sRGB 供界面显示。
 *    round-trip 在 8bit 精度下无可见漂移。旧十进制格式的 *导入* 仍按旧逻辑还原
 *    （返回的颜色由 UI 层做 线性→sRGB），以保证用户已存的旧预设码不失效。
 * ============================================================================
 */

// ---- 新格式常量 ----
const CNRE_NEW_PART_ORDER = [
    'body', 'underbelly', 'markings', 'flank', 'details',
    'maleDisplay', 'eyes', 'teeth', 'mouth', 'claws'
];
const CNRE_VARIATIONS = [2, 8, 16]; // 纹理粗细取值（官方 p1）
const CNRE_MAGIC = [83, 49];        // 'S','1'
const CNRE_BYTES_PER_BLOCK = 16;    // 4×float32
const CNRE_TOTAL_BYTES = 3 + CNRE_NEW_PART_ORDER.length * CNRE_BYTES_PER_BLOCK; // = 163

// 新格式官方默认色（sRGB 归一化 0~1，来自 CNRE UPDATED.txt 的 Wwe）
const CNRE_NEW_DEFAULTS = {
    body:       { r: 0.17, g: 0.35, b: 0.15 },
    underbelly: { r: 0.55, g: 0.57, b: 0.53 },
    markings:   { r: 0.26, g: 0.29, b: 0.24 },
    flank:      { r: 0.20, g: 0.38, b: 0.18 },
    details:    { r: 0.30, g: 0.32, b: 0.28 },
    maleDisplay:{ r: 0.40, g: 0.42, b: 0.38 },
    eyes:       { r: 0.63, g: 0.83, b: 0.58 },
    teeth:      { r: 1, g: 1, b: 1 },
    mouth:      { r: 1, g: 1, b: 1 },
    claws:      { r: 1, g: 1, b: 1 }
};

/**
 * CNRE 通道 id → 编辑器颜色键名。
 * 唯一真源：details 在码里叫 details，在编辑器里叫 special；eyes 不进 currentColors，存 eyeColor。
 * 其余通道同名，直接回传。
 * @param {string} id CNRE 通道 id
 * @returns {string} 编辑器键名（'eye' 表示取 eyeColor 而非 currentColors）
 */
export function cnreIdToColorKey(id) {
    if (id === 'details') return 'special';
    if (id === 'eyes') return 'eye';
    return id;
}

/** cnreIdToColorKey 的逆映射：编辑器键名 → CNRE 通道 id */
export function colorKeyToCnreId(key) {
    if (key === 'special') return 'details';
    if (key === 'eye') return 'eyes';
    return key;
}

/** 生成故障通道用的随机负值，复刻官方 ov()：严格负，范围约 [-999999, -0.000001] */
export function randomGlitchValue() {
    let t = -Math.random() * 999999;
    if (t === 0) t = -1e-6;
    return xs(t);
}

/**
 * 复刻官方 xs()（CNRE UPDATED.txt:90097）：保留 6 位小数，非有限值归 0。
 * 官方在生成/写入通道值时都会过一遍这个，用于保证码的可复现与精度一致。
 */
export function xs(t) {
    return Number.isFinite(t) ? Math.round(t * 1e6) / 1e6 : 0;
}

// ---- 旧格式常量（仅用于导入兼容，不再生成）----
const CNRE_OLD_PART_ORDER = [
    'maleDisplay', 'markings', 'body', 'flank',
    'underbelly', 'teeth', 'mouth', 'claws', 'special', 'eye'
];
const CNRE_OLD_DEFAULTS = { teeth: 'FFFFFF', mouth: '7C5859', claws: '312E27' };
const CNRE_STRETCH = 4.99;

/**
 * 从 pattern 名称提取数字索引
 * Pattern_1 → 0, Pattern_2 → 1 ...（兼容 Pattern_A / 数字写法）
 * 非字母/数字 pattern（Juvenile, Hatchling, 1Old 等）→ 默认 0
 */
function patternToIndex(pattern) {
    if (!pattern) return 0;
    const letter = pattern.startsWith('Pattern_') ? pattern.slice(8) : pattern;
    if (letter.length === 1 && /^[A-Z]$/.test(letter)) return letter.charCodeAt(0) - 65;
    if (/^\d+$/.test(letter)) {
        const num = parseInt(letter, 10);
        if (num >= 1 && num <= 26) return num - 1;
    }
    return 0;
}

/** 从数字索引还原 pattern 名称 */
function indexToPattern(index) {
    if (index < 0 || index > 25) index = 0;
    return 'Pattern_' + (index + 1);
}

/** 清洗 hex：非法值一律回退 'FFFFFF' */
function sanitizeHex(hex) {
    const clean = String(hex == null ? '' : hex).replace('#', '').toUpperCase();
    return /^[0-9A-F]{6}$/.test(clean) ? clean : 'FFFFFF';
}

// ---------------------------------------------------------------------------
// 颜色转换辅助（sRGB 归一化 <-> 6位 hex）
// ---------------------------------------------------------------------------
function hexToFloat3(hex) {
    const clean = sanitizeHex(hex);
    return {
        r: parseInt(clean.slice(0, 2), 16) / 255,
        g: parseInt(clean.slice(2, 4), 16) / 255,
        b: parseInt(clean.slice(4, 6), 16) / 255
    };
}

function float3ToHex({ r, g, b }) {
    const a = (v) => {
        const n = Number.isFinite(v) ? v : 0;
        const c = Math.max(0, Math.min(1, n)); // 官方 P6：先 clamp 到 0~1
        return Math.round(c * 255).toString(16).padStart(2, '0').toUpperCase();
    };
    return a(r) + a(g) + a(b);
}

function readFloat3(dv, offset) {
    return {
        r: dv.getFloat32(offset, true),
        g: dv.getFloat32(offset + 4, true),
        b: dv.getFloat32(offset + 8, true)
    };
}

// ---------------------------------------------------------------------------
// sRGB ↔ 线性 传递函数（与 GradGen.srgbHexToLinearHex / Nyor 一致）
//   通道值先 clamp 到 [0,1]，避免故障皮负值 / 越界污染
// ---------------------------------------------------------------------------
function srgbChannelToLinear(c) {
    c = Number.isFinite(c) ? c : 0;
    c = Math.max(0, Math.min(1, c));
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearChannelToSrgb(c) {
    c = Number.isFinite(c) ? c : 0;
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function srgbFloat3ToLinear({ r, g, b }) {
    return { r: srgbChannelToLinear(r), g: srgbChannelToLinear(g), b: srgbChannelToLinear(b) };
}
function linearFloat3ToSrgb({ r, g, b }) {
    return { r: linearChannelToSrgb(r), g: linearChannelToSrgb(g), b: linearChannelToSrgb(b) };
}

/** 原始线性 float → 显示用 sRGB hex（clamp 到 [0,1]：负值→黑、超大正值→白、区间内正常） */
export function rawLinearToHex({ r, g, b }) {
    return float3ToHex(linearFloat3ToSrgb({ r, g, b }));
}

/**
 * 把颜色自动匹配到「最接近的高饱和颜色」：保留色相 (H) 与明度 (L)，把饱和度 (S) 拉到 targetS（默认 1）。
 * 用于荧光/反色荧光故障——低饱和色（如 #525BA3）直接套故障会三个通道同号 → 变白，
 * 先拉满饱和度可得到主导通道明确、鲜艳的荧光色相。在 sRGB 空间做 HSL 运算（与网页 HSL 一致）。
 */
export function boostSaturationToHex(hex, targetS = 1) {
    const { r, g, b } = hexToFloat3(hex); // 0~1 sRGB
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    const d = max - min;
    if (d > 1e-6) {
        s = l < 0.5 ? d / (max + min) : d / (2 - max - min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4; break; // b 为最大值
        }
        h /= 6;
    }
    // 目标饱和度（默认拉满），明度保持
    s = targetS;
    let rr, gg, bb;
    if (s <= 1e-6) {
        rr = gg = bb = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        rr = hue2rgb(p, q, h + 1 / 3);
        gg = hue2rgb(p, q, h);
        bb = hue2rgb(p, q, h - 1 / 3);
    }
    return float3ToHex({ r: rr, g: gg, b: bb });
}

/**
 * 从用户可见的 sRGB 颜色计算故障原始线性值（v0.5.9.12，v0.5.9.37 明确荧光机制）。
 * 逻辑：先把 sRGB 转成线性，再按符号放大到官方 ov() 的量级（约 ±999999）。
 * 用 Math.max(..., 0.00001) 做 floor：
 *   - 非零基色通道（主导通道）→ ±999999（大量级）
 *   - 零基色通道 → ±9.99999（微小量级）
 * 这正是游戏内「荧光色」的来源：主导通道给色相，微小通道的符号决定鲜艳度。
 * 单分量翻转符号（见 skin-ui-manager.flipGlitchComponent）即可在同号黑/白斑与异号荧光色之间切换。
 * round-trip：float32 原样写，仍被识别为故障。
 */
export function computeGlitchFromSrgbHex(hex, positive = false) {
    const lin = srgbFloat3ToLinear(hexToFloat3(hex));
    const sign = positive ? 1 : -1;
    return {
        r: xs(sign * Math.max(lin.r, 0.00001) * 999999),
        g: xs(sign * Math.max(lin.g, 0.00001) * 999999),
        b: xs(sign * Math.max(lin.b, 0.00001) * 999999)
    };
}

// ---------------------------------------------------------------------------
// URL-safe Base64（浏览器环境，使用 btoa/atob）
// ---------------------------------------------------------------------------
function bytesToBinaryString(bytes) {
    let s = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return s;
}

function base64UrlEncode(bytes) {
    return btoa(bytesToBinaryString(bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlDecode(str) {
    const s = String(str).replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

/** 取最接近的 variation 索引（[2,8,16]，非有限值默认 8=index1） */
function nearestVariationIndex(v) {
    const e = Number(v);
    if (!Number.isFinite(e)) return 1;
    let best = 1, bestDist = Infinity;
    for (let i = 0; i < CNRE_VARIATIONS.length; i++) {
        const d = Math.abs(e - CNRE_VARIATIONS[i]);
        if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
}

// ---------------------------------------------------------------------------
// 编码（新 S1 二进制格式）
// ---------------------------------------------------------------------------
/**
 * @param {Object} params
 * @param {boolean} params.isFemale
 * @param {string}  params.pattern        - Pattern_1 / Pattern_2 / Pattern_3 ...
 * @param {Object}  params.colors         - 9 个部位 hex（maleDisplay,markings,flank,body,underbelly,special,teeth,mouth,claws）
 * @param {string}  params.eyeColor       - 眼球颜色 hex
 * @param {number}  params.skinVariation  - 纹理粗细，2 / 8 / 16
 * @returns {string} '!skin ' + URL-safe Base64
 */
export function encodeCNRE({ isFemale, pattern, colors = {}, eyeColor, skinVariation = 8, glitchChannels = {} }) {
    // 编辑器颜色是 sRGB hex → 归一化后再转线性，游戏服务器按线性读取
    const channels = {
        body:       srgbFloat3ToLinear(hexToFloat3(colors.body)),
        underbelly: srgbFloat3ToLinear(hexToFloat3(colors.underbelly)),
        markings:   srgbFloat3ToLinear(hexToFloat3(colors.markings)),
        flank:      srgbFloat3ToLinear(hexToFloat3(colors.flank)),
        details:    srgbFloat3ToLinear(hexToFloat3(colors.special)),
        maleDisplay:srgbFloat3ToLinear(hexToFloat3(colors.maleDisplay)),
        teeth:      srgbFloat3ToLinear(hexToFloat3(colors.teeth || CNRE_OLD_DEFAULTS.teeth)),
        mouth:      srgbFloat3ToLinear(hexToFloat3(colors.mouth || CNRE_OLD_DEFAULTS.mouth)),
        claws:      srgbFloat3ToLinear(hexToFloat3(colors.claws || CNRE_OLD_DEFAULTS.claws)),
        eyes:       srgbFloat3ToLinear(hexToFloat3(eyeColor || 'FFFFFF'))
    };
    // 缺失/非法通道回退官方默认（同样先当 sRGB 转线性）
    for (const id of CNRE_NEW_PART_ORDER) {
        const c = channels[id];
        if (!c || !Number.isFinite(c.r) || !Number.isFinite(c.g) || !Number.isFinite(c.b)) {
            channels[id] = srgbFloat3ToLinear(CNRE_NEW_DEFAULTS[id]);
        }
    }
    // 故障皮：用原始线性负值覆盖对应通道（不 clamp，float32 直接存，游戏 shader 读负值出特效）
    for (const id of CNRE_NEW_PART_ORDER) {
        const g = glitchChannels && glitchChannels[id];
        if (g && Number.isFinite(g.r) && Number.isFinite(g.g) && Number.isFinite(g.b)) {
            channels[id] = { r: g.r, g: g.g, b: g.b };
        }
    }

    const patternIndex = Math.max(0, Math.min(2, patternToIndex(pattern)));
    const header = (isFemale ? 1 : 0) | (patternIndex << 1) | (nearestVariationIndex(skinVariation) << 3);

    const buf = new Uint8Array(CNRE_TOTAL_BYTES);
    const dv = new DataView(buf.buffer);
    buf[0] = CNRE_MAGIC[0];
    buf[1] = CNRE_MAGIC[1];
    buf[2] = header;
    for (let i = 0; i < CNRE_NEW_PART_ORDER.length; i++) {
        const c = channels[CNRE_NEW_PART_ORDER[i]];
        const off = 3 + i * CNRE_BYTES_PER_BLOCK;
        dv.setFloat32(off,     c.r, true);
        dv.setFloat32(off + 4, c.g, true);
        dv.setFloat32(off + 8, c.b, true);
        dv.setFloat32(off + 12, 1, true);
    }
    return '!skin ' + base64UrlEncode(buf);
}

/**
 * 随机故障皮肤：基于【当前配色】，随机挑 5 个通道写成巨大负值（复刻官方 s6e 的负值逻辑）。
 * 与官方 s6e 的区别：官方是从默认色 Sl() 重新生成（非故障通道用暗灰），
 * 这里保留你当前调的色——非故障通道沿用原色，只有被选中的通道被打成负值（游戏内出故障特效）。
 * @returns {{code:string, glitchChannels:Object, glitchIds:string[]}}
 */
export function generateGlitchFromCurrent({ isFemale, pattern, colors = {}, eyeColor, skinVariation = 8 }) {
    const order = CNRE_NEW_PART_ORDER.slice(); // 10 个通道（含 eyes）
    // Fisher–Yates 洗牌
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    const glitchIds = order.slice(0, 5); // 取前一半作为故障通道
    const glitchChannels = {};
    for (const id of glitchIds) {
        glitchChannels[id] = { r: randomGlitchValue(), g: randomGlitchValue(), b: randomGlitchValue() };
    }
    const code = encodeCNRE({ isFemale, pattern, colors, eyeColor, skinVariation, glitchChannels });
    return { code, glitchChannels, glitchIds };
}

// ---------------------------------------------------------------------------
// 解码
// ---------------------------------------------------------------------------

/** 新格式解码（S1 二进制） */
function decodeCNRENew(body) {
    const bytes = base64UrlDecode(body);
    if (bytes.length !== CNRE_TOTAL_BYTES) throw new Error('S1 短码长度无效');
    if (bytes[0] !== CNRE_MAGIC[0] || bytes[1] !== CNRE_MAGIC[1]) throw new Error('不是 S1 短码');

    const header = bytes[2];
    const isFemale = (header & 1) === 1;
    const patternIndex = Math.min((header >> 1) & 3, 2);
    const variationIndex = Math.min((header >> 3) & 3, 2);
    const skinVariation = CNRE_VARIATIONS[variationIndex];

    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const channels = {};       // 已转回 sRGB（供界面显示，负值被 clamp 成黑）
    const rawLinear = {};      // 原始线性 float（保留负值，供故障皮 round-trip）
    // S1 码按线性存储 → 读出后转回 sRGB 供界面显示
    for (let i = 0; i < CNRE_NEW_PART_ORDER.length; i++) {
        const id = CNRE_NEW_PART_ORDER[i];
        const raw = readFloat3(dv, 3 + i * CNRE_BYTES_PER_BLOCK);
        rawLinear[id] = raw;
        channels[id] = linearFloat3ToSrgb(raw);
    }

    // 故障皮检测：任一分量越出 [0,1] 即视为故障通道（S1 用 float32 存原始值，不 clamp；
    // 官方 av() 只挡 NaN/Inf。负值=官方故障；正值同样原样保存，供手填超大值往返）
    const glitchChannels = {};
    let glitchCount = 0;
    for (const id of CNRE_NEW_PART_ORDER) {
        const r = rawLinear[id];
        if (r && (r.r < 0 || r.r > 1 || r.g < 0 || r.g > 1 || r.b < 0 || r.b > 1)) {
            glitchChannels[id] = { r: r.r, g: r.g, b: r.b };
            glitchCount++;
        }
    }

    const colors = {
        maleDisplay: float3ToHex(channels.maleDisplay),
        markings:   float3ToHex(channels.markings),
        body:       float3ToHex(channels.body),
        flank:      float3ToHex(channels.flank),
        underbelly: float3ToHex(channels.underbelly),
        special:    float3ToHex(channels.details),
        teeth:      float3ToHex(channels.teeth),
        mouth:      float3ToHex(channels.mouth),
        claws:      float3ToHex(channels.claws)
    };
    const eyeColor = float3ToHex(channels.eyes); // 已为 sRGB

    return {
        format: 'new',
        isFemale,
        patternIndex,
        pattern: indexToPattern(patternIndex),
        skinVariation,
        colors,
        eyeColor,
        hasGlitch: glitchCount > 0,
        glitchCount,
        glitchChannels
    };
}

/** 旧格式解码（十进制 v3，仅导入兼容） */
function decodeCNREOld(body) {
    // 去掉所有空格
    const clean = body.replace(/\s+/g, '');
    const match = clean.match(/^(\d{3})(\d+)$/i);
    if (!match) return { error: 'CNRE 码格式错误: 应以 !skin 开头' };

    const prefix = match[1];
    const colorStr = match[2];
    if (colorStr.length < 120) {
        return { error: '颜色数据不完整: 需要 120 位, 实际 ' + colorStr.length + ' 位' };
    }
    const trimmed = colorStr.slice(0, 120);

    const isFemale = prefix[0] === '1';
    const textureDigit = parseInt(prefix[1] || '0', 10);
    const pattern = indexToPattern(Math.max(0, Math.min(2, textureDigit)));

    const colors = {};
    const modes = {};
    for (let i = 0; i < 10; i++) {
        const block = trimmed.slice(i * 12, (i + 1) * 12);
        const part = CNRE_OLD_PART_ORDER[i];
        const { hex, mode } = oldBlockToHexAndMode(block);
        if (part === 'eye') {
            colors.eye = hex;
            if (mode !== 'normal') modes.eye = mode;
        } else {
            colors[part] = hex;
            if (mode !== 'normal') modes[part] = mode;
        }
    }

    const eyeColor = colors.eye || 'FFFFFF';
    delete colors.eye;

    return {
        format: 'old',
        isFemale,
        pattern,
        prefix,
        colors,   // 旧「线性码」颜色，由 UI 层做 线性→sRGB
        eyeColor,
        modes
    };
}

/** 旧格式单块解码（含模式推断） */
function oldBlockToHexAndMode(block) {
    const v1 = parseInt(block.slice(0, 3), 10);
    const v2 = parseInt(block.slice(3, 6), 10);
    const v3 = parseInt(block.slice(6, 9), 10);
    let mode = 'normal';
    if (v1 > 600 || v2 > 600 || v3 > 600) mode = 'fluorescent';
    else if (v1 < 500 || v2 < 500 || v3 < 500) mode = 'glitch';
    const r = oldDecodeChannel(v1, mode);
    const g = oldDecodeChannel(v2, mode);
    const b = oldDecodeChannel(v3, mode);
    const hex = [r, g, b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('');
    return { hex, mode };
}

function oldDecodeChannel(v, mode) {
    let c;
    if (mode === 'fluorescent') c = (v - 500) * 2.55 / CNRE_STRETCH;
    else if (mode === 'glitch') c = (500 - v) * 2.55 / CNRE_STRETCH;
    else c = (v - 500) * 2.55;
    return Math.max(0, Math.min(255, Math.round(c)));
}

/**
 * 解析 CNRE 皮肤码（自动识别新 S1 / 旧十进制）
 * @returns {Object} {format:'new'|'old', ...} 或 {error}
 */
export function decodeCNRE(code) {
    if (!code || typeof code !== 'string') return null;
    const clean = code.trim();
    const marker = '!skin';
    let body = clean;
    if (clean.toLowerCase().startsWith(marker.toLowerCase())) {
        body = clean.slice(marker.length).trim();
    }
    if (!body) return { error: 'CNRE 码格式错误: 缺少短码内容' };

    // 新格式：URL-safe Base64（仅含 A-Za-z0-9-_）
    if (/^[A-Za-z0-9\-_]+$/.test(body)) {
        try {
            return decodeCNRENew(body);
        } catch (e) {
            // 不是合法 S1 码 → 落到旧格式尝试
        }
    }
    // 旧格式：十进制
    return decodeCNREOld(body);
}

/** 判断字符串是否为 CNRE 皮肤码 */
export function isCNRECode(code) {
    return code && typeof code === 'string' && /^!skin/i.test(code.trim());
}
