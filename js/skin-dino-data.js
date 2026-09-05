export const DINOSAUR_DATA = {
	'Triceratops': {
		hasSpecial: false,
		name: '三角龙',
		diet: 'herbivore',
		patterns: ['1', '2', '3', '4', '5', '6', 'Juvenile', 'Hatchling'],
		// 皮肤6 官方配色（配色5）带 Special 通道 → 该图案显示 special 行
		patternMeta: { '6': { hasSpecial: true } },
		colors: {
			underbelly: 'BFA87E',
			body: 'AB8053',
			flank: '69584C',
			markings: '423E38',
			maleDisplay: 'D86B35',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'EDB900',
	},
	'Stegosaurus': {
		hasSpecial: false,
		name: '剑龙',
		diet: 'herbivore',
		patterns: ['1', '1Old', '2', '3', '4', 'Juvenile', 'Hatchling'],
		// 形态键时间轴：key 为滑块位置 (0~100)，value 为 morph 权重
		morphTimeline: {
			juvenile: { 0: 1.0, 75: 0 },
			female:   { 50: 0, 75: 1.0 },
			elder:    { 75: 0, 100: 1.0 },
		},
		// morph target 在 GLB 中的名称（prefix: {DinoName}_）
		// 约定：{dino}_Juvenile_Morph, {dino}_Female_Master, {dino}_Elder_Master
		// 动画 clip 命名：F A_{DinoName}_{Age}_{Action}
		colors: {
			underbelly: '7C6D5B',
			body: 'AA8562',
			flank: '595934',
			markings: '303030',
			maleDisplay: '89513F',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'DC7500',
	},
	'Maiasaura': {
		hasSpecial: false,
		name: '慈母龙',
		diet: 'herbivore',
		patterns: ['1', '1Old', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'FECF97',
			body: 'EBB671',
			flank: 'CA946A',
			markings: '5F4B43',
			maleDisplay: 'AD8363',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'EB794C',
	},
	'Diabloceratops': {
		hasSpecial: false,
		name: '恶魔角龙',
		diet: 'herbivore',
		patterns: ['1', '1Old', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'C5A78E',
			body: 'AD9155',
			flank: '8B7953',
			markings: '635644',
			maleDisplay: 'AD7C42',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'CCAF7A',
	},
	'Tenontosaurus': {
		hasSpecial: false,
		name: '腱龙',
		diet: 'herbivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: '897258',
			body: '6C5541',
			flank: '4D3C33',
			markings: '382E2E',
			maleDisplay: '262325',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'DE8F47',
	},
	'Pachycephalosaurus': {
		hasSpecial: false,
		name: '肿头龙',
		diet: 'herbivore',
		patterns: ['1', '2', '3', '4', '5', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: '807C71',
			body: '6C635E',
			flank: '454A4D',
			markings: '2A2A2B',
			maleDisplay: '7C4538',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: '90BC9A',
	},
	'Dryosaurus': {
		hasSpecial: false,
		name: '橡树龙',
		diet: 'herbivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'A08265',
			body: '6C6C2F',
			flank: '434830',
			markings: '232B24',
			maleDisplay: '3C526C',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: 'CC9D8E',
			claws: '312E27'
		},
		eyeColor: 'FFC8BB',
	},
	'Hypsilophodon': {
		hasSpecial: false,
		name: '棱齿龙',
		diet: 'herbivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: '4E4E4F',
			body: 'D2AF44',
			flank: 'C17126',
			markings: '2C251C',
			maleDisplay: '354370',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'FFBD6C',
	},
	'Kentrosaurus': {
		hasSpecial: false,
		name: '肯氏龙',
		diet: 'herbivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'BBAC97',
			body: 'B5955D',
			flank: '5D534A',
			markings: '2E2A23',
			maleDisplay: 'C75C2E',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: 'A55F4A',
			claws: '312E27'
		},
		eyeColor: '978C62',
	},
	'Gallimimus': {
		hasSpecial: false,
		name: '似鸡龙',
		diet: 'omnivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'E2C69F',
			body: 'D7AC6C',
			flank: 'AA8160',
			markings: '69534F',
			maleDisplay: '557A6A',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'E28A00',
	},
	'Beipiaosaurus': {
		hasSpecial: true,
		name: '北票龙',
		diet: 'omnivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: '342A2A',
			body: 'A7A697',
			flank: '51515A',
			markings: '70707E',
			maleDisplay: 'F2BE55',
			special: '353535',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'FFA34C',
	},
	'Oviraptor': {
		hasSpecial: false,
		name: '窃蛋龙',
		diet: 'omnivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: '5A5A5A',
			body: '2179C0',
			flank: '2B3E94',
			markings: '232523',
			maleDisplay: '8F3718',
			special: '000000',
		teeth: 'A08A74',
		mouth: 'B56E5A',
		claws: 'B09776'
	},
	eyeColor: 'AC4D3C',
	// 简单模式（与 Gallimimus 一致）：只播成年 Idle + 形态键(morph)，不做 additive 骨骼叠加。
	// 年龄段滑块仅通过 morph 控制幼态/成体体型，不碰骨骼姿态——稳定、不会把模型算飞。
	// 完整动作集(含 vocal)在 Oviraptor_both.glb，主文件 Oviraptor.glb 缺这些，故 modelFile 指向 both。
	modelFile: 'Oviraptor_both.glb',
},
	'Tyrannosaurus': {
		hasSpecial: false,
		name: '霸王龙',
		diet: 'carnivore',
	patterns: ['1', '2', '3', '4', '5', 'Juvenile', 'Hatchling', 'Grizzly_Juvenile'],
	// 皮肤4 官方配色（配色3/配色4）带 Special 通道 → 该图案显示 special 行
	// Juvenile 纹理：独立青年纹理，给非 Grizzly 皮肤用（不跟随 pattern4）
	// Grizzly_Juvenile：grizzly（pattern4）的青年版，独立图案选项，默认配色与 special 规则跟随 pattern4
	patternMeta: { '4': { hasSpecial: true }, 'Grizzly_Juvenile': { hasSpecial: true, sameAs: '4' } },
		colors: {
			underbelly: 'D3B48B',
			body: '897559',
			flank: '594934',
			markings: '342F29',
			maleDisplay: '6C3729',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'C76E00',
	},
	'Deinosuchus': {
		hasSpecial: false,
		name: '恐鳄',
		diet: 'carnivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'A09474',
			body: '6C5C41',
			flank: '3F3F3F',
			markings: '202020',
			maleDisplay: '59342B',
			special: '000000',
			teeth: 'B3A37C',
			mouth: '95735E',
			claws: '312E27'
		},
		eyeColor: 'FFFA6C',
	},
	'Allosaurus': {
		hasSpecial: false,
		name: '异特龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', '4','Juvenile', 'Hatchling', 'HatchlingOld'],
		colors: {
			underbelly: 'FFE8C4',
			body: 'F2C688',
			flank: 'AA9382',
			markings: '55514B',
			maleDisplay: 'B5646E',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '61443E',
			claws: '312E27'
		},
		eyeColor: 'FFCE85',
	},
	'Ceratosaurus': {
		hasSpecial: false,
		name: '角鼻龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', '3_Old', 'Juvenile', 'Hatchling', 'HatchlingOld', '1Old', 'JuvenileOld'],
		colors: {
			underbelly: 'E9C8AF',
			body: 'E3AF81',
			flank: 'A58471',
			markings: '5D4E47',
			maleDisplay: 'BA5F4A',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'F2AB00',
	},
	'Carnotaurus': {
		hasSpecial: false,
		name: '食肉牛龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', '4', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'AD9788',
			body: 'A77F65',
			flank: '825A50',
			markings: '453B33',
			maleDisplay: 'B05338',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '3F3932'
		},
		eyeColor: 'FFC23D',
	},
	'Dilophosaurus': {
		hasSpecial: false,
		name: '双冠龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: '9D8D7C',
			body: 'C08F78',
			flank: 'A16C60',
			markings: '5D4343',
			maleDisplay: 'E78D60',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '2C303F',
			claws: '33302C'
		},
		eyeColor: 'ADAC27',
	},
	'Omniraptor': {
		hasSpecial: false,
		name: '全能盗龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', '4', '5', '1Old', '6', 'Juvenile', 'Hatchling', 'Hatchling_1'],
		colors: {
			underbelly: 'AA987F',
			body: '89694A',
			flank: '6C4D41',
			markings: '38312C',
			maleDisplay: '956E3C',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'FFB43F',
	},
	'Herrerasaurus': {
		hasSpecial: false,
		name: '埃雷拉龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', '4', '5', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'AAA382',
			body: 'B0C35F',
			flank: '727F4D',
			markings: '4B5849',
			maleDisplay: '955556',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: 'A08A74'
		},
		eyeColor: 'FFEC00',
	},
	'Pteranodon': {
		hasSpecial: false,
		name: '无齿翼龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'BCB19E',
			body: 'E1B05E',
			flank: '6C5F42',
			markings: '34302B',
			maleDisplay: 'AAA288',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '414242',
			claws: '3F3733'
		},
		eyeColor: 'C25622',
	},
	'Troodon': {
		hasSpecial: false,
		name: '伤齿龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'C4A989',
			body: '957B5C',
			flank: '6C604E',
			markings: '2F2525',
			maleDisplay: '3E87BC',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '4A617C',
			claws: '312E27'
		},
		eyeColor: 'FFFFFF',
	},
	'Austroraptor': {
		hasSpecial: false,
		name: '南方盗龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', '4', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: '2C3334',
			body: 'B5AFA7',
			flank: '8A6A50',
			markings: '4F3837',
			maleDisplay: '377D70',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: '688BB9',
	},
	'Baryonyx': {
		hasSpecial: false,
		name: '重爪龙',
		diet: 'carnivore',
		patterns: ['1', '2', '3', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: '9F8D79',
			body: '926D50',
			flank: '6D473A',
			markings: '1F1F1F',
			maleDisplay: '4C666D',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'CDA174',
	},
	'Avaceratops': {
		hasSpecial: false,
		name: '爱氏角龙',
		diet: 'omnivore',
		patterns: ['1', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'AA7947',
			body: '947631',
			flank: '6E612C',
			markings: '3F3616',
			maleDisplay: '945529',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: '895100',
	},
	'Camarasaurus': {
		hasSpecial: false,
		name: '圆顶龙',
		diet: 'herbivore',
		patterns: ['1', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'BAADA3',
			body: '8C7768',
			flank: '56473F',
			markings: '38312C',
			maleDisplay: '814D1A',
			special: '000000',
			teeth: 'A2967A',
			mouth: '9F6360',
			claws: '595448'
		},
		eyeColor: '5D712C',
	},
	'Quetzalcoatlus': {
		hasSpecial: false,
		name: '风神翼龙',
		diet: 'carnivore',
		patterns: ['1', 'Juvenile', 'Hatchling'],
		colors: {
			underbelly: 'AEA99F',
			body: '8C7768',
			flank: '645548',
			markings: '3A352B',
			maleDisplay: '6D3E33',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'FFFFFF',
	},
	'Parasaurolophus': {
		hasSpecial: false,
		name: '副栉龙',
		diet: 'herbivore',
		patterns: ['1'],
		colors: {
			underbelly: 'C6A98A',
			body: 'A67953',
			flank: '5D3E38',
			markings: '9C643A',
			maleDisplay: '247971',
			special: '000000',
			teeth: 'FFFFFF',
			mouth: '7C5859',
			claws: '312E27'
		},
		eyeColor: 'FFFFFF',
	},
	'Pterodactylus': {
		hasSpecial: false,
		name: '翼手龙',
		diet: 'carnivore',
		patterns: ['A'],
		colors: {
			underbelly: 'B28C63',
			body: '54453F',
			flank: '2E2523',
			markings: '863A1E',
			maleDisplay: 'D0793C',
			special: '000000',
			teeth: '94774A',
			mouth: '73434F',
			claws: '41392B'
		},
		eyeColor: 'FFFFFF',
	},
	'Compsognathus': {
		hasSpecial: false,
		name: '美颌龙',
		diet: 'carnivore',
		patterns: ['A'],
		colors: {
			underbelly: 'A09D82',
			body: '897F53',
			flank: '536C45',
			markings: '1C3434',
			maleDisplay: '176C57',
			special: '000000',
			teeth: 'AA8D6F',
			mouth: '89685E',
			claws: '41392B'
		},
		eyeColor: 'FFFFFF',
	}
};

// 官方默认配色 (v0.5.9.16)：配色1 覆盖旧默认（重置按钮 / 配色方案下拉自动生效）。
// 旧默认若与配色1不同，已作为「旧配色1」归档进 OFFICIAL_SCHEMES.archived，仍可手动套用。
// 数据来源 DinoDefaultSkins.md，由 tools/build-official-schemes.mjs 生成，勿手改。
import { OFFICIAL_DEFAULT_COLORS, OFFICIAL_PATTERN_SPECIAL } from './skin-official-schemes.js?v=0.5.9.78';
for (const [_k, _colors] of Object.entries(OFFICIAL_DEFAULT_COLORS)) {
	if (DINOSAUR_DATA[_k]) DINOSAUR_DATA[_k].colors = { ...DINOSAUR_DATA[_k].colors, ..._colors };
}

export const CANNIBAL_COLORS = {
	underbelly: 'FFC0C1',
	body: 'A8A8A8',
	flank: 'DDD1CB',
	markings: '898989',
	maleDisplay: '8A5858',
	special: '000000',
	teeth: 'C8A38B',
	mouth: 'C28E8E',
	claws: '29271F'
};

export const DIET_COLORS = {
	herbivore: '#8bc34a',
	omnivore: '#ffb366',
	carnivore: '#ff6b7a'
};
export const DIET_LABELS = {
	herbivore: '草食',
	omnivore: '杂食',
	carnivore: '肉食'
};

/* =========================================================================
 * patternMeta — 按「皮肤」(恐龙+图案) 细化的可选元数据
 * -------------------------------------------------------------------------
 * 背景: 官方后续为许多恐龙发布了新皮肤, 原本没有 special 区域的恐龙现在
 *       某些皮肤自带 special 区域; 同时每个官方皮肤有自己固定的默认配色。
 *       旧逻辑 hasSpecial 是「每只恐龙一个布尔」, 无法精确到皮肤, 导致在
 *       红绿交界调色时把无 special 通道的蒙版误涂 (怪色块)。
 *
 * 用法: 在 DINOSAUR_DATA[dino] 下加一个 patternMeta 表, key = pattern id:
 *   DINOSAUR_DATA['Triceratops'].patternMeta = {
 *     '6': {
 *       code: 6,            // 皮肤码中的纹理位 (CNRE 为单数字 0-9; Nyor p 可为字符串)
 *                          //   省略 → 按旧规则 patternToIndex 推导
 *       hasSpecial: true,   // 该皮肤是否有 special 区域 (覆盖恐龙级 hasSpecial)
 *       schemes: [          // 官方只读配色预设 (配色1 / 配色2 ...)
 *         { name: '配色1', colors: { body:'...', ... }, eyeColor: 'FFFFFF' },
 *         { name: '配色2', colors: { body:'...', ... }, eyeColor: 'FFFFFF' },
 *       ],
 *     },
 *   };
 * 未配置 patternMeta 的恐龙/皮肤 → 全部回退旧行为, 完全向后兼容。
 * ========================================================================= */

// 旧规则: pattern 名称 → 数字索引 (与编解码器保持一致, 作为回退)
function _patternToIndexLegacy(pattern) {
    if (!pattern) return 0;
    const letter = pattern.startsWith('Pattern_') ? pattern.slice(8) : pattern;
    if (letter.length === 1 && /^[A-Z]$/.test(letter)) return letter.charCodeAt(0) - 65; // A=0
    if (/^\d+$/.test(letter)) {
        const num = parseInt(letter, 10);
        if (num >= 1 && num <= 26) return num - 1;
    }
    return 0;
}

// 取某皮肤在皮肤码中的纹理位 (优先 patternMeta.code, 否则旧规则)
export function getPatternCode(dino, patternId) {
    const meta = DINOSAUR_DATA[dino]?.patternMeta?.[patternId];
    if (meta && meta.code !== undefined && meta.code !== null) return meta.code;
    return _patternToIndexLegacy(patternId);
}

// 由皮肤码纹理位反查 patternId + hasSpecial + schemes (按恐龙)
export function resolvePatternByCode(dino, code) {
    const metaMap = DINOSAUR_DATA[dino]?.patternMeta;
    if (metaMap) {
        for (const [id, meta] of Object.entries(metaMap)) {
            if (String(meta.code) === String(code)) {
                return { id, hasSpecial: !!meta.hasSpecial, schemes: meta.schemes || null };
            }
        }
    }
    return null;
}

// 取某皮肤的 hasSpecial (优先 patternMeta, 其次官方配色数据推断, 最后回退恐龙级)
export function getPatternHasSpecial(dino, patternId) {
    const pid = String(patternId || '1').replace(/^Pattern_/, '');
    const meta = DINOSAUR_DATA[dino]?.patternMeta?.[pid];
    if (meta && meta.hasSpecial !== undefined) return !!meta.hasSpecial;
    // 若 patternMeta 声明 sameAs，继承目标皮肤的 hasSpecial / 官方 special 规则
    if (meta && meta.sameAs) {
        const samePid = String(meta.sameAs).replace(/^Pattern_/, '');
        const sameMeta = DINOSAUR_DATA[dino]?.patternMeta?.[samePid];
        if (sameMeta && sameMeta.hasSpecial !== undefined) return !!sameMeta.hasSpecial;
        const official = OFFICIAL_PATTERN_SPECIAL?.[dino];
        if (official && official[samePid] === true) return true;
    }
    // 根据 MD 官方配色推断：某图案（或 shared=1/2/3）的配色真实声明了 special 通道
    const official = OFFICIAL_PATTERN_SPECIAL?.[dino];
    if (official) {
        if (official[pid] === true) return true;
        if ((pid === '1' || pid === '2' || pid === '3') && official.shared === true) return true;
    }
    return !!(DINOSAUR_DATA[dino]?.hasSpecial);
}

// 取某皮肤的官方配色预设 (无则返回 null)
export function getPatternSchemes(dino, patternId) {
    const meta = DINOSAUR_DATA[dino]?.patternMeta?.[patternId];
    return meta?.schemes || null;
}