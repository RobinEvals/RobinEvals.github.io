/**
 * 恐龙数据可视化 UI 模块
 */

document.addEventListener('DOMContentLoaded', function() {
    // ==================== 状态变量 ====================
    let currentDinoId = "Carnotaurus";
    let currentChartType = "speed";
    let currentSpeedType = "sprint";
    let currentOverlay = "none";
    let currentAttackKey = "Bite";
    let chartInstance = null;
    
    // ==================== DOM 元素 ====================
    let dinoSelect, chartCanvas, chartTitle, cursorLine, tooltip;
    let growthTableBody, speedTableBody, weightTableBody, attackList, weightRange;
    let growthQuery, queryBtn, queryResult;
    let overlayNone, overlayWeight, overlayAttack, speedContainer;
    let themeToggle;
    
    // ==================== 辅助函数 ====================
    function getDino() { return DinosaursData[currentDinoId]; }
    
    function getDiet(dinoId) {
        return DinoDietData[dinoId] || 'herbivore';
    }
    
    function getOverlayData() {
        if (currentOverlay === "none") return null;
        const dino = getDino();
        if (currentOverlay === "weight") return CoreDinoChart.getOverlay(dino, 'weight');
        if (currentOverlay === "attack") return CoreDinoChart.getOverlay(dino, 'attack', currentAttackKey);
        return null;
    }
    
    // ==================== 日夜间模式 ====================
    function initTheme() {
        const savedTheme = localStorage.getItem('dino-theme');
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeToggle) themeToggle.textContent = '☀️';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            if (themeToggle) themeToggle.textContent = '🌙';
        }
    }
    
    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('dino-theme', 'light');
            if (themeToggle) themeToggle.textContent = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('dino-theme', 'dark');
            if (themeToggle) themeToggle.textContent = '☀️';
        }
        drawChart();
    }
    
    // ==================== 更新恐龙下拉框 (按食性分组) ====================
    function updateDinoSelect() {
        const currentVal = dinoSelect.value;
        dinoSelect.innerHTML = '';
        
        const groups = [
            { id: 'carnivore', label: '🥩 肉食恐龙', icon: '🥩' },
            { id: 'herbivore', label: '🌿 草食恐龙', icon: '🌿' },
            { id: 'omnivore', label: '🍗 杂食恐龙', icon: '🍗' }
        ];
        
        const allDinos = Object.entries(DinosaursData).map(([id, data]) => ({
            id, name: data.displayName, chineseName: data.chineseName, diet: getDiet(id)
        }));
        
        for (const group of groups) {
            const groupDinos = allDinos.filter(d => d.diet === group.id);
            if (groupDinos.length === 0) continue;
            groupDinos.sort((a, b) => a.name.localeCompare(b.name));
            
            const optgroup = document.createElement('optgroup');
            optgroup.label = `${group.icon} ${group.label} (${groupDinos.length})`;
            
            for (const dino of groupDinos) {
                const option = document.createElement('option');
                option.value = dino.id;
                option.textContent = `${dino.name} (${dino.chineseName})`;
                if (dino.id === currentVal || (currentVal === '' && dino.id === currentDinoId)) {
                    option.selected = true;
                    currentDinoId = dino.id;
                }
                optgroup.appendChild(option);
            }
            dinoSelect.appendChild(optgroup);
        }
    }
    
    // ==================== 图表绘制 ====================
    function drawChart() {
        const dino = getDino();
        if (!dino) return;
        
        const ctx = chartCanvas.getContext('2d');
        if (chartInstance) chartInstance.destroy();
        
        const config = {
            chartType: currentChartType,
            speedType: currentSpeedType,
            overlayData: getOverlayData(),
            attackKey: currentAttackKey
        };
        
        const result = CoreDinoChart.renderChart(ctx, dino, config);
        if (result) {
            chartInstance = new Chart(ctx, { type: result.type, data: { datasets: result.datasets }, options: result.options });
            chartTitle.textContent = result.title;
        }
    }
    
    // ==================== 更新速度按钮 ====================
    function updateSpeedButtons() {
        const dino = getDino();
        const types = CoreDinoChart.getMoveTypes(dino);
        
        if (!types.includes(currentSpeedType) && types.length) currentSpeedType = types[0];
        
        speedContainer.innerHTML = '';
        types.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'btn speed-type-btn' + (type === currentSpeedType ? ' active' : '');
            btn.textContent = CoreDinoChart.getMoveTypeName(type);
            btn.onclick = () => {
                currentSpeedType = type;
                updateSpeedButtons();
                drawChart();
                updateTables();
            };
            speedContainer.appendChild(btn);
        });
        
        speedContainer.style.display = (currentChartType === 'speed' && types.length > 1) ? 'flex' : 'none';
    }
    
    // ==================== 更新表格 ====================
    function updateTables() {
        const dino = getDino();
        if (!dino) return;
        
        const stages = [
            { p: 0, t: 0 },
            { p: 25, t: 0.25 },
            { p: 37.5, t: 0.375 },
            { p: 50, t: 0.5 },
            { p: 62.5, t: 0.625 },
            { p: 75, t: 0.75 },
            { p: 87.5, t: 0.875 },
            { p: 100, t: 1.0 }
        ];
        
        let growthHtml = "", speedHtml = "", weightHtml = "";
        let allWeights = [];
        const types = CoreDinoChart.getMoveTypes(dino);
        
        for (const s of stages) {
            const usePrime = s.p >= 75;
            const curve = usePrime ? 'primeElder' : 'standard';
            
            const weight = CoreDinoChart.interpolate(dino.weight[curve], s.t);
            allWeights.push(weight);
            
            const speedVals = {};
            for (const t of types) {
                speedVals[t] = CoreDinoChart.interpolate(dino.speeds[t]?.[curve], s.t);
            }
            
            growthHtml += `<tr>
                <td>${s.p}%</td>
                <td>${weight.toFixed(1)}</td>
                <td>${(speedVals.sprint ? (speedVals.sprint * CoreDinoChart.SPEED_CONVERT).toFixed(1) : '-')}</td>
            </table>`;
            
            let speedRow = `<tr><td>${s.p}%</td>`;
            for (const t of types) {
                const val = speedVals[t];
                speedRow += `<td>${val !== undefined ? (val * CoreDinoChart.SPEED_CONVERT).toFixed(1) : '-'}</td>`;
            }
            speedRow += `</tr>`;
            speedHtml += speedRow;
            
            weightHtml += `<tr>
                <td>${s.p}%</td>
                <td>${weight.toFixed(1)}</td>
            </tr>`;
        }
        
        growthTableBody.innerHTML = growthHtml;
        
        let speedHeader = `<thead><tr><th>成长度</th>`;
        for (const t of types) speedHeader += `<th>${CoreDinoChart.getMoveTypeName(t)}</th>`;
        speedHeader += `</tr></thead>`;
        speedTableBody.innerHTML = speedHeader + `<tbody>${speedHtml}</tbody>`;
        weightTableBody.innerHTML = weightHtml;
        
        const maxW = Math.max(...allWeights), minW = Math.min(...allWeights);
        weightRange.textContent = `${minW.toFixed(0)} - ${maxW.toFixed(0)} ${dino.weight.unit || "kg"}`;
        
        // 攻击力列表
        let attackHtml = "";
        for (const [key, data] of Object.entries(dino.attackDamage)) {
            const adultMul = CoreDinoChart.interpolate(dino.attackPower.standard, 0.75);
            const primeMul = CoreDinoChart.interpolate(dino.attackPower.primeElder, 0.875);
            const frailMul = CoreDinoChart.interpolate(dino.attackPower.frailElder, 1.0);
            attackHtml += `
                <div class="attack-list-item ${key === currentAttackKey ? 'selected' : ''}" data-key="${key}">
                    <span class="attack-name">${key}</span>
                    <span class="attack-value">基础:${data.baseValue} | 成年:${(data.baseValue * adultMul).toFixed(0)} | 壮年:${(data.baseValue * primeMul).toFixed(0)} | 老年:${(data.baseValue * frailMul).toFixed(0)}</span>
                </div>
            `;
        }
        attackList.innerHTML = attackHtml;
        
        document.querySelectorAll('.attack-list-item').forEach(el => {
            el.onclick = () => {
                currentAttackKey = el.dataset.key;
                updateTables();
                if (currentChartType === 'attack') drawChart();
                else if (currentOverlay === 'attack') drawChart();
            };
        });
    }
    
    // ==================== 成长度查询 ====================
    function queryGrowth() {
        let p = parseFloat(growthQuery.value);
        if (isNaN(p)) p = 75;
        p = Math.min(100, Math.max(0, p));
        growthQuery.value = p;
        
        const dino = getDino();
        const time = p / 100;
        let result = `<strong>成长度: ${p.toFixed(3)}%</strong><br>`;
        
        if (currentChartType === 'weight') {
            const std = CoreDinoChart.interpolate(dino.weight.standard, time);
            const prime = p >= 75 ? CoreDinoChart.interpolate(dino.weight.primeElder, time) : null;
            const frail = p >= 75 ? CoreDinoChart.interpolate(dino.weight.frailElder, time) : null;
            if (p <= 75) result += `标准: ${std.toFixed(2)} kg<br>`;
            if (prime) result += `Prime Elder: ${prime.toFixed(2)} kg<br>`;
            if (frail) result += `Frail Elder: ${frail.toFixed(2)} kg`;
        } else if (currentChartType === 'speed') {
            const std = p <= 75 ? CoreDinoChart.interpolate(dino.speeds[currentSpeedType]?.standard, time) * CoreDinoChart.SPEED_CONVERT : null;
            const prime = p >= 75 ? CoreDinoChart.interpolate(dino.speeds[currentSpeedType]?.primeElder, time) * CoreDinoChart.SPEED_CONVERT : null;
            const frail = p >= 75 ? CoreDinoChart.interpolate(dino.speeds[currentSpeedType]?.frailElder, time) * CoreDinoChart.SPEED_CONVERT : null;
            if (std) result += `标准: ${std.toFixed(2)} km/h<br>`;
            if (prime) result += `Prime Elder: ${prime.toFixed(2)} km/h<br>`;
            if (frail) result += `Frail Elder: ${frail.toFixed(2)} km/h`;
        } else if (currentChartType === 'attack') {
            const attack = dino.attackDamage[currentAttackKey];
            if (attack) {
                const std = p <= 75 ? attack.baseValue * CoreDinoChart.interpolate(dino.attackPower.standard, time) : null;
                const prime = p >= 75 ? attack.baseValue * CoreDinoChart.interpolate(dino.attackPower.primeElder, time) : null;
                const frail = p >= 75 ? attack.baseValue * CoreDinoChart.interpolate(dino.attackPower.frailElder, time) : null;
                if (std) result += `标准: ${std.toFixed(2)} damage<br>`;
                if (prime) result += `Prime Elder: ${prime.toFixed(2)} damage<br>`;
                if (frail) result += `Frail Elder: ${frail.toFixed(2)} damage`;
            }
        }
        queryResult.innerHTML = result;
    }
    
    // ==================== 光标追踪 ====================
    function setupCursorTracking() {
        chartCanvas.addEventListener('mousemove', (e) => {
            if (!chartInstance?.scales?.x) return;
            const rect = chartCanvas.getBoundingClientRect();
            const xScale = chartInstance.scales.x;
            const x = e.clientX - rect.left;
            
            if (x < xScale.left || x > xScale.right) {
                cursorLine.style.opacity = '0';
                tooltip.style.display = 'none';
                return;
            }
            
            const pos = (x - xScale.left) / (xScale.right - xScale.left);
            const percent = CoreDinoChart.getPercentFromPosition(Math.min(1, Math.max(0, pos)));
            
            cursorLine.style.left = `${x}px`;
            cursorLine.style.opacity = '0.5';
            
            const dino = getDino();
            const time = percent / 100;
            let html = `<div class="tooltip-row"><span>成长度:</span><span>${percent.toFixed(2)}%</span></div>`;
            
            if (currentChartType === 'weight') {
                if (percent <= 75) html += `<div class="tooltip-row"><span>标准:</span><span>${CoreDinoChart.interpolate(dino.weight.standard, time).toFixed(2)} kg</span></div>`;
                if (percent >= 75) {
                    html += `<div class="tooltip-row"><span>Prime Elder:</span><span>${CoreDinoChart.interpolate(dino.weight.primeElder, time).toFixed(2)} kg</span></div>`;
                    html += `<div class="tooltip-row"><span>Frail Elder:</span><span>${CoreDinoChart.interpolate(dino.weight.frailElder, time).toFixed(2)} kg</span></div>`;
                }
            } else if (currentChartType === 'speed') {
                const convert = CoreDinoChart.SPEED_CONVERT;
                if (percent <= 75) html += `<div class="tooltip-row"><span>标准:</span><span>${(CoreDinoChart.interpolate(dino.speeds[currentSpeedType]?.standard, time) * convert).toFixed(2)} km/h</span></div>`;
                if (percent >= 75) {
                    html += `<div class="tooltip-row"><span>Prime Elder:</span><span>${(CoreDinoChart.interpolate(dino.speeds[currentSpeedType]?.primeElder, time) * convert).toFixed(2)} km/h</span></div>`;
                    html += `<div class="tooltip-row"><span>Frail Elder:</span><span>${(CoreDinoChart.interpolate(dino.speeds[currentSpeedType]?.frailElder, time) * convert).toFixed(2)} km/h</span></div>`;
                }
            } else if (currentChartType === 'attack') {
                const attack = dino.attackDamage[currentAttackKey];
                if (attack) {
                    if (percent <= 75) html += `<div class="tooltip-row"><span>标准:</span><span>${(attack.baseValue * CoreDinoChart.interpolate(dino.attackPower.standard, time)).toFixed(2)} damage</span></div>`;
                    if (percent >= 75) {
                        html += `<div class="tooltip-row"><span>Prime Elder:</span><span>${(attack.baseValue * CoreDinoChart.interpolate(dino.attackPower.primeElder, time)).toFixed(2)} damage</span></div>`;
                        html += `<div class="tooltip-row"><span>Frail Elder:</span><span>${(attack.baseValue * CoreDinoChart.interpolate(dino.attackPower.frailElder, time)).toFixed(2)} damage</span></div>`;
                    }
                }
            }
            
            tooltip.innerHTML = html;
            tooltip.style.display = 'block';
            
            let tx = e.clientX - rect.left + 15;
            let ty = e.clientY - rect.top - 30;
            if (tx + 200 > rect.width) tx = e.clientX - rect.left - 215;
            if (ty < 0) ty = e.clientY - rect.top + 20;
            tooltip.style.left = `${tx}px`;
            tooltip.style.top = `${ty}px`;
        });
        
        chartCanvas.addEventListener('mouseleave', () => {
            cursorLine.style.opacity = '0';
            tooltip.style.display = 'none';
        });
    }
    
    // ==================== 折叠卡片 ====================
    function initCollapsibleCards() {
        document.querySelectorAll('.data-card').forEach(card => {
            const header = card.querySelector('.data-card-title');
            if (header) {
                header.style.cursor = 'pointer';
                header.addEventListener('click', () => {
                    const content = card.querySelector('table, .attack-list');
                    if (content) content.style.display = content.style.display === 'none' ? '' : 'none';
                });
            }
        });
    }
    
    // ==================== 事件绑定 ====================
    function bindEvents() {
        dinoSelect.onchange = () => {
            currentDinoId = dinoSelect.value;
            updateSpeedButtons();
            drawChart();
            updateTables();
        };
        
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const type = btn.dataset.chart;
                if (['walk', 'trot', 'sprint', 'crouch'].includes(type)) {
                    currentChartType = 'speed';
                    currentSpeedType = type;
                    updateSpeedButtons();
                } else {
                    currentChartType = type;
                }
                drawChart();
                updateTables();
            };
        });
        
        overlayNone.onclick = () => { currentOverlay = 'none'; overlayNone.classList.add('active'); overlayWeight.classList.remove('active'); overlayAttack.classList.remove('active'); drawChart(); };
        overlayWeight.onclick = () => { currentOverlay = 'weight'; overlayWeight.classList.add('active'); overlayNone.classList.remove('active'); overlayAttack.classList.remove('active'); drawChart(); };
        overlayAttack.onclick = () => { currentOverlay = 'attack'; overlayAttack.classList.add('active'); overlayNone.classList.remove('active'); overlayWeight.classList.remove('active'); drawChart(); };
        
        queryBtn.onclick = queryGrowth;
        growthQuery.onkeypress = (e) => { if (e.key === 'Enter') queryGrowth(); };
        window.onresize = () => setTimeout(drawChart, 100);
        
        if (themeToggle) themeToggle.onclick = toggleTheme;
    }
    
    // ==================== 初始化 ====================
    function init() {
        dinoSelect = document.getElementById('dinoSelect');
        chartCanvas = document.getElementById('mainChart');
        chartTitle = document.getElementById('chartTitle');
        cursorLine = document.getElementById('chart-cursor-line');
        tooltip = document.getElementById('chart-tooltip');
        growthTableBody = document.getElementById('growthTableBody');
        speedTableBody = document.getElementById('speedTableBody');
        weightTableBody = document.getElementById('weightTableBody');
        attackList = document.getElementById('attackList');
        weightRange = document.getElementById('weightRange');
        growthQuery = document.getElementById('growthQuery');
        queryBtn = document.getElementById('queryBtn');
        queryResult = document.getElementById('queryResult');
        overlayNone = document.getElementById('overlayNone');
        overlayWeight = document.getElementById('overlayWeight');
        overlayAttack = document.getElementById('overlayAttack');
        speedContainer = document.getElementById('speedTypeContainer');
        themeToggle = document.getElementById('themeToggle');
        
        if (!speedContainer) {
            const div = document.createElement('div');
            div.id = 'speedTypeContainer';
            div.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;';
            document.querySelector('.chart-type-section').appendChild(div);
            speedContainer = document.getElementById('speedTypeContainer');
        }
        
        initTheme();
        updateDinoSelect();
        updateSpeedButtons();
        bindEvents();
        setupCursorTracking();
        drawChart();
        updateTables();
        initCollapsibleCards();
    }
    
    init();
});