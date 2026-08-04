import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { hexToRgb } from './skin-gradient-generator.js';
import { DINOSAUR_DATA } from './skin-dino-data.js';
import { getEyeConfig, SHARED_EYE_TEXTURES } from './skin-eye-config.js';

const SCENE_BG = { dark: 0x000000, light: 0xe8e8e8, dusk: 0x2d1f1a };

const LIGHTING_PRESETS = {
    normal: {
        ambient: { color: 0x404060, intensity: 0.5 },
        hemiSky: 0x8899cc, hemiGround: 0x334466, hemiIntensity: 0.4,
        key: { color: 0xffeedd, intensity: 1.5, pos: [5, 8, 5] },
        fill: { color: 0x8899cc, intensity: 0.4, pos: [-3, 2, -2] },
        rim: { color: 0x443322, intensity: 0.3, pos: [0, -2, 2] }
    },
    bright: {
        ambient: { color: 0xffffff, intensity: 0.8 },
        hemiSky: 0xffffff, hemiGround: 0x888888, hemiIntensity: 0.6,
        key: { color: 0xffffff, intensity: 2.5, pos: [5, 8, 5] },
        fill: { color: 0xcccccc, intensity: 0.7, pos: [-3, 2, -2] },
        rim: { color: 0xffffff, intensity: 0.5, pos: [0, -2, 2] }
    },
    dusk: {
        ambient: { color: 0x604030, intensity: 0.4 },
        hemiSky: 0xff8855, hemiGround: 0x443322, hemiIntensity: 0.3,
        key: { color: 0xff9966, intensity: 1.0, pos: [5, 5, 5] },
        fill: { color: 0x886644, intensity: 0.3, pos: [-3, 2, -2] },
        rim: { color: 0x553322, intensity: 0.4, pos: [0, -2, 2] }
    },
    smooth: {
        ambient: { color: 0xffffff, intensity: 1.0 },
        hemiSky: 0xffffff, hemiGround: 0x888888, hemiIntensity: 0.8,
        key: { color: 0xffffff, intensity: 0.5, pos: [0, 5, 5] },
        fill: { color: 0xffffff, intensity: 0.3, pos: [-2, 3, -2] },
        rim: { color: 0xffffff, intensity: 0.2, pos: [0, -2, 2] }
    },
    flat: {
        ambient: { color: 0xffffff, intensity: 1.0 },
        hemiSky: 0xffffff, hemiGround: 0xffffff, hemiIntensity: 0.0,
        key: { color: 0xffffff, intensity: 0.0, pos: [5, 8, 5] },
        fill: { color: 0xffffff, intensity: 0.0, pos: [-3, 2, -2] },
        rim: { color: 0xffffff, intensity: 0.0, pos: [0, -2, 2] }
    },
    custom: {
        ambient: { color: 0x404060, intensity: 0.5 },
        hemiSky: 0x8899cc, hemiGround: 0x334466, hemiIntensity: 0.4,
        key: { color: 0xffeedd, intensity: 1.8, pos: [5, 7, 5] },
        fill: { color: 0x8899cc, intensity: 0.4, pos: [-3, 2, -2] },
        rim: { color: 0x443322, intensity: 0.3, pos: [0, -2, 2] }
    }
};
const LIGHTING_MODES = ['normal', 'bright', 'dusk', 'smooth', 'custom', 'flat'];
const LIGHTING_TITLES = { normal: '暗色光照', bright: '明亮光照', dusk: '黄昏光照', smooth: '柔光', custom: '自定义光照', flat: '三渲二/无光照' };
// 辅助：判断 HEX 颜色相对亮度，返回 true 表示偏亮
function isLightColor(hex) {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) return false;
    const r = parseInt(m[1].substring(0, 2), 16);
    const g = parseInt(m[1].substring(2, 4), 16);
    const b = parseInt(m[1].substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 140;
}

const VIEW_PRESETS = {
    front:  { pos: [0, 1.0, 5.5], target: [0, 1.0, 0] },
    back:   { pos: [0, 1.0, -5.5], target: [0, 1.0, 0] },
    left:   { pos: [-5.5, 1.0, 0], target: [0, 1.0, 0] },
    right:  { pos: [5.5, 1.0, 0], target: [0, 1.0, 0] },
    top:    { pos: [0, 6, 0.01], target: [0, 1.0, 0] },
    bottom: { pos: [0, -4, 0.01], target: [0, 1.0, 0] }
};

export class DinoPreview {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null; this.camera = null; this.renderer = null; this.controls = null;
        this.currentModel = null; this.currentMixer = null; this.clock = new THREE.Clock();
        this.loader = new GLTFLoader(); this.texLoader = new THREE.TextureLoader();
        this.currentPatternTex = null; this.currentMaskTex = null; this.currentColors = {};
        this.currentTheme = 'dark'; this.currentLighting = 'normal'; this.currentBg = 'dark';
        this.isFemale = false; this.normalMapEnabled = true; this.currentNormalTex = null;
        this.eyeColor = '#FFFFFF'; this.quality = 'medium'; this.shadowsEnabled = false;
        this.bodyMaterials = []; this.eyeMaterials = []; this.lights = {};
        this.eyeConfig = null; this.eyeNormalTex = null; this.eyeBumpTex = null; this.sharedEyeTexturesLoaded = false;
        this.irisImg = null; this.pupilImg = null; this.currentEyeTex = null; this._imgCache = {};
        this.bodyBackgroundImage = null; this.smoothRendering = false;
        this.cameraMode = 'perspective'; // 'perspective' | 'orthographic'
        this.gizmoCanvas = null; this.gizmoCtx = null;
        this.modelCenter = new THREE.Vector3();
        this.modelBaseScale = 1;
        this.modelUserScale = 1;
        this.currentDinoHasSpecial = false;
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingBarFill = document.getElementById('loading-bar-fill');
        this.loadingText = document.getElementById('loading-text');
        this.animationPaused = false;
        this.customLightColor = '#ffeedd';
        this.customLightAzimuth = 45;
        this.customLightElevation = 60;
        this.customBgColor = '#1a1a1a';
        this.gridEnabled = true;
        this.gridColor = '#292929';
        this.gridSize = 40;
        this.gridLineWidth = 2;
        this.onStateChange = null;
        this.init();
    }

    getAspect() {
        return window.innerWidth / window.innerHeight;
    }

    init() {
        this.scene = new THREE.Scene();
        this.setSceneBackground('dark');
        const aspect = this.getAspect();
        this.camera = this.createCamera(this.cameraMode, aspect);
        const initAngle = -30 * Math.PI / 180;
        const initDist = 5.8;
        const initHeight = 1.2;
        this.camera.position.set(Math.sin(initAngle) * initDist, initHeight, Math.cos(initAngle) * initDist);
        this.camera.lookAt(0, 0.8, 0);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);
        this.onResize();
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.8;
        this.controls.target.set(0, 0.8, 0);
        this.controls.minDistance = 0.8;
        this.controls.maxDistance = 12;
        this.controls.maxPolarAngle = Math.PI;
        // 鼠标按键映射：左键旋转 / 中键平移 / 右键平移（仅修改中键，其余保持 OrbitControls 默认）
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.PAN
        };
        this.controls.update();
        this.setupLights('normal');
        
        // 绑定新的 UI 菜单控制器
        this.setupNewUIControls();
        
        this.animate();
        this.createGizmo();
        window.addEventListener('resize', () => this.onResize());
        this.loadDefaultBackground();
    }
    
    // 绑定渲染菜单控制器
    setupNewUIControls() {
        // 1. 菜单展开/收起
        const menuToggle = document.getElementById('renderMenuToggle');
        const menuContent = document.getElementById('renderMenuContent');
        if (menuToggle && menuContent) {
            menuToggle.addEventListener('click', () => {
                menuContent.classList.toggle('open');
                menuToggle.classList.toggle('active');
            });
        }

        // 2. 质量
        const qualitySelect = document.getElementById('qualitySelect');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => this.setQuality(e.target.value));
        }

        // 3. 视图模式切换
        const cameraModeBtn = document.getElementById('cameraModeBtn');
        if (cameraModeBtn) {
            cameraModeBtn.addEventListener('click', () => {
                const next = this.cameraMode === 'perspective' ? 'orthographic' : 'perspective';
                this.switchCameraMode(next);
                cameraModeBtn.textContent = next === 'perspective' ? '透视' : '正交';
                cameraModeBtn.classList.toggle('active', next === 'orthographic');
                this.onStateChange?.();
            });
            cameraModeBtn.textContent = '透视';
        }

        // 4. 平滑
        const smoothBtn = document.getElementById('smoothToggleBtn');
        if (smoothBtn) {
            smoothBtn.addEventListener('click', () => {
                this.smoothRendering = !this.smoothRendering;
                smoothBtn.textContent = '平滑:' + (this.smoothRendering ? '开' : '关');
                smoothBtn.classList.toggle('active', this.smoothRendering);
                this.applySmoothRendering();
                this.onStateChange?.();
            });
            smoothBtn.textContent = '平滑:关';
        }

        // 5. 法线
        const normalBtn = document.getElementById('normalToggleBtn');
        if (normalBtn) {
            normalBtn.addEventListener('click', () => {
                this.normalMapEnabled = !this.normalMapEnabled;
                normalBtn.textContent = '法线:' + (this.normalMapEnabled ? '开' : '关');
                normalBtn.classList.toggle('active', this.normalMapEnabled);
                this.applyNormalMapState();
                this.onStateChange?.();
            });
            normalBtn.textContent = '法线:开';
            normalBtn.classList.add('active');
        }

        // 6. 光照 - 下拉菜单
        const lightSelect = document.getElementById('lightingSelect');
        if (lightSelect) {
            lightSelect.addEventListener('change', (e) => {
                this.currentLighting = e.target.value;
                this.applyLighting();
                this.updateLightingButton();
                this.onStateChange?.();
            });
            this.updateLightingButton();
        }

        // 6b. 自定义光照控件
        const customLightRow = document.getElementById('customLightRow');
        const customLightColor = document.getElementById('customLightColor');
        const customAzimuth = document.getElementById('customLightAzimuth');
        const customAzimuthVal = document.getElementById('customLightAzimuthValue');
        const customElevation = document.getElementById('customLightElevation');
        const customElevationVal = document.getElementById('customLightElevationValue');
        if (customLightColor) {
            customLightColor.addEventListener('input', (e) => {
                this.setCustomLight(e.target.value, null, null);
            });
        }
        if (customAzimuth && customAzimuthVal) {
            customAzimuth.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                customAzimuthVal.textContent = val + '°';
                this.setCustomLight(null, val, null);
            });
        }
        if (customElevation && customElevationVal) {
            customElevation.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                customElevationVal.textContent = val + '°';
                this.setCustomLight(null, null, val);
            });
        }

        // 7. 背景 - 下拉菜单
        const bgSelect = document.getElementById('bgSelect');
        if (bgSelect) {
            bgSelect.addEventListener('change', (e) => {
                this.setSceneBackground(e.target.value);
                this.onStateChange?.();
            });
        }

        // 8. 背景图上传
        const bgInput = document.getElementById('bgImageInput');
        if (bgInput) {
            bgInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.setBackgroundImage(e.target.files[0]);
            });
        }

        // 8b. 自定义纯色背景
        const customBgColor = document.getElementById('customBgColor');
        if (customBgColor) {
            customBgColor.addEventListener('input', (e) => {
                this.setCustomBgColor(e.target.value);
            });
        }

        // 8c. 网格背景叠加
        const gridToggleBtn = document.getElementById('gridToggleBtn');
        if (gridToggleBtn) {
            gridToggleBtn.addEventListener('click', () => {
                this.toggleGrid();
                gridToggleBtn.textContent = '网格: ' + (this.gridEnabled ? '开' : '关');
                gridToggleBtn.classList.toggle('active', this.gridEnabled);
                this._syncGridControlsVisibility();
            });
        }
        const gridColorInput = document.getElementById('gridColorInput');
        if (gridColorInput) {
            gridColorInput.addEventListener('input', (e) => this.setGridColor(e.target.value));
        }
        const gridColorHex = document.getElementById('gridColorHex');
        if (gridColorHex) {
            gridColorHex.addEventListener('change', (e) => {
                let v = e.target.value.trim();
                if (!v.startsWith('#')) v = '#' + v;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    this.setGridColor(v);
                    gridColorHex.value = v.toUpperCase();
                    if (gridColorInput) gridColorInput.value = v;
                } else {
                    gridColorHex.value = (this.gridColor || '#292929').toUpperCase();
                }
            });
        }
        const gridSizeSlider = document.getElementById('gridSizeSlider');
        const gridSizeValue = document.getElementById('gridSizeValue');
        if (gridSizeSlider) {
            gridSizeSlider.addEventListener('input', (e) => {
                const v = parseInt(e.target.value);
                this.setGridSize(v);
                if (gridSizeValue) gridSizeValue.textContent = v + 'px';
            });
        }
        const gridLineWidthSlider = document.getElementById('gridLineWidthSlider');
        const gridLineWidthValue = document.getElementById('gridLineWidthValue');
        if (gridLineWidthSlider) {
            gridLineWidthSlider.addEventListener('input', (e) => {
                const v = parseInt(e.target.value);
                this.setGridLineWidth(v);
                if (gridLineWidthValue) gridLineWidthValue.textContent = v + 'px';
            });
        }

        // 9. 模型缩放与视角还原
        const modelScaleSlider = document.getElementById('modelScaleSlider');
        const modelScaleValue = document.getElementById('modelScaleValue');
        if (modelScaleSlider) {
            modelScaleSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.setModelScale(val);
                if (modelScaleValue) modelScaleValue.textContent = val.toFixed(1) + 'x';
            });
        }
        const resetViewBtn = document.getElementById('resetViewBtn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => this.resetView());
        }

        // 10. 动画暂停/播放
        const animPauseBtn = document.getElementById('animPauseBtn');
        if (animPauseBtn) {
            animPauseBtn.addEventListener('click', () => {
                const paused = this.toggleAnimationPause();
                animPauseBtn.title = paused ? '播放动画' : '暂停动画';
                animPauseBtn.textContent = paused ? '播放动画' : '暂停动画';
                this.onStateChange?.();
            });
            animPauseBtn.title = '暂停动画';
        }
    }

    getPreviewState() {
        return {
            lighting: this.currentLighting,
            bg: this.currentBg,
            normalMap: this.normalMapEnabled,
            smooth: this.smoothRendering,
            cameraMode: this.cameraMode,
            quality: this.quality,
            animationPaused: this.animationPaused,
            customLightColor: this.customLightColor,
            customLightAzimuth: this.customLightAzimuth,
            customLightElevation: this.customLightElevation,
            customBgColor: this.customBgColor,
            gridEnabled: this.gridEnabled,
            gridColor: this.gridColor,
            gridSize: this.gridSize,
            gridLineWidth: this.gridLineWidth
        };
    }

    applyPreviewState(state) {
        if (!state) return;
        // 先恢复自定义光照参数（在应用光照之前）
        if (state.customLightColor) this.customLightColor = state.customLightColor;
        if (typeof state.customLightAzimuth === 'number') this.customLightAzimuth = state.customLightAzimuth;
        if (typeof state.customLightElevation === 'number') this.customLightElevation = state.customLightElevation;
        if (state.customBgColor) this.customBgColor = state.customBgColor;
        // 恢复网格状态（必须在 setSceneBackground 之前，因为 applyBackground 会用到）
        if (typeof state.gridEnabled === 'boolean') this.gridEnabled = state.gridEnabled;
        if (state.gridColor) this.gridColor = state.gridColor;
        if (typeof state.gridSize === 'number') this.gridSize = state.gridSize;
        if (typeof state.gridLineWidth === 'number') this.gridLineWidth = state.gridLineWidth;
        if (state.lighting && LIGHTING_MODES.includes(state.lighting)) {
            this.currentLighting = state.lighting;
            this.applyLighting();
            this.updateLightingButton();
        }
        if (state.bg) {
            this.setSceneBackground(state.bg, { fromPreset: true });
            const bgSel = document.getElementById('bgSelect');
            if (bgSel) bgSel.value = state.bg;
            // 同步自定义背景色选择器
            if (state.customBgColor) {
                const cbg = document.getElementById('customBgColor');
                if (cbg) cbg.value = state.customBgColor;
            }
        }
        if (typeof state.normalMap === 'boolean') {
            this.normalMapEnabled = state.normalMap;
            const btn = document.getElementById('normalToggleBtn');
            if (btn) { btn.textContent = '法线:' + (this.normalMapEnabled ? '开' : '关'); btn.classList.toggle('active', this.normalMapEnabled); }
            this.applyNormalMapState();
        }
        if (typeof state.smooth === 'boolean') {
            this.smoothRendering = state.smooth;
            const btn = document.getElementById('smoothToggleBtn');
            if (btn) { btn.textContent = '平滑:' + (this.smoothRendering ? '开' : '关'); btn.classList.toggle('active', this.smoothRendering); }
            this.applySmoothRendering();
        }
        if (state.cameraMode) {
            this.cameraMode = state.cameraMode;
            const btn = document.getElementById('cameraModeBtn');
            if (btn) { btn.textContent = state.cameraMode === 'perspective' ? '透视' : '正交'; btn.classList.toggle('active', state.cameraMode === 'orthographic'); }
            this.switchCameraMode(state.cameraMode);
        }
        if (state.quality) {
            this.setQuality(state.quality);
            const sel = document.getElementById('qualitySelect');
            if (sel) sel.value = state.quality;
        }
        if (typeof state.animationPaused === 'boolean') {
            this.animationPaused = state.animationPaused;
            const btn = document.getElementById('animPauseBtn');
            if (btn) {
                btn.title = state.animationPaused ? '播放动画' : '暂停动画';
                btn.textContent = state.animationPaused ? '播放动画' : '暂停动画';
            }
        }
        // 同步自定义光照 UI
        const clColor = document.getElementById('customLightColor');
        const clAz = document.getElementById('customLightAzimuth');
        const clAzVal = document.getElementById('customLightAzimuthValue');
        const clEl = document.getElementById('customLightElevation');
        const clElVal = document.getElementById('customLightElevationValue');
        if (clColor) clColor.value = this.customLightColor;
        if (clAz) clAz.value = this.customLightAzimuth;
        if (clAzVal) clAzVal.textContent = this.customLightAzimuth + '°';
        if (clEl) clEl.value = this.customLightElevation;
        if (clElVal) clElVal.textContent = this.customLightElevation + '°';
        // 同步网格 UI
        this._syncGridUI();
    }

    resetView() {
        const initAngle = -30 * Math.PI / 180;
        const initDist = 5.8;
        const initHeight = 1.2;
        this.camera.position.set(Math.sin(initAngle) * initDist, initHeight, Math.cos(initAngle) * initDist);
        this.controls.target.set(0, 0.8, 0);
        this.camera.lookAt(0, 0.8, 0);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    loadDefaultBackground() {
        this.bodyBackgroundImage = 'img/bg.png';
        this.currentBg = 'custom';
        this.applyBackground();
    }

    setBodyBackgroundImage(url) {
        // 保留兼容：直接走 applyBackground
        if (!url) this.bodyBackgroundImage = null;
        this.applyBackground();
    }

    applySmoothRendering() {
        for (const mat of this.bodyMaterials) {
            if (this.smoothRendering) {
                mat.roughness = 0.2;
                mat.metalness = 0.0;
            } else {
                mat.roughness = 0.6;
                mat.metalness = 0.1;
            }
            mat.needsUpdate = true;
        }
        this.renderer.render(this.scene, this.camera);
    }

    setQuality(quality) {
        this.quality = quality;
        switch(quality) {
            case 'low': this.renderer.setPixelRatio(1); this.renderer.toneMappingExposure = 1.0; break;
            case 'medium': this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); this.renderer.toneMappingExposure = 1.1; break;
            case 'high': this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); this.renderer.toneMappingExposure = 1.2; break;
        }
    }

    setShadows(enabled) {
        this.shadowsEnabled = enabled;
        this.renderer.shadowMap.enabled = enabled;
        if (this.lights.key) this.lights.key.castShadow = enabled;
    }

    setSceneBackground(mode, { fromPreset = false } = {}) {
        this.currentBg = mode;
        // 从预设恢复时不强制覆盖用户保存的网格开关/颜色；
        // 用户主动切换 dark/light/solid 时默认启用网格并自动配色
        if (!fromPreset && (mode === 'dark' || mode === 'light' || mode === 'solid')) {
            this.gridEnabled = true;
            if (mode === 'dark') this.gridColor = '#292929';
            else if (mode === 'light') this.gridColor = '#bdbdbd';
            else this.gridColor = isLightColor(this.customBgColor) ? '#bdbdbd' : '#292929';
            this._syncGridUI();
        }
        this.applyBackground();
    }

    // 统一背景渲染入口：根据 currentBg + gridEnabled 决定走 scene 色还是 body 网格
    applyBackground() {
        // 先清掉 body 上的网格/图片样式
        document.body.style.backgroundImage = '';
        document.body.style.backgroundColor = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundRepeat = '';

        // 自定义图片背景
        if (this.currentBg === 'custom') {
            this.scene.background = null;
            if (this.bodyBackgroundImage) {
                document.body.style.backgroundImage = `url('${this.bodyBackgroundImage}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundRepeat = 'no-repeat';
            }
            if (this.gridEnabled) this._applyGridOverlay();
            return;
        }
        // 透明背景
        if (this.currentBg === 'transparent') {
            this.scene.background = null;
            if (this.gridEnabled) this._applyGridOverlay();
            return;
        }
        // dark / light / solid：决定底色
        let baseColor;
        if (this.currentBg === 'solid') baseColor = this.customBgColor || '#1a1a1a';
        else if (this.currentBg === 'light') baseColor = '#e8e8e8';
        else baseColor = '#000000'; // dark 纯黑

        if (this.gridEnabled) {
            // canvas 透明，body 承载底色 + 网格
            this.scene.background = null;
            document.body.style.backgroundColor = baseColor;
            this._applyGridOverlay();
        } else {
            this.scene.background = new THREE.Color(baseColor);
        }
    }

    // 在 body 现有背景之上叠加网格线（两层 linear-gradient）
    _applyGridOverlay() {
        const c = this.gridColor || '#292929';
        const s = this.gridSize || 40;
        const w = Math.max(1, Math.min(5, parseInt(this.gridLineWidth) || 1));
        const grid = `linear-gradient(${c} ${w}px, transparent ${w}px), linear-gradient(90deg, ${c} ${w}px, transparent ${w}px)`;
        const existing = document.body.style.backgroundImage;
        if (existing && existing !== 'none') {
            // 已有图片底，网格叠在最上层
            document.body.style.backgroundImage = `${grid}, ${existing}`;
            document.body.style.backgroundSize = `${s}px ${s}px, ${s}px ${s}px, cover`;
            document.body.style.backgroundPosition = '0 0, 0 0, center';
            document.body.style.backgroundRepeat = 'repeat, repeat, no-repeat';
        } else {
            document.body.style.backgroundImage = grid;
            document.body.style.backgroundSize = `${s}px ${s}px, ${s}px ${s}px`;
            document.body.style.backgroundPosition = '0 0, 0 0';
            document.body.style.backgroundRepeat = 'repeat, repeat';
        }
    }

    toggleGrid(force) {
        this.gridEnabled = (typeof force === 'boolean') ? force : !this.gridEnabled;
        this.applyBackground();
        this.onStateChange?.();
    }

    setGridColor(hex) {
        this.gridColor = hex;
        const ch = document.getElementById('gridColorHex');
        if (ch) ch.value = (hex || '').toUpperCase();
        if (this.gridEnabled) this.applyBackground();
        this.onStateChange?.();
    }

    setGridSize(px) {
        this.gridSize = Math.max(8, Math.min(200, parseInt(px) || 40));
        if (this.gridEnabled) this.applyBackground();
        this.onStateChange?.();
    }

    setGridLineWidth(px) {
        this.gridLineWidth = Math.max(1, Math.min(5, parseInt(px) || 1));
        if (this.gridEnabled) this.applyBackground();
        this.onStateChange?.();
    }

    // 同步网格颜色/大小控件的显隐
    _syncGridControlsVisibility() {
        const row = document.getElementById('gridControlsRow');
        if (row) row.style.display = this.gridEnabled ? 'flex' : 'none';
    }

    // 从状态恢复网格 UI
    _syncGridUI() {
        const btn = document.getElementById('gridToggleBtn');
        if (btn) { btn.textContent = '网格: ' + (this.gridEnabled ? '开' : '关'); btn.classList.toggle('active', this.gridEnabled); }
        const ci = document.getElementById('gridColorInput'); if (ci) ci.value = this.gridColor;
        const ch = document.getElementById('gridColorHex'); if (ch) ch.value = (this.gridColor || '').toUpperCase();
        const gs = document.getElementById('gridSizeSlider'); if (gs) gs.value = this.gridSize;
        const gv = document.getElementById('gridSizeValue'); if (gv) gv.textContent = this.gridSize + 'px';
        const gl = document.getElementById('gridLineWidthSlider'); if (gl) gl.value = this.gridLineWidth;
        const gw = document.getElementById('gridLineWidthValue'); if (gw) gw.textContent = this.gridLineWidth + 'px';
        this._syncGridControlsVisibility();
    }

    setCustomBgColor(hex) {
        this.customBgColor = hex;
        if (this.currentBg !== 'solid') {
            this.currentBg = 'solid';
            const sel = document.getElementById('bgSelect');
            if (sel) sel.value = 'solid';
        }
        // solid 背景下根据底色亮暗自动切换网格颜色
        if (this.gridEnabled) {
            this.gridColor = isLightColor(hex) ? '#bdbdbd' : '#292929';
            this._syncGridUI();
        }
        this.applyBackground();
        this.onStateChange?.();
    }

    setBackgroundImage(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.bodyBackgroundImage = e.target.result;
            this.currentBg = 'custom';
            const sel = document.getElementById('bgSelect');
            if (sel) sel.value = 'custom';
            this.applyBackground();
            this.onStateChange?.();
        };
        reader.readAsDataURL(file);
    }

    cycleLighting() {
        const idx = LIGHTING_MODES.indexOf(this.currentLighting);
        this.currentLighting = LIGHTING_MODES[(idx + 1) % LIGHTING_MODES.length];
        this.applyLighting();
        this.updateLightingButton();
    }

    applyLighting() {
        this.setupLights(this.currentLighting);
        this.applyFlatMode(this.currentLighting === 'flat');
    }

    applyFlatMode(isFlat) {
        for (const mat of this.bodyMaterials) {
            if (isFlat) {
                mat.emissive.setRGB(1, 1, 1);
                mat.emissiveMap = mat.map;
                mat.emissiveIntensity = 1.0;
                mat.color.setRGB(0, 0, 0);
            } else {
                mat.emissive.setRGB(0, 0, 0);
                mat.emissiveMap = null;
                mat.emissiveIntensity = 1.0;
                mat.color.setRGB(1, 1, 1);
            }
            mat.needsUpdate = true;
        }
        for (const mat of this.eyeMaterials) {
            if (isFlat) {
                mat.emissive.setRGB(1, 1, 1);
                mat.emissiveMap = mat.map;
                mat.emissiveIntensity = 1.0;
                mat.color.setRGB(0, 0, 0);
            } else {
                mat.emissiveMap = null;
                mat.color.setRGB(1, 1, 1);
            }
            mat.needsUpdate = true;
        }
        if (!isFlat && this.eyeMaterials.length > 0) {
            this.resetEyeEmissive();
            this.setEyeColor(this.eyeColor);
        }
        this.renderer.render(this.scene, this.camera);
    }

    updateLightingButton() {
        const select = document.getElementById('lightingSelect');
        if (select) select.value = this.currentLighting;
        // 自定义光照行仅在 custom 模式下显示
        const customRow = document.getElementById('customLightRow');
        if (customRow) customRow.style.display = this.currentLighting === 'custom' ? 'flex' : 'none';
    }

    applyNormalMapState() {
        for (const mat of this.bodyMaterials) {
            if (this.normalMapEnabled && this.currentNormalTex) {
                mat.normalMap = this.currentNormalTex;
                mat.normalScale.set(1, 1);
            } else {
                mat.normalMap = null;
            }
            mat.needsUpdate = true;
        }
        this.renderer.render(this.scene, this.camera);
    }

    setupLights(mode) {
        if (this.lights.ambient) this.scene.remove(this.lights.ambient);
        if (this.lights.hemi) this.scene.remove(this.lights.hemi);
        if (this.lights.key) this.scene.remove(this.lights.key);
        if (this.lights.fill) this.scene.remove(this.lights.fill);
        if (this.lights.rim) this.scene.remove(this.lights.rim);
        const p = LIGHTING_PRESETS[mode] || LIGHTING_PRESETS.normal;
        this.lights.ambient = new THREE.AmbientLight(p.ambient.color, p.ambient.intensity);
        this.scene.add(this.lights.ambient);
        this.lights.hemi = new THREE.HemisphereLight(p.hemiSky, p.hemiGround, p.hemiIntensity);
        this.scene.add(this.lights.hemi);
        // 自定义模式：使用用户指定的主光颜色和方向
        let keyColor = p.key.color, keyIntensity = p.key.intensity, keyPos = p.key.pos;
        if (mode === 'custom') {
            keyColor = this.customLightColor;
            keyIntensity = 1.8;
            keyPos = this.calcLightPosition(this.customLightAzimuth, this.customLightElevation);
        }
        this.lights.key = new THREE.DirectionalLight(keyColor, keyIntensity);
        this.lights.key.position.set(...keyPos);
        this.lights.key.castShadow = this.shadowsEnabled;
        this.lights.key.shadow.mapSize.set(1024, 1024);
        this.scene.add(this.lights.key);
        this.lights.fill = new THREE.DirectionalLight(p.fill.color, p.fill.intensity);
        this.lights.fill.position.set(...p.fill.pos);
        this.scene.add(this.lights.fill);
        this.lights.rim = new THREE.DirectionalLight(p.rim.color, p.rim.intensity);
        this.lights.rim.position.set(...p.rim.pos);
        this.scene.add(this.lights.rim);
    }

    calcLightPosition(azimuthDeg, elevationDeg) {
        const az = azimuthDeg * Math.PI / 180;
        const el = elevationDeg * Math.PI / 180;
        const dist = 8;
        return [dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el), dist * Math.cos(el) * Math.cos(az)];
    }

    setCustomLight(color, azimuth, elevation) {
        if (color) this.customLightColor = color;
        if (typeof azimuth === 'number') this.customLightAzimuth = azimuth;
        if (typeof elevation === 'number') this.customLightElevation = elevation;
        if (this.currentLighting === 'custom' && this.lights.key) {
            this.lights.key.color.set(this.customLightColor);
            this.lights.key.position.set(...this.calcLightPosition(this.customLightAzimuth, this.customLightElevation));
        }
        this.onStateChange?.();
    }

    updateTheme(theme) { this.setSceneBackground(theme === 'dark' ? 'dark' : 'light'); }
    setGender(isFemale) { if (this.isFemale !== isFemale) { this.isFemale = isFemale; if (this.currentPatternTex && this.bodyMaterials.length > 0) this.rebuildBodyTexture(); } }
    setEyeColor(hex) {
        this.eyeColor = hex;
        // If we have a composited eye texture, re-composite with new Secondary color
        if (this.irisImg && this.eyeConfig) {
            this.composeAndApplyEyeTexture();
        } else {
            const rgb = hexToRgb(hex);
            const color = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
            for (const mat of this.eyeMaterials) mat.color = color;
        }
    }

    async loadEyeImage(url) {
        if (!url) return null;
        if (this._imgCache[url]) return this._imgCache[url];
        return new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { this._imgCache[url] = img; resolve(img); };
            img.onerror = () => { console.warn('⚠️ 眼睛贴图缺失:', url); resolve(null); };
            img.src = url;
        });
    }

    async loadSharedEyeTextures() {
        if (this.sharedEyeTexturesLoaded) return;
        try {
            this.eyeNormalTex = await this.tryLoadTexture(SHARED_EYE_TEXTURES.normalMap, '眼睛法线');
            if (this.eyeNormalTex) this.eyeNormalTex.colorSpace = THREE.LinearSRGBColorSpace;
        } catch { this.eyeNormalTex = null; }
        try {
            this.eyeBumpTex = await this.tryLoadTexture(SHARED_EYE_TEXTURES.displacementMap, '眼睛位移');
            if (this.eyeBumpTex) this.eyeBumpTex.colorSpace = THREE.LinearSRGBColorSpace;
        } catch { this.eyeBumpTex = null; }
        this.sharedEyeTexturesLoaded = true;
    }

    irisPatternPath(n) {
        return n ? `./Assets/Dino/_shared_assets/iris/Iris_${n}.png` : null;
    }

    pupilPatternPath(n) {
        return n ? `./Assets/Dino/_shared_assets/pupil/Pupil_${n}.png` : null;
    }

    eyePrimaryColor(cfg) {
        const hex = (cfg && cfg.irisPrimary) || 'FFFFFF';
        const rgb = hexToRgb(hex.replace('#', ''));
        return new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    }

    async applyEyeConfig(dinoName) {
        await this.loadSharedEyeTextures();
        this.eyeConfig = getEyeConfig(dinoName);
        if (!this.eyeConfig || this.eyeMaterials.length === 0) return;

        // Load iris/pupil images for canvas compositing
        this.irisImg = this.eyeConfig.irisPattern ?
            await this.loadEyeImage(this.irisPatternPath(this.eyeConfig.irisPattern)) : null;
        this.pupilImg = this.eyeConfig.pupilPattern ?
            await this.loadEyeImage(this.pupilPatternPath(this.eyeConfig.pupilPattern)) : null;

        const isFlat = this.currentLighting === 'flat';
        for (const mat of this.eyeMaterials) {
            if (this.eyeNormalTex) { mat.normalMap = this.eyeNormalTex; mat.normalScale.set(1, 1); }
            if (this.eyeBumpTex) { mat.bumpMap = this.eyeBumpTex; mat.bumpScale = 0.4; }
            mat.roughness = 0.15;
            mat.metalness = 0.0;
            mat.needsUpdate = true;
        }

        // Phase 2: composite eye texture (sclera + iris Primary/Secondary + pupil)
        if (this.irisImg || this.pupilImg) {
            this.composeAndApplyEyeTexture();
        }

        if (!isFlat) {
            this.resetEyeEmissive();
            this.setEyeColor(this.eyeColor);
        }
    }

    composeAndApplyEyeTexture() {
        if (!this.eyeConfig || this.eyeMaterials.length === 0) return;
        const tex = this.composeEyeTexture(this.eyeConfig, this.eyeColor);
        if (this.currentEyeTex) this.currentEyeTex.dispose();
        this.currentEyeTex = tex;
        const isFlat = this.currentLighting === 'flat';
        for (const mat of this.eyeMaterials) {
            mat.map = tex;
            mat.emissiveMap = isFlat ? tex : null;
            if (!isFlat) mat.color.setRGB(1, 1, 1);
            mat.needsUpdate = true;
        }
    }

    composeEyeTexture(cfg, secondaryHex) {
        const S = 1024;
        const cx = S / 2, cy = S / 2;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = S;
        const ctx = canvas.getContext('2d');
        // Normalize hex: ensure '#RRGGBB' format
        const toCss = h => '#' + (h || 'FFFFFF').replace('#', '');

        // --- 1. Sclera background ---
        const scleraColor = toCss(cfg.scleraColor || '20100C');
        ctx.fillStyle = scleraColor;
        ctx.fillRect(0, 0, S, S);
        const sg = ctx.createRadialGradient(cx, cy, S * 0.15, cx, cy, S * 0.5);
        sg.addColorStop(0, scleraColor);
        sg.addColorStop(1, '#000000');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, S, S);

        // --- Parameters ---
        const irisR = (cfg.irisScale || 0.6) * (S / 2);
        const outlineR = irisR * (cfg.irisOutlineScale || 0.6);
        const pupilR = irisR * (cfg.pupilScale || 0.35);
        const blurPx = Math.min(cfg.irisBlur || 0, 8);

        // --- 2. Iris (Primary outer + Secondary inner) ---
        if (this.irisImg) {
            const irisCanvas = document.createElement('canvas');
            irisCanvas.width = irisCanvas.height = S;
            const ictx = irisCanvas.getContext('2d');
            const id = irisR * 2;

            // Preprocess iris texture: lift mid-tones so the base becomes lighter
            // (closer to the white/silver look in-game) while keeping dark detail.
            const prepCanvas = document.createElement('canvas');
            prepCanvas.width = prepCanvas.height = S;
            const pctx = prepCanvas.getContext('2d');
            pctx.drawImage(this.irisImg, 0, 0, S, S);
            const imgData = pctx.getImageData(0, 0, S, S);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const v = d[i];
                // Gamma < 1 lifts mid-tones, making the iris base whiter
                const nv = Math.min(255, Math.pow(v / 255, 0.6) * 255 * 1.15);
                d[i] = d[i + 1] = d[i + 2] = nv;
            }
            pctx.putImageData(imgData, 0, 0);

            // Colorize the grayscale iris texture. The game material uses
            // Overlay blending (Blend_Overlay appears in M_MasterEye),
            // affects hue, saturation AND luminosity.
            const colorizeIris = (fillStyle) => {
                ictx.drawImage(prepCanvas, cx - irisR, cy - irisR, id, id);
                ictx.globalCompositeOperation = 'overlay';
                ictx.fillStyle = fillStyle;
                ictx.fillRect(cx - irisR, cy - irisR, id, id);
                ictx.globalCompositeOperation = 'source-over';
            };

            // Primary: outer region
            colorizeIris(toCss(cfg.irisPrimary));

            // Secondary: inner region (clip to outlineR, colorize again)
            ictx.save();
            ictx.beginPath();
            ictx.arc(cx, cy, outlineR, 0, Math.PI * 2);
            ictx.clip();
            colorizeIris(toCss(secondaryHex));
            ictx.restore();

            // Mask iris to circle
            ictx.globalCompositeOperation = 'destination-in';
            ictx.beginPath();
            ictx.arc(cx, cy, irisR, 0, Math.PI * 2);
            ictx.fill();
            ictx.globalCompositeOperation = 'source-over';

            // Apply blur + draw onto main canvas
            if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
            ctx.drawImage(irisCanvas, 0, 0);
            ctx.filter = 'none';
        }

        // --- 3. Pupil ---
        if (this.pupilImg) {
            const pupilCanvas = document.createElement('canvas');
            pupilCanvas.width = pupilCanvas.height = S;
            const pctx = pupilCanvas.getContext('2d');
            pctx.drawImage(this.pupilImg, 0, 0, S, S);

            // Pupil texture is a full grayscale image:
            //   black disk = pupil  -> opaque black
            //   gray/white = halo/background -> transparent (let iris show through)
            const imgData = pctx.getImageData(0, 0, S, S);
            const d = imgData.data;
            const THRESH = 0x68; // #686868 and brighter become fully transparent
            for (let i = 0; i < d.length; i += 4) {
                const v = d[i];
                // Only dark pixels become the black pupil; keep it fully opaque
                // so the iris/sclera does not show through the pupil.
                const a = v < THRESH ? 255 : 0;
                d[i] = 0;
                d[i + 1] = 0;
                d[i + 2] = 0;
                d[i + 3] = a;
            }
            pctx.putImageData(imgData, 0, 0);

            const pd = pupilR * 2;
            ctx.save();
            ctx.translate(cx, cy);
            if (cfg.pupilRotation) {
                ctx.rotate((cfg.pupilRotation * Math.PI) / 180);
            }
            ctx.drawImage(pupilCanvas, -pupilR, -pupilR, pd, pd);
            ctx.restore();
        }

        // --- 4. Limbal ring (iris outer edge darkening) ---
        const limbalGrad = ctx.createRadialGradient(cx, cy, irisR * 0.9, cx, cy, irisR);
        limbalGrad.addColorStop(0, 'rgba(0,0,0,0)');
        limbalGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = limbalGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        return tex;
    }

    resetEyeEmissive() {
        if (!this.eyeConfig || this.eyeMaterials.length === 0) return;
        for (const mat of this.eyeMaterials) {
            mat.emissiveMap = null;
            mat.emissive.setRGB(0, 0, 0);
            mat.emissiveIntensity = 0;
            mat.needsUpdate = true;
        }
    }

    forceRebuildBodyTexture() {
        if (!this.currentPatternTex || this.bodyMaterials.length === 0) return;
        this.rebuildBodyTexture();
    }

    rebuildBodyTexture() {
        const bakedTex = this.bakeColorTexture(this.currentPatternTex, this.currentColors, this.currentDinoHasSpecial);
        const finalTex = this.mergeMaskTexture(bakedTex, this.currentMaskTex, this.currentColors);
        for (const mat of this.bodyMaterials) { mat.map = finalTex; if (this.currentLighting === 'flat') mat.emissiveMap = finalTex; mat.needsUpdate = true; }
    }

    createTestMaskTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const masks = ['#FF0000','#FF00FF','#00FFFF','#0000FF','#00FF00','#FFFF00'];
        const h = canvas.height / masks.length;
        masks.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * h, canvas.width, h); });
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = false;
        return tex;
    }

    bakeColorTexture(maskTex, colors, hasSpecial = true) {
        const source = maskTex.image;
        if (!source) return maskTex;
        const canvas = document.createElement('canvas');
        canvas.width = source.width; canvas.height = source.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const maleColor = this.isFemale ? hexToRgb(colors.markings || '5D4343') : hexToRgb(colors.maleDisplay || 'E78D60');
        const cRed = maleColor;
        const cMagenta = hexToRgb(colors.markings || '5D4343');
        const cCyan = hexToRgb(colors.body || 'C08F78');
        const cBlue = hexToRgb(colors.flank || 'A16C60');
        const cGreen = hexToRgb(colors.underbelly || '9D8D7C');
        const cYellow = hasSpecial ? hexToRgb(colors.special || '000000') : null;
        for (let i = 0; i < imgData.data.length; i += 4) {
            const r = imgData.data[i] / 255, g = imgData.data[i+1] / 255, b = imgData.data[i+2] / 255;
            let out, min;
            min = Math.hypot(r - 1, g - 0, b - 0); out = cRed;
            const dM = Math.hypot(r - 1, g - 0, b - 1); if (dM < min) { min = dM; out = cMagenta; }
            const dC = Math.hypot(r - 0, g - 1, b - 1); if (dC < min) { min = dC; out = cCyan; }
            const dB = Math.hypot(r - 0, g - 0, b - 1); if (dB < min) { min = dB; out = cBlue; }
            const dG = Math.hypot(r - 0, g - 1, b - 0); if (dG < min) { min = dG; out = cGreen; }
            if (hasSpecial) {
                const dY = Math.hypot(r - 1, g - 1, b - 0); if (dY < min) { min = dY; out = cYellow; }
            }
            imgData.data[i] = out.r; imgData.data[i+1] = out.g; imgData.data[i+2] = out.b;
        }
        ctx.putImageData(imgData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        return tex;
    }

    mergeMaskTexture(baseTex, maskTex, colors) {
        if (!maskTex || !maskTex.image) return baseTex;
        const baseImg = baseTex.image;
        if (!baseImg) return baseTex;
        const canvas = document.createElement('canvas');
        canvas.width = baseImg.width; canvas.height = baseImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(baseImg, 0, 0);
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width; maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(maskTex.image, 0, 0, maskCanvas.width, maskCanvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const baseData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 检测 mask 是否为 TMC 格式 (R=牙, G=嘴, B=爪)
        const isTMC = colors ? this.detectTMCMask(maskData) : false;

        if (isTMC) {
            // TMC 格式：按 RGB 通道换色后覆盖到 baked pattern
            const teethColor = hexToRgb(colors.teeth || 'FFFFFF');
            const mouthColor = hexToRgb(colors.mouth || '7C5859');
            const clawsColor = hexToRgb(colors.claws || '312E27');
            const threshold = 100;
            for (let i = 0; i < baseData.data.length; i += 4) {
                const mr = maskData.data[i];
                const mg = maskData.data[i + 1];
                const mb = maskData.data[i + 2];
                const ma = maskData.data[i + 3];
                const rHi = mr > threshold, gHi = mg > threshold, bHi = mb > threshold;
                const hiCount = (rHi ? 1 : 0) + (gHi ? 1 : 0) + (bHi ? 1 : 0);
                if (hiCount === 1) {
                    let target, channelVal;
                    if (rHi) { target = teethColor; channelVal = mr; }
                    else if (gHi) { target = mouthColor; channelVal = mg; }
                    else { target = clawsColor; channelVal = mb; }
                    const alpha = (channelVal / 255) * (ma / 255);
                    if (alpha > 0.01) {
                        const inv = 1 - alpha;
                        baseData.data[i]   = baseData.data[i]   * inv + target.r * alpha;
                        baseData.data[i+1] = baseData.data[i+1] * inv + target.g * alpha;
                        baseData.data[i+2] = baseData.data[i+2] * inv + target.b * alpha;
                        baseData.data[i+3] = 255;
                    }
                }
            }
        } else {
            // 旧格式：用 alpha 通道把 mask 的 RGB 覆盖到 base 上
            for (let i = 0; i < baseData.data.length; i += 4) {
                const alpha = maskData.data[i + 3] / 255;
                if (alpha > 0.05) {
                    const invAlpha = 1 - alpha;
                    baseData.data[i] = baseData.data[i] * invAlpha + maskData.data[i] * alpha;
                    baseData.data[i+1] = baseData.data[i+1] * invAlpha + maskData.data[i+1] * alpha;
                    baseData.data[i+2] = baseData.data[i+2] * invAlpha + maskData.data[i+2] * alpha;
                    baseData.data[i+3] = 255;
                }
            }
        }
        ctx.putImageData(baseData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        return tex;
    }

    /**
     * 检测 mask 是否为 TMC 格式 (R=牙/G=嘴/B=爪 区域编码)
     * TMC 特征：大量像素只有 R/G/B 中的某一个通道高于阈值
     * 旧 mask 特征：颜色丰富，极少出现"单通道高"的像素
     */
    detectTMCMask(maskData) {
        let tmcCount = 0;
        const totalPixels = maskData.data.length / 4;
        if (totalPixels === 0) return false;
        const threshold = 100;
        for (let i = 0; i < maskData.data.length; i += 4) {
            const rHi = maskData.data[i] > threshold;
            const gHi = maskData.data[i + 1] > threshold;
            const bHi = maskData.data[i + 2] > threshold;
            const hiCount = (rHi ? 1 : 0) + (gHi ? 1 : 0) + (bHi ? 1 : 0);
            if (hiCount === 1) tmcCount++;
        }
        return tmcCount / totalPixels > 0.001;
    }

    async loadModel(dinoName, patternName) {
        this.showLoading(true);
        this.updateLoadingProgress(0, '准备加载...');
        const data = DINOSAUR_DATA[dinoName];
        this.currentDinoHasSpecial = data ? !!data.hasSpecial : false;
        const modelPath = `./Assets/Dino/${dinoName}/${dinoName}.glb`;
        const patternPath = `./Assets/Dino/${dinoName}/${dinoName}_${patternName}.png`;
        const eyePath = `./Assets/Dino/${dinoName}/${dinoName}_Eye.png`;
        const normalPath = `./Assets/Dino/${dinoName}/${dinoName}_Normal.png`;
        const maskPath = `./Assets/Dino/${dinoName}/${dinoName}_Mask.png`;
        try {
            this.updateLoadingProgress(10, '加载图案...');
            let patternTex;
            try {
                patternTex = await this.loadTexture(patternPath);
                patternTex.flipY = false;
                patternTex.colorSpace = THREE.SRGBColorSpace;
            } catch {
                patternTex = this.createTestMaskTexture();
            }
            this.currentPatternTex = patternTex;
            this.updateLoadingProgress(30, '加载模型...');
            let gltf;
            try {
                gltf = await this.loadGLTFWithProgress(modelPath, pct => this.updateLoadingProgress(30 + pct * 0.4, `加载: ${Math.round(pct * 100)}%`));
            } catch(e) {
                this.showLoading(false);
                return false;
            }
            this.updateLoadingProgress(75, '清理...');
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
                if (this.currentMixer) this.currentMixer.stopAllAction();
            }
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            this.modelCenter = box.getCenter(new THREE.Vector3()).clone();
            const size = box.getSize(new THREE.Vector3());
            const targetHeight = 1.6;
            const baseScale = targetHeight / size.y;
            this.modelBaseScale = Math.min(baseScale * 0.5, 0.8);
            this.modelUserScale = 1;
            const defaultScale = this.modelBaseScale;
            model.scale.setScalar(defaultScale);
            model.position.set(-this.modelCenter.x * defaultScale, -this.modelCenter.y * defaultScale, -this.modelCenter.z * defaultScale);
            this.updateLoadingProgress(85, '加载贴图...');
            // Dispose previous composited eye texture
            if (this.currentEyeTex) { this.currentEyeTex.dispose(); this.currentEyeTex = null; }
            this.irisImg = null; this.pupilImg = null;
            const [eyeTex, normalTex, maskTex] = await Promise.all([
                this.tryLoadTexture(eyePath, '眼睛'),
                this.tryLoadTexture(normalPath, '法线'),
                this.tryLoadTexture(maskPath, 'Mask')
            ]);
            this.currentMaskTex = maskTex;
            this.currentNormalTex = normalTex;
            if (this.currentNormalTex) this.currentNormalTex.colorSpace = THREE.LinearSRGBColorSpace;
            this.updateLoadingProgress(95, '烘焙贴图中...');
            const bakedTex = this.bakeColorTexture(patternTex, this.currentColors, this.currentDinoHasSpecial);
            const finalBodyTex = this.mergeMaskTexture(bakedTex, maskTex, this.currentColors);
            this.bodyMaterials = [];
            this.eyeMaterials = [];
            model.traverse(child => {
                if (!child.isMesh) return;
                const mn = (child.material && child.material.name || '').toLowerCase();
                const msn = (child.name || '').toLowerCase();
                if (mn.includes('eye') || msn.includes('eye')) {
                    const rgb = hexToRgb(this.eyeColor);
                    const c = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
                    const em = new THREE.MeshStandardMaterial({
                        map: eyeTex || null,
                        roughness: 0.4,
                        metalness: 0.1,
                        side: THREE.DoubleSide,
                        color: c
                    });
                    child.material = em;
                    child.frustumCulled = false;
                    this.eyeMaterials.push(em);
                } else {
                    const bm = new THREE.MeshStandardMaterial({
                        map: finalBodyTex,
                        roughness: 0.6,
                        metalness: 0.1,
                        side: THREE.DoubleSide,
                        transparent: false
                    });
                    if (normalTex && this.normalMapEnabled && this.quality !== 'low') {
                        bm.normalMap = normalTex;
                        bm.normalScale.set(1, 1);
                    }
                    if (this.smoothRendering) {
                        bm.roughness = 0.2;
                        bm.metalness = 0.0;
                    }
                    child.material = bm;
                    this.bodyMaterials.push(bm);
                }
                child.castShadow = this.shadowsEnabled;
                child.receiveShadow = this.shadowsEnabled;
            });
            if (gltf.animations && gltf.animations.length > 0) {
                this.currentMixer = new THREE.AnimationMixer(model);
                this.currentMixer.clipAction(gltf.animations[0]).play();
                this.currentMixer.timeScale = 1;
            }
            this.scene.add(model);
            this.currentModel = model;
            this.applyFlatMode(this.currentLighting === 'flat');
            await this.applyEyeConfig(dinoName);
            this.updateLoadingProgress(100, '完成!');
            this.showLoading(false);
            return true;
        } catch(err) {
            console.error(err);
            this.showLoading(false);
            return false;
        }
    }

    updateColors(colors) {
        const prev = { ...this.currentColors };
        this.currentColors = { ...colors };
        if (!this.currentPatternTex || this.bodyMaterials.length === 0) return;
        const changed = Object.keys(colors).filter(k => prev[k] !== colors[k]);
        if (changed.length === 0) return;
        if (!this.currentDinoHasSpecial && changed.length === 1 && changed[0] === 'special') return;
        this.rebuildBodyTexture();
    }

    forceUpdateColors(colors) {
        this.currentColors = { ...colors };
        this.forceRebuildBodyTexture();
    }

    tryLoadTexture(path, label) {
        return new Promise(r => {
            this.texLoader.load(path, tex => {
                tex.flipY = false;
                tex.colorSpace = THREE.SRGBColorSpace;
                r(tex);
            }, undefined, () => {
                console.warn(`⚠️ ${label}缺失: ${path}`);
                r(null);
            });
        });
    }

    loadTexture(path) { return new Promise((res, rej) => { this.texLoader.load(path, res, undefined, rej); }); }
    loadGLTFWithProgress(path, onProgress) { return new Promise((res, rej) => { this.loader.load(path, res, p => { if (p.total && onProgress) onProgress(p.loaded / p.total); }, rej); }); }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        const d = Math.min(this.clock.getDelta(), 0.1);
        if (this.currentMixer && !this.animationPaused) this.currentMixer.update(d);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.updateGizmo();
    }

    toggleAnimationPause() {
        this.animationPaused = !this.animationPaused;
        return this.animationPaused;
    }

    createCamera(mode, aspect) {
        if (mode === 'orthographic') {
            const frustumSize = 3.5;
            const halfW = frustumSize * aspect / 2;
            const halfH = frustumSize / 2;
            return new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
        }
        return new THREE.PerspectiveCamera(35, aspect, 0.1, 100);
    }

    switchCameraMode(mode) {
        if (!this.camera || mode === this.cameraMode) return;
        const oldPos = this.camera.position.clone();
        const oldTarget = this.controls.target.clone();
        const oldZoom = this.camera.zoom || 1;
        this.cameraMode = mode;
        const aspect = this.getAspect();
        this.camera = this.createCamera(mode, aspect);
        this.camera.position.copy(oldPos);
        this.camera.lookAt(oldTarget);
        this.camera.zoom = mode === 'orthographic' ? oldZoom : 1;
        this.camera.updateProjectionMatrix();
        this.controls.object = this.camera;
        this.controls.target.copy(oldTarget);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    createGizmo() {
        this.gizmoCanvas = document.getElementById('view-gizmo');
        if (!this.gizmoCanvas) return;
        this.gizmoCtx = this.gizmoCanvas.getContext('2d');
        this._gizmoDrag = { active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false };

        const getPos = (e) => {
            if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            return { x: e.clientX, y: e.clientY };
        };

        const onDown = (e) => {
            if (!this.camera) return;
            e.preventDefault();
            const p = getPos(e);
            this._gizmoDrag = { active: true, startX: p.x, startY: p.y, lastX: p.x, lastY: p.y, moved: false };
            this.gizmoCanvas.style.cursor = 'grabbing';
        };
        const onMove = (e) => {
            if (!this._gizmoDrag.active || !this.camera) return;
            const p = getPos(e);
            const dx = p.x - this._gizmoDrag.lastX;
            const dy = p.y - this._gizmoDrag.lastY;
            if (Math.abs(p.x - this._gizmoDrag.startX) > 4 || Math.abs(p.y - this._gizmoDrag.startY) > 4)
                this._gizmoDrag.moved = true;

            const target = this.controls.target;
            const offset = this.camera.position.clone().sub(target);
            const spherical = new THREE.Spherical().setFromVector3(offset);
            spherical.theta -= dx * 0.012;
            spherical.phi   -= dy * 0.012;
            spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi));
            offset.setFromSpherical(spherical);
            this.camera.position.copy(target).add(offset);
            this.camera.lookAt(target);
            this.controls.update();

            this._gizmoDrag.lastX = p.x;
            this._gizmoDrag.lastY = p.y;
        };
        const onUp = () => {
            if (!this._gizmoDrag.active) return;
            this._gizmoDrag.active = false;
            this.gizmoCanvas.style.cursor = '';
            if (!this._gizmoDrag.moved)
                this.onGizmoClick({ clientX: this._gizmoDrag.startX, clientY: this._gizmoDrag.startY });
        };

        this.gizmoCanvas.addEventListener('mousedown', onDown);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        this.gizmoCanvas.addEventListener('touchstart', onDown, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
    }

    updateGizmo() {
        if (!this.gizmoCtx || !this.camera) return;
        const canvas = this.gizmoCanvas;
        const ctx = this.gizmoCtx;
        const size = canvas.width;
        const cx = size / 2, cy = size / 2;
        const scale = size * 0.38;       // 半径比例（留出边距，不超出画布）
        const lineWidth = size * 0.05;   // 线宽
        const tipRadius = size * 0.10;   // 端点圆半径
        const fontSize = size * 0.18;    // 端点内文字
        const centerRadius = size * 0.08;
        ctx.clearRect(0, 0, size, size);

        const invRot = this.camera.quaternion.clone().invert();
        // 视觉约定：Z 在上方，X 在右侧，Y 在左侧
        const axes = [
            { name: 'X', dir: new THREE.Vector3(1, 0, 0), color: '#F75B6B', isNeg: false },
            { name: 'Y', dir: new THREE.Vector3(0, 0, 1), color: '#5BFF4B', isNeg: false },
            { name: 'Z', dir: new THREE.Vector3(0, 1, 0), color: '#80D4FF', isNeg: false },
            { name: '-X', dir: new THREE.Vector3(-1, 0, 0), color: '#C4324A', isNeg: true },
            { name: '-Y', dir: new THREE.Vector3(0, 0, -1), color: '#48B83D', isNeg: true },
            { name: '-Z', dir: new THREE.Vector3(0, -1, 0), color: '#4299DB', isNeg: true },
        ];
        const projected = axes.map(a => {
            const v = a.dir.clone().applyQuaternion(invRot);
            return { ...a, x: v.x * scale + cx, y: -v.y * scale + cy, z: v.z };
        });
        projected.sort((a, b) => a.z - b.z);

        // 中心球（带描边）
        ctx.beginPath();
        ctx.arc(cx, cy, centerRadius + 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();

        for (const p of projected) {
            if (p.isNeg) {
                // 负轴：与正轴等长
                const nx = p.x;
                const ny = p.y;
                // 描边
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(nx, ny);
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = lineWidth + 5;
                ctx.lineCap = 'round';
                ctx.stroke();
                // 负轴线
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(nx, ny);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();

                // 负端点小圆描边（与正端点同样大小）
                ctx.beginPath();
                ctx.arc(nx, ny, tipRadius + 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fill();
                // 负端点小圆填充
                ctx.beginPath();
                ctx.arc(nx, ny, tipRadius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                // 负标签（与正标签同样大小，描边稍粗）
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.lineWidth = 5;
                ctx.strokeText(p.name, nx, ny);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(p.name, nx, ny);
            } else {
                // 正轴：完整线 + 端点 + 标签
                // 描边
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(p.x, p.y);
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.lineWidth = lineWidth + 3;
                ctx.lineCap = 'round';
                ctx.stroke();
                // 主线
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(p.x, p.y);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();

                // 端点圆描边
                ctx.beginPath();
                ctx.arc(p.x, p.y, tipRadius + 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fill();
                // 端点圆填充
                ctx.beginPath();
                ctx.arc(p.x, p.y, tipRadius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                // 端点文字（白字黑边，更醒目）
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = 'rgba(0,0,0,0.7)';
                ctx.lineWidth = 5;
                ctx.strokeText(p.name, p.x, p.y);
                ctx.fillStyle = '#fff';
                ctx.fillText(p.name, p.x, p.y);
            }
        }
    }

    onGizmoClick(e) {
        if (!this.gizmoCanvas) return;
        const rect = this.gizmoCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.gizmoCanvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.gizmoCanvas.height / rect.height);
        const size = this.gizmoCanvas.width;
        const cx = size / 2, cy = size / 2;
        const scale = size * 0.42;
        const axes = [
            { name: 'X',  dir: new THREE.Vector3(1, 0, 0),   view: 'right' },
            { name: 'Y',  dir: new THREE.Vector3(0, 0, 1),   view: 'front' },
            { name: 'Z',  dir: new THREE.Vector3(0, 1, 0),   view: 'top' },
            { name: '-X', dir: new THREE.Vector3(-1, 0, 0),  view: 'left' },
            { name: '-Y', dir: new THREE.Vector3(0, 0, -1),  view: 'back' },
            { name: '-Z', dir: new THREE.Vector3(0, -1, 0),  view: 'bottom' },
        ];
        const invRot = this.camera.quaternion.clone().invert();
        let best = null, bestDist = Infinity;
        for (const a of axes) {
            const v = a.dir.clone().applyQuaternion(invRot);
            const px = v.x * scale + cx;
            const py = -v.y * scale + cy;
            const dist = Math.hypot(px - x, py - y);
            if (dist < bestDist) { bestDist = dist; best = a; }
        }
        if (best && bestDist < size * 0.28) this.setViewPreset(best.view);
    }

    setViewPreset(view) {
        const preset = VIEW_PRESETS[view];
        if (!preset) return;
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const endPos = new THREE.Vector3(...preset.pos);
        const endTarget = new THREE.Vector3(...preset.target);
        const duration = 500;
        const startTime = performance.now();
        const animateView = (time) => {
            const elapsed = time - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            this.camera.position.lerpVectors(startPos, endPos, ease);
            this.controls.target.lerpVectors(startTarget, endTarget, ease);
            this.controls.update();
            if (t < 1) requestAnimationFrame(animateView);
        };
        requestAnimationFrame(animateView);
    }

    setModelScale(userScale) {
        if (!this.currentModel || !this.modelCenter) return;
        this.modelUserScale = userScale;
        const s = this.modelBaseScale * userScale;
        this.currentModel.scale.setScalar(s);
        this.currentModel.position.set(-this.modelCenter.x * s, -this.modelCenter.y * s, -this.modelCenter.z * s);
    }

    autoCenterModel() {
        if (!this.currentModel) return;
        const s = this.currentModel.scale.x || this.modelBaseScale || 1;
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3()).divideScalar(s);
        this.modelCenter.copy(center);
        this.setModelScale(this.modelUserScale || 1);
        this.controls.target.copy(this.modelCenter);
        this.controls.update();
    }

    onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        if (!w || !h) return;
        this.renderer.setSize(w, h);
        const aspect = w / h;
        if (this.camera.isOrthographicCamera) {
            const frustumSize = 3.5;
            this.camera.left = -frustumSize * aspect / 2;
            this.camera.right = frustumSize * aspect / 2;
            this.camera.top = frustumSize / 2;
            this.camera.bottom = -frustumSize / 2;
        } else {
            this.camera.aspect = aspect;
        }
        this.camera.updateProjectionMatrix();
    }

    showLoading(show) { if (this.loadingOverlay) this.loadingOverlay.style.display = show ? 'flex' : 'none'; }
    updateLoadingProgress(percent, text) {
        if (this.loadingBarFill) this.loadingBarFill.style.width = Math.min(100, percent) + '%';
        if (this.loadingText && text) this.loadingText.textContent = text;
    }

    dispose() {
        this.renderer?.dispose();
        if (this.currentModel) this.scene.remove(this.currentModel);
        this.controls?.dispose();
    }
}