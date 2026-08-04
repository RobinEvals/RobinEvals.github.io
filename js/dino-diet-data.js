/**
 * 恐龙食性数据
 * 以 skin-dino-data.js 为准，统一管理所有恐龙的食性
 */

const DinoDietData = {
    // ==================== 肉食动物 ====================
    'Tyrannosaurus': 'carnivore',
    'Deinosuchus': 'carnivore',
    'Allosaurus': 'carnivore',
    'Ceratosaurus': 'carnivore',
    'Carnotaurus': 'carnivore',
    'Dilophosaurus': 'carnivore',
    'Omniraptor': 'carnivore',
    'Herrerasaurus': 'carnivore',
    'Pteranodon': 'carnivore',
    'Troodon': 'carnivore',
    'Austroraptor': 'carnivore',
    'Baryonyx': 'carnivore',
    
    // ==================== 草食动物 ====================
    'Triceratops': 'herbivore',
    'Stegosaurus': 'herbivore',
    'Maiasaura': 'herbivore',
    'Diabloceratops': 'herbivore',
    'Tenontosaurus': 'herbivore',
    'Pachycephalosaurus': 'herbivore',
    'Dryosaurus': 'herbivore',
    'Hypsilophodon': 'herbivore',
    'Kentrosaurus': 'herbivore',
    
    // ==================== 杂食动物 ====================
    'Gallimimus': 'omnivore',
    'Beipiaosaurus': 'omnivore',
    'Oviraptor': 'omnivore',
	'Avaceratops': 'omnivore'
};

// 食性显示名称和颜色
const DietMeta = {
    carnivore: { label: '肉食', color: '#CC6C79', icon: '🥩' },
    herbivore: { label: '草食', color: '#8FCA5B', icon: '🌿' },
    omnivore: { label: '杂食', color: '#E8C08D', icon: '🍗' }
};

// 获取恐龙的食性
function getDinoDiet(dinoId) {
    return DinoDietData[dinoId] || 'herbivore';
}

// 按食性分组的恐龙列表 (从 DinosaursData 生成)
function getDinosByDiet(dinosData) {
    const result = { carnivore: [], herbivore: [], omnivore: [] };
    for (const [id, data] of Object.entries(dinosData)) {
        const diet = getDinoDiet(id);
        result[diet].push({ id, name: data.displayName, chineseName: data.chineseName });
    }
    return result;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DinoDietData, DietMeta, getDinoDiet, getDinosByDiet };
}