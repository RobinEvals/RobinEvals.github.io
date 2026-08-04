export function hexToRgb(hex) {
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}

export function rgbToHex(r, g, b) {
    return [r, g, b].map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0').toUpperCase()).join('');
}

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: h * 360, s, l };
}

export function hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function generateGradient(hex1, hex2, steps) {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    const results = [];
    for (let i = 0; i < steps; i++) {
        const t = steps === 1 ? 0 : i / (steps - 1);
        const r = c1.r + (c2.r - c1.r) * t;
        const g = c1.g + (c2.g - c1.g) * t;
        const b = c1.b + (c2.b - c1.b) * t;
        results.push(rgbToHex(r, g, b));
    }
    return results;
}

export function generateSingleColorPalette(hex, count) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const results = [];
    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const l = 0.2 + t * 0.65;
        const c = hslToRgb(hsl.h, hsl.s, l);
        results.push(rgbToHex(c.r, c.g, c.b));
    }
    return results;
}

export function randomHex() {
    return rgbToHex(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256));
}

export function generateRandomHueShift(count) {
    const baseHue = Math.random() * 360;
    const results = [];
    for (let i = 0; i < count; i++) {
        const hue = (baseHue + i * (20 + Math.random() * 30)) % 360;
        const c = hslToRgb(hue, 0.5 + Math.random() * 0.3, 0.4 + Math.random() * 0.3);
        results.push(rgbToHex(c.r, c.g, c.b));
    }
    return results;
}

export function generateAdvancedPalette(baseHex, options = {}) {
    const rgb = hexToRgb(baseHex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const count = Math.max(3, Math.min(32, options.count || 9));
    // "使用较小范围" 仅限制色相偏移，不影响亮度范围与颜色偏移
    const hueShift = (options.hueShift || 0) * (options.smallerRanges ? 0.5 : 1);
    const brightnessRange = Math.max(0, Math.min(2, options.brightnessRange || 0.8));
    const offset = Math.max(-1, Math.min(1, options.offset || 0));
    const saturation = Math.max(0, Math.min(2, options.saturation || 1));
    const results = [];
    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const hue = (hsl.h + (t - 0.5) * hueShift + 360) % 360;
        // 颜色偏移与亮度范围独立：offset 直接平移整条渐变，brightnessRange 控制展开程度
        const lightness = Math.max(0.02, Math.min(0.98, hsl.l + offset * 0.5 + (t - 0.5) * brightnessRange));
        const sat = Math.max(0, Math.min(1, hsl.s * saturation));
        const c = hslToRgb(hue, sat, lightness);
        results.push(rgbToHex(c.r, c.g, c.b));
    }
    return results;
}

export function validateHex(hex) { return /^[0-9A-Fa-f]{6}$/.test(hex); }

// ===== sRGB ↔ 线性颜色空间转换 =====

function srgbChannelToLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgb(c) {
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function srgbHexToLinearHex(hex) {
    const r = srgbChannelToLinear(parseInt(hex.slice(0, 2), 16));
    const g = srgbChannelToLinear(parseInt(hex.slice(2, 4), 16));
    const b = srgbChannelToLinear(parseInt(hex.slice(4, 6), 16));
    return rgbToHex(r * 255, g * 255, b * 255);
}

export function linearHexToSrgbHex(hex) {
    const r = linearChannelToSrgb(parseInt(hex.slice(0, 2), 16) / 255);
    const g = linearChannelToSrgb(parseInt(hex.slice(2, 4), 16) / 255);
    const b = linearChannelToSrgb(parseInt(hex.slice(4, 6), 16) / 255);
    return rgbToHex(r * 255, g * 255, b * 255);
}