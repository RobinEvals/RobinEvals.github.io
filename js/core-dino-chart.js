/**
 * 恐龙图表核心模块
 * 负责: 数据插值、曲线生成、图表渲染
 */

const CoreDinoChart = (function() {
    const SPEED_CONVERT = 0.036;
    
    // 数据点定义
    const DATA_POINTS = [
        { percent: 0, time: 0, label: "0%" },
        { percent: 25, time: 0.25, label: "25%" },
        { percent: 37.5, time: 0.375, label: "37.5%" },
        { percent: 50, time: 0.5, label: "50%" },
        { percent: 62.5, time: 0.625, label: "62.5%" },
        { percent: 75, time: 0.75, label: "75%" },
        { percent: 87.5, time: 0.875, label: "87.5%" },
        { percent: 100, time: 1.0, label: "100%" }
    ];
    
    // 自定义X轴位置 (50%居中)
    const X_POSITIONS = [0, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1];
    
    // 线性插值
    function interpolate(points, time) {
        if (!points || points.length === 0) return 0;
        const exact = points.find(p => Math.abs(p.time - time) < 0.0001);
        if (exact) return exact.value;
        
        const sorted = [...points].sort((a, b) => a.time - b.time);
        if (time <= sorted[0].time) return sorted[0].value;
        if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;
        
        for (let i = 0; i < sorted.length - 1; i++) {
            if (time >= sorted[i].time && time <= sorted[i + 1].time) {
                const t = (time - sorted[i].time) / (sorted[i + 1].time - sorted[i].time);
                return sorted[i].value + t * (sorted[i + 1].value - sorted[i].value);
            }
        }
        return sorted[sorted.length - 1].value;
    }
    
    // 根据X位置获取实际百分比
    function getPercentFromPosition(pos) {
        for (let i = 0; i < X_POSITIONS.length - 1; i++) {
            if (pos >= X_POSITIONS[i] && pos <= X_POSITIONS[i + 1]) {
                const t = (pos - X_POSITIONS[i]) / (X_POSITIONS[i + 1] - X_POSITIONS[i]);
                return DATA_POINTS[i].percent + t * (DATA_POINTS[i + 1].percent - DATA_POINTS[i].percent);
            }
        }
        return pos <= 0 ? 0 : 100;
    }
    
    // 获取恐龙可用的移动类型
    function getMoveTypes(dino) {
        const types = [];
        if (dino.speeds.walk) types.push('walk');
        if (dino.speeds.trot) types.push('trot');
        if (dino.speeds.sprint) types.push('sprint');
        if (dino.speeds.crouch) types.push('crouch');
        if (dino.speeds.sprintBiped) types.push('sprintBiped');
        return types;
    }
    
    function getMoveTypeName(type) {
        const names = { walk: "行走", trot: "快走", sprint: "冲刺", crouch: "下蹲", sprintBiped: "双足冲刺" };
        return names[type] || type;
    }
    
    // 获取曲线数据
    function getCurve(dino, curveType, dataType, subType = null) {
        return DATA_POINTS.map(point => {
            const time = point.time;
            if (curveType === 'standard' && time > 0.75) return null;
            if ((curveType === 'primeElder' || curveType === 'frailElder') && time < 0.75) return null;
            
            if (dataType === 'weight') {
                return interpolate(dino.weight[curveType], time);
            } else if (dataType === 'speed' && subType) {
                const speedData = dino.speeds[subType];
                return speedData ? interpolate(speedData[curveType], time) : null;
            } else if (dataType === 'attackPower') {
                return interpolate(dino.attackPower[curveType], time);
            }
            return null;
        });
    }
    
    // 获取攻击力曲线
    function getAttackCurve(dino, attackKey, curveType) {
        const attack = dino.attackDamage[attackKey];
        if (!attack) return DATA_POINTS.map(() => null);
        
        return DATA_POINTS.map(point => {
            const time = point.time;
            if (curveType === 'standard' && time > 0.75) return null;
            if ((curveType === 'primeElder' || curveType === 'frailElder') && time < 0.75) return null;
            const multiplier = interpolate(dino.attackPower[curveType], time);
            return attack.baseValue * multiplier;
        });
    }
    
    // 获取叠加数据
    function getOverlay(dino, type, attackKey = null) {
        if (type === 'weight') {
            return {
                name: `${dino.displayName} - 体重`,
                color: dino.color,
                data: DATA_POINTS.map(p => interpolate(dino.weight.standard, p.time))
            };
        } else if (type === 'attack' && attackKey) {
            const attack = dino.attackDamage[attackKey];
            if (!attack) return null;
            return {
                name: `${dino.displayName} - ${attackKey}`,
                color: dino.color,
                data: DATA_POINTS.map(p => attack.baseValue * interpolate(dino.attackPower.standard, p.time))
            };
        }
        return null;
    }
    
    // 渲染图表
    function renderChart(ctx, dino, config) {
        const { chartType, speedType, overlayData, attackKey } = config;
        
        let datasets = [];
        let yLabel = "";
        let title = "";
        let unit = "";
        let multiplier = 1;
        
        // 速度图表
        if (chartType === 'speed') {
            multiplier = SPEED_CONVERT;
            unit = "km/h";
            
            const standard = getCurve(dino, 'standard', 'speed', speedType);
            const prime = getCurve(dino, 'primeElder', 'speed', speedType);
            const frail = getCurve(dino, 'frailElder', 'speed', speedType);
            
            datasets.push({ label: "标准生长", data: standard.map(v => v !== null ? v * multiplier : null), borderColor: "#007aff", borderWidth: 2.5, pointRadius: 4, tension: 0 });
            datasets.push({ label: "Prime Elder (壮年)", data: prime.map(v => v !== null ? v * multiplier : null), borderColor: "#34c759", borderWidth: 2, borderDash: [5, 5], tension: 0 });
            datasets.push({ label: "Frail Elder (衰老)", data: frail.map(v => v !== null ? v * multiplier : null), borderColor: "#ff3b30", borderWidth: 2, borderDash: [8, 4], tension: 0 });
            
            yLabel = `速度 (${unit})`;
            title = `${dino.displayName} - ${getMoveTypeName(speedType)}速度`;
        }
        // 体重图表
        else if (chartType === 'weight') {
            unit = dino.weight.unit;
            
            const standard = getCurve(dino, 'standard', 'weight');
            const prime = getCurve(dino, 'primeElder', 'weight');
            const frail = getCurve(dino, 'frailElder', 'weight');
            
            datasets.push({ label: "标准生长", data: standard, borderColor: "#007aff", borderWidth: 2.5, pointRadius: 4, tension: 0 });
            datasets.push({ label: "Prime Elder (壮年)", data: prime, borderColor: "#34c759", borderWidth: 2, borderDash: [5, 5], tension: 0 });
            datasets.push({ label: "Frail Elder (衰老)", data: frail, borderColor: "#ff3b30", borderWidth: 2, borderDash: [8, 4], tension: 0 });
            
            yLabel = `体重 (${unit})`;
            title = `${dino.displayName} - 体重生长`;
        }
        // 攻击力图表
        else if (chartType === 'attack') {
            unit = "damage";
            const colors = ["#007aff", "#34c759", "#ff9500", "#af52de", "#ff3b30", "#5856d6"];
            
            Object.keys(dino.attackDamage).forEach((key, idx) => {
                datasets.push({
                    label: `${key}`,
                    data: getAttackCurve(dino, key, 'standard'),
                    borderColor: colors[idx % colors.length],
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0
                });
            });
            yLabel = `伤害 (${unit})`;
            title = `${dino.displayName} - 攻击力生长`;
        }
        
        // 添加叠加数据
        if (overlayData) {
            datasets.push({
                label: `叠加: ${overlayData.name}`,
                data: overlayData.data,
                borderColor: overlayData.color || "#af52de",
                borderWidth: 2,
                borderDash: [2, 4],
                pointRadius: 2,
                tension: 0
            });
        }
        
        // 转换为 scatter 格式
        const scatterDatasets = datasets.map(ds => ({
            ...ds,
            data: ds.data.map((v, i) => v !== null ? { x: X_POSITIONS[i], y: v } : null).filter(v => v),
            showLine: true
        }));
        
        return {
            type: 'scatter',
            datasets: scatterDatasets,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: "top", labels: { font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                if (!ctx.raw) return null;
                                return `${ctx.dataset.label}: ${ctx.raw.y.toFixed(2)} ${unit}`;
                            },
                            afterLabel: (ctx) => {
                                const x = ctx.raw.x;
                                let percent = 0;
                                for (let i = 0; i < X_POSITIONS.length; i++) {
                                    if (Math.abs(X_POSITIONS[i] - x) < 0.05) percent = DATA_POINTS[i].percent;
                                }
                                return `成长度: ${percent}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0, max: 1,
                        title: { display: true, text: "成长度" },
                        ticks: {
                            stepSize: 0.25,
                            callback: (v) => {
                                if (Math.abs(v - 0) < 0.05) return "0%";
                                if (Math.abs(v - 0.25) < 0.05) return "25%";
                                if (Math.abs(v - 0.5) < 0.05) return "50%";
                                if (Math.abs(v - 0.75) < 0.05) return "75%";
                                if (Math.abs(v - 1.0) < 0.05) return "100%";
                                return "";
                            }
                        }
                    },
                    y: { title: { display: true, text: yLabel }, beginAtZero: true }
                }
            },
            title: title
        };
    }
    
    return {
        DATA_POINTS,
        X_POSITIONS,
        SPEED_CONVERT,
        interpolate,
        getPercentFromPosition,
        getMoveTypes,
        getMoveTypeName,
        getOverlay,
        renderChart
    };
})();