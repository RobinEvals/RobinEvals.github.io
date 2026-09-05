import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { hexToRgb } from './skin-gradient-generator.js?v=0.5.9.78';
import { DINOSAUR_DATA, getPatternHasSpecial } from './skin-dino-data.js?v=0.5.9.78';
import { getEyeConfig, SHARED_EYE_TEXTURES } from './skin-eye-config.js?v=0.5.9.78';
import { colorKeyToCnreId, cnreIdToColorKey } from './skin-cnre-code-generator.js?v=0.5.9.78';

// 调试辅助：暴露 THREE 到全局，方便 F12 控制台直接排查（无害）
window.THREE = THREE;

// 构建版本戳：用于给模型/贴图等二进制资产追加 ?v= 缓存戳，
// 避免浏览器/本地服务器/Service Worker 缓存住旧的 .glb（导致 Blender 重建后预览器仍显示旧模型）。
const BUILD_VERSION = '0.5.9.1';
const assetUrl = (p) => (p && p.indexOf('?') === -1 ? p + '?v=' + BUILD_VERSION : p);

const SCENE_BG = { dark: 0x000000, light: 0xe8e8e8, dusk: 0x2d1f1a };

// 分部位粗糙度/金属度微调：参与的部位（与 COLOR_PARTS 中可被 RM 贴图区分的 9 个一致）
const ROUGH_METAL_PARTS = ['body', 'underbelly', 'flank', 'markings', 'maleDisplay', 'special', 'teeth', 'mouth', 'claws'];
const clamp01 = (v) => Math.min(1, Math.max(0, typeof v === 'number' ? v : 0));

const LIGHTING_PRESETS = {
    normal: {
        ambient: { color: 0x333333, intensity: 0.8 },
        hemiSky: 0x777777, hemiGround: 0x333333, hemiIntensity: 0.6,
        key: { color: 0xffeedd, intensity: 1.5, pos: [5, 8, 5] },
        fill: { color: 0x888888, intensity: 0.5, pos: [-3, 2, -2] },
        rim: { color: 0x665544, intensity: 0.4, pos: [0, -2, 2] }
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
        ambient: { color: 0x333333, intensity: 0.5 },
        hemiSky: 0x888888, hemiGround: 0x333333, hemiIntensity: 0.4,
        key: { color: 0xffeedd, intensity: 1.8, pos: [5, 7, 5] },
        fill: { color: 0x888888, intensity: 0.4, pos: [-3, 2, -2] },
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
        this.racEnabled = true; this.currentRACTex = null;
        this.eyeColor = '#FFFFFF'; this.quality = 'medium'; this.shadowsEnabled = false;
        this.bodyMaterials = []; this.eyeMaterials = []; this.lights = {};
        this.eyeConfig = null; this.eyeNormalTex = null; this.eyeBumpTex = null; this.sharedEyeTexturesLoaded = false;
        this.irisImg = null; this.pupilImg = null; this.currentEyeTex = null; this._imgCache = {};
        this.bodyBackgroundImage = null; this.smoothRendering = false;
        // 分部位粗糙度/金属度微调 (v0.5.9.54 神秘小功能)
        this.partRoughness = { body: 0.6, underbelly: 0.6, flank: 0.6, markings: 0.6, maleDisplay: 0.6, special: 0.6, teeth: 0.6, mouth: 0.6, claws: 0.6 };
        this.partMetalness = { body: 0.0, underbelly: 0.0, flank: 0.0, markings: 0.0, maleDisplay: 0.0, special: 0.0, teeth: 0.0, mouth: 0.0, claws: 0.0 };
        this._rmActive = false;
        this._rmTex = null;
        this.smoothnessTuningEnabled = false; // 光滑度微调开关：true=应用自定义分部位粗糙度（否则用 RAC/默认）
        this.metalnessTuningEnabled = false;  // 金属度微调开关：true=应用自定义分部位金属度（否则用默认 0）
        // 分部位自发光 (emission) 微调 (v0.5.9.60 神秘小功能)：每部位发光强度 + 全局强度倍率
        this.partEmission = { body: 0, underbelly: 0, flank: 0, markings: 0, maleDisplay: 0, special: 0, teeth: 0, mouth: 0, claws: 0 };
        this.globalEmission = 1.0;            // 自发光全局强度倍率
        this._emissionActive = false;
        this._emissionTex = null;
        this.emissionTuningEnabled = false;   // 自发光微调开关：true=应用分部位自发光（每个部位按自身配色发光）
        this.glitchMode = {};                 // 故障皮预览：CNRE 通道 id → 'neg'|'pos'|'fluor'|'invfluor'（供故障自发光烘焙）
        this.glitchDisplayColors = {};        // 故障皮显示色（CNRE id → hex）：预览用，不污染 base color
        this.cameraMode = 'perspective'; // 'perspective' | 'orthographic'
        this.gizmoCanvas = null; this.gizmoCtx = null;
        this.modelCenter = new THREE.Vector3();
        this.modelBaseScale = 1;
        this.modelUserScale = 1;
        this.currentDinoHasSpecial = false;
        this.currentDinoHasFeathers = false; // TMC mask 是否包含青色/品红色羽毛区域
        this.featherAlpha = 0.0;             // 羽毛/绒毛 mask 显示强度：0=完全显示基础贴图，1=在羽毛 mask 区叠加淡淡提示色
        this.currentDinoName = '';           // 当前恐龙名，供 morph 系统使用
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingBarFill = document.getElementById('loading-bar-fill');
        this.loadingText = document.getElementById('loading-text');
        this.animationPaused = false;
        this.tPoseMode = false;           // T Pose（静止参考姿势）开关：停所有动画并把骨架复位到 bind pose
        this._bindPose = null;            // 加载时缓存的 bind 局部变换（T Pose 还原用，避免 skeleton.pose() 缩放污染）
        this.timeScale = 1.0;            // idle 动画速度倍率（可被 dino data 的 animSpeed 覆盖）
        this.savedAnimSpeed = null;      // 用户覆盖的动画速度（来自偏好，优先于 dino 默认）
        this.vocalTimeScale = 1.5;       // vocal 动画速度倍率（独立于 idle）
        // 取色（eyedrop）系统 (v0.5.9.25)
        this.eyedropKey = null;          // 待取色的颜色通道 key
        this.onEyedrop = null;           // 取色结果回调，由 UIManager 设置
        // 形态键系统
        this.morphTimeline = null;           // 动态计算的 morph 时间轴
        this._morphKeyToName = {};           // morph key → GLB target 名称映射
        this.ageStage = 75;                  // 年龄段滑块 0~100，默认成年
        this.femaleMorphEnabled = false;     // 雌性形态键开关
        this.morphMeshes = [];               // 带 morphTargets 的 mesh 列表
        // 动画 clip 系统
        this.animClips = {};                 // name → AnimationClip
        this.ageIdleClips = {};              // age → idle clip 名
        this.ageVocalClips = {};             // age → { attract, broadcast, danger, threaten, generic }
        this.availableAges = [];             // ['Adult', 'Juvenile', ...]
        this.curIdleAction = null;
        this.curJuvIdleAction = null;        // 幼年 idle action（用于 crossFade）
        this.curAdultIdleAction = null;      // 成年 idle action（用于 crossFade）
        this.idleWeightTarget = { juv: 1, ad: 0 };  // 目标混合权重（滑块变化时设）
        this.idleWeightCurr   = { juv: 1, ad: 0 };  // 当前 lerp 中的权重
        this.ageIdleActions = {};            // age → 持续播放的 idle action（避免边界切换 T-pose）
        this.curVocalAction = null;
        this.vocalPlaying = false;
        // 机制B：additive 叠加层（Juvenile_Additive 等相对 Adult idle 修正幼年姿态）
        this.rig = null;                       // 当前恐龙的 rig 描述符（来自 DINOSAUR_DATA）
        this.additiveActions = [];             // 已创建的 additive clipAction 列表
        this.additiveWeightCurr = 0;           // 当前 lerp 中的叠加权重
        this.additiveWeightTarget = 0;         // 目标叠加权重（= juvenile morph 值）
        this.customLightColor = '#ffeedd';
        this.customLightAzimuth = 45;
        this.customLightElevation = 60;
        // 自定义光照扩展（v0.5.9.46）：主光强度 + 环境光颜色/强度/角度
        this.keyLightIntensity = 1.8;
        this.ambientColor = '#ffffff';
        this.ambientIntensity = 0.8;
        this.ambientAngle = 0;
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
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        // 自适应像素比基准：贴近视距（模型铺满视口）时临时降分辨率，缓解填充率瓶颈导致的卡顿
        this._qualityPixelRatio = Math.min(window.devicePixelRatio, 1.5);
        this._adaptivePixelRatio = this._qualityPixelRatio;
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        // 添加环境贴图，给标准材质提供环境反射，避免暗部死黑和油光
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.container.appendChild(this.renderer.domElement);
        // 取色（eyedrop）：左键点击预览画面读取像素颜色；右键/Esc 取消 (v0.5.9.26)
        this.renderer.domElement.addEventListener('pointerdown', (e) => this._onPreviewPointerDown(e));
        this.renderer.domElement.addEventListener('contextmenu', (e) => {
            if (this.eyedropKey) { e.preventDefault(); this.endEyedrop(); }
        });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.eyedropKey) this.endEyedrop(); });
        // 上下文丢失保护：显存不足/驱动异常时给出明确提示，而非静默崩溃
        this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.error('[DinoPreview] ⚠️ WebGL 上下文丢失（显存不足或驱动异常），请刷新页面重试。');
            this.showLoading(true);
            this.updateLoadingProgress(0, '⚠️ 显存不足，上下文丢失，请刷新页面');
        });
        this.onResize();
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.8;
        this.controls.target.set(0, 0.8, 0);
        this.controls.minDistance = 1.4;
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
            // 初始化时按下拉当前值应用质量（默认 auto）
            this.setQuality(qualitySelect.value || 'auto');
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
        // v0.5.9.46 自定义光照扩展：主光强度 / 环境光颜色 / 强度 / 角度
        const ambColor = document.getElementById('ambientColor');
        if (ambColor) ambColor.addEventListener('input', (e) => this.setAmbientColor(e.target.value));
        const klInt = document.getElementById('keyLightIntensity');
        const klIntVal = document.getElementById('keyLightIntensityValue');
        if (klInt && klIntVal) klInt.addEventListener('input', (e) => { const v = parseFloat(e.target.value); klIntVal.textContent = v.toFixed(1); this.setKeyIntensity(v); });
        const ambInt = document.getElementById('ambientIntensity');
        const ambIntVal = document.getElementById('ambientIntensityValue');
        if (ambInt && ambIntVal) ambInt.addEventListener('input', (e) => { const v = parseFloat(e.target.value); ambIntVal.textContent = v.toFixed(2); this.setAmbientIntensity(v); });
        const ambAng = document.getElementById('ambientAngle');
        const ambAngVal = document.getElementById('ambientAngleValue');
        if (ambAng && ambAngVal) ambAng.addEventListener('input', (e) => { const v = parseInt(e.target.value); ambAngVal.textContent = v + '°'; this.setAmbientAngle(v); });

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

        // 11. T Pose 开关（静止参考姿势）
        const tPoseBtn = document.getElementById('tPoseBtn');
        if (tPoseBtn) {
            tPoseBtn.addEventListener('click', () => {
                const on = !this.tPoseMode;
                this.setTPose(on);
                tPoseBtn.classList.toggle('active', on);
                tPoseBtn.title = on ? '退出 T Pose（恢复动画）' : '设为 T Pose（静止参考姿势）';
            });
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
            ageStage: this.ageStage,
            femaleMorph: this.femaleMorphEnabled,
            customLightColor: this.customLightColor,
            customLightAzimuth: this.customLightAzimuth,
            customLightElevation: this.customLightElevation,
            keyLightIntensity: this.keyLightIntensity,
            ambientColor: this.ambientColor,
            ambientIntensity: this.ambientIntensity,
            ambientAngle: this.ambientAngle,
            customBgColor: this.customBgColor,
            gridEnabled: this.gridEnabled,
            gridColor: this.gridColor,
            gridSize: this.gridSize,
            gridLineWidth: this.gridLineWidth,
            animSpeed: this.timeScale,
            smoothnessTuningEnabled: this.smoothnessTuningEnabled,
            metalnessTuningEnabled: this.metalnessTuningEnabled
        };
    }

    applyPreviewState(state) {
        if (!state) return;
        // 先恢复自定义光照参数（在应用光照之前）
        if (state.customLightColor) this.customLightColor = state.customLightColor;
        if (typeof state.customLightAzimuth === 'number') this.customLightAzimuth = state.customLightAzimuth;
        if (typeof state.customLightElevation === 'number') this.customLightElevation = state.customLightElevation;
        if (typeof state.keyLightIntensity === 'number') this.keyLightIntensity = state.keyLightIntensity;
        if (state.ambientColor) this.ambientColor = state.ambientColor;
        if (typeof state.ambientIntensity === 'number') this.ambientIntensity = state.ambientIntensity;
        if (typeof state.ambientAngle === 'number') this.ambientAngle = state.ambientAngle;
        if (typeof state.animSpeed === 'number') this.savedAnimSpeed = state.animSpeed;
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
        // 恢复年龄段和雌性形态（雌性形态仅在当前为雌性时生效）
        if (typeof state.ageStage === 'number' && this.hasMorphData()) {
            this.ageStage = state.ageStage;
            this.femaleMorphEnabled = this.isFemale && !!state.femaleMorph;
            this.setAgeStage(this.ageStage, this.currentDinoName);
        }
        if (typeof state.smoothnessTuningEnabled === 'boolean') {
            this.smoothnessTuningEnabled = state.smoothnessTuningEnabled;
        }
        if (typeof state.metalnessTuningEnabled === 'boolean') {
            this.metalnessTuningEnabled = state.metalnessTuningEnabled;
        }
        // 同步自定义光照 UI
        const clColor = document.getElementById('customLightColor');
        const clAz = document.getElementById('customLightAzimuth');
        const clAzVal = document.getElementById('customLightAzimuthValue');
        const clEl = document.getElementById('customLightElevation');
        const clElVal = document.getElementById('customLightElevationValue');
        const ambColor = document.getElementById('ambientColor');
        if (clColor) clColor.value = this.customLightColor;
        if (clAz) clAz.value = this.customLightAzimuth;
        if (clAzVal) clAzVal.textContent = this.customLightAzimuth + '°';
        if (clEl) clEl.value = this.customLightElevation;
        if (clElVal) clElVal.textContent = this.customLightElevation + '°';
        if (ambColor) ambColor.value = this.ambientColor;
        // 同步自定义光照扩展控件（v0.5.9.46）
        const klInt = document.getElementById('keyLightIntensity');
        const klIntVal = document.getElementById('keyLightIntensityValue');
        const ambInt = document.getElementById('ambientIntensity');
        const ambIntVal = document.getElementById('ambientIntensityValue');
        const ambAng = document.getElementById('ambientAngle');
        const ambAngVal = document.getElementById('ambientAngleValue');
        if (klInt) klInt.value = this.keyLightIntensity;
        if (klIntVal) klIntVal.textContent = (+this.keyLightIntensity).toFixed(1);
        if (ambInt) ambInt.value = this.ambientIntensity;
        if (ambIntVal) ambIntVal.textContent = (+this.ambientIntensity).toFixed(2);
        if (ambAng) ambAng.value = this.ambientAngle;
        if (ambAngVal) ambAngVal.textContent = this.ambientAngle + '°';
        // 同步网格 UI
        this._syncGridUI();
        // 下载透明背景渲染图
        const dlBtn = document.getElementById('downloadTransparentBtn');
        if (dlBtn) {
            dlBtn.addEventListener('click', () => {
                const ok = this.downloadTransparentPNG();
                if (!ok) console.warn('[DinoPreview] 透明背景导出失败');
            });
        }
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
        const useRAC = this.racEnabled && !!this.currentRACTex;
        for (const mat of this.bodyMaterials) {
            // 光滑度/金属度微调激活，或 RAC 在用时：粗糙度/金属度由贴图驱动，标量锁 1.0 不二次缩放
            // （关键：RAC 存在时倍乘=1.0，让 RAC 完整表达粗糙度，避免常态被压到 0.6 而过滑）
            if (this.smoothnessTuningEnabled || this.metalnessTuningEnabled || useRAC) {
                mat.roughness = this.smoothRendering ? 0.2 : 1.0;
                mat.metalness = this.metalnessTuningEnabled ? 1.0 : 0.0;
            } else {
                mat.roughness = this.smoothRendering ? 0.2 : 0.6; // RAC 缺失时的兜底
                mat.metalness = 0.0;
            }
            mat.needsUpdate = true;
        }
        this.renderer.render(this.scene, this.camera);
    }

    setQuality(quality) {
        // 'auto' 按设备自动判定实际质量（用户未手动选 low/medium/high 时默认走这里）
        const resolved = (quality === 'auto' || quality === undefined || quality === null) ? this._resolveAutoQuality() : quality;
        this.quality = quality; // 保留用户选择（含 auto），供偏好持久化
        this._resolvedQuality = resolved;
        switch(resolved) {
            case 'low': this._qualityPixelRatio = 1; this.renderer.setPixelRatio(1); this.renderer.toneMappingExposure = 1.0; break;
            case 'medium': this._qualityPixelRatio = Math.min(window.devicePixelRatio, 1.5); this.renderer.setPixelRatio(this._qualityPixelRatio); this.renderer.toneMappingExposure = 1.1; break;
            case 'high': this._qualityPixelRatio = Math.min(window.devicePixelRatio, 2); this.renderer.setPixelRatio(this._qualityPixelRatio); this.renderer.toneMappingExposure = 1.2; break;
            default: this._qualityPixelRatio = Math.min(window.devicePixelRatio, 1.5); this.renderer.setPixelRatio(this._qualityPixelRatio); this.renderer.toneMappingExposure = 1.1;
        }
    }

    _resolveAutoQuality() {
        try {
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth || 1280, h = window.innerHeight || 720;
            if (dpr >= 2 && w >= 1600) return 'high';   // 高分屏桌面：高
            if (w * h < 700000) return 'low';            // 小屏：低
            return 'medium';
        } catch { return 'medium'; }
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
        // flat 关闭后，自发光需重新套用（flat 模式接管了 emissive）；flat 开启时 applyEmissionState 内部直接 return
        if (!isFlat) this.applyEmissionState();
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
                mat.normalScale.set(0.4, -0.4);
            } else {
                mat.normalMap = null;
            }
            mat.needsUpdate = true;
        }
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * RAC贴图通道重映射：
     * RAC = R(Smoothness) + G(Albedo, 不使用) + B(Cavity)
     * Three.js默认：roughnessMap读G通道，aoMap读R通道
     * 需要：roughnessMap读R通道(1.0-R反转为Roughness)，aoMap读B通道(Cavity)
     */
    _injectRACShader(mat, mode = 'full') {
        if (mode === 'cavity') {
            // 仅把 aoMap 从默认 .r 改读 .b（缝隙阴影）；粗糙度改由 roughnessMap(rmTex.g) 接管
            mat.onBeforeCompile = (shader) => {
                shader.fragmentShader = shader.fragmentShader.replace(
                    'texture2D( aoMap, vAoMapUv ).r',
                    'texture2D( aoMap, vAoMapUv ).b'
                );
            };
            mat.customProgramCacheKey = () => 'rac-cavity';
        } else {
            mat.onBeforeCompile = (shader) => {
                // 粗糙度：RAC的R通道是Smoothness（白=光滑，黑=粗糙），需反转为Roughness
                // Cavity 从 B 通道读取；缝隙深处直接覆盖为极粗糙，凸起处保持原光泽
                shader.fragmentShader = shader.fragmentShader.replace(
                    'roughnessFactor *= texelRoughness.g;',
                    `float racRoughness = 1.0 - texelRoughness.r;\n\t\t\tfloat racCavity = texture2D( aoMap, vAoMapUv ).b;\n\t\t\tfloat creviceMask = 1.0 - racCavity;\n\t\t\troughnessFactor *= mix(racRoughness, 1.0, creviceMask * 0.95);`
                );
                // Cavity(AO)：替换默认的 .r 读取，改用 .b 通道
                shader.fragmentShader = shader.fragmentShader.replace(
                    'texture2D( aoMap, vAoMapUv ).r',
                    'texture2D( aoMap, vAoMapUv ).b'
                );
            };
            mat.customProgramCacheKey = () => 'rac-remap';
        }
    }

    /**
     * 分部位粗糙度/金属度贴图 (v0.5.9.54+ 神秘小功能)：
     * 与颜色管线完全对齐：pattern 纹理决定 body/underbelly/flank/markings/maleDisplay/special
     * 的 hue 区域；TMC mask 仅用于覆盖 teeth/mouth/claws。
     * 写 G=粗糙度、B=金属度。若开启 RAC，把 RAC 的 Smoothness 乘进各部位粗糙度。
     */
    _bakeRoughMetalTexture() {
        const patternTex = this.currentPatternTex;
        const maskTex = this.currentMaskTex;
        if (!patternTex || !patternTex.image) return null;
        const src = patternTex.image;
        const w = Math.min(src.width, 1024);
        const h = Math.min(src.height, 1024);

        // pattern 纹理：按 hue 分类到身体区域
        const pCanvas = document.createElement('canvas'); pCanvas.width = w; pCanvas.height = h;
        const pCtx = pCanvas.getContext('2d');
        pCtx.drawImage(src, 0, 0, w, h);
        const patternData = pCtx.getImageData(0, 0, w, h);

        // mask 纹理：仅检测 TMC 的 teeth/mouth/claws
        let maskData = null;
        let isTMC = false;
        if (maskTex && maskTex.image) {
            const mCanvas = document.createElement('canvas'); mCanvas.width = w; mCanvas.height = h;
            const mCtx = mCanvas.getContext('2d');
            mCtx.drawImage(maskTex.image, 0, 0, w, h);
            maskData = mCtx.getImageData(0, 0, w, h);
            isTMC = this.detectTMCMask(maskData);
        }

        // 自定义粗糙度/金属度时不再读取 RAC 纹理——粗糙度/金属度完全由用户自定义值控制（不混合 RAC）

        const out = pCtx.createImageData(w, h);
        for (let i = 0; i < patternData.data.length; i += 4) {
            const r = patternData.data[i] / 255, g = patternData.data[i + 1] / 255, b = patternData.data[i + 2] / 255;
            const a = patternData.data[i + 3] / 255;
            let partId = null;

            // TMC mask 优先覆盖牙/嘴/爪
            if (isTMC && maskData) {
                const mr = maskData.data[i], mg = maskData.data[i + 1], mb = maskData.data[i + 2];
                const th = 100;
                const rHi = mr > th, gHi = mg > th, bHi = mb > th;
                const hi = (rHi ? 1 : 0) + (gHi ? 1 : 0) + (bHi ? 1 : 0);
                if (hi === 1) { if (rHi) partId = 'teeth'; else if (gHi) partId = 'mouth'; else partId = 'claws'; }
            }

            // pattern hue 分类身体区域
            if (!partId) {
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                const sat = max === 0 ? 0 : (max - min) / max;
                if (a < 0.05 || sat < 0.15 || max < 0.05) {
                    partId = 'body';
                } else {
                    const hue = this.rgbToHue(r, g, b);
                    if (hue >= 330 || hue < 30) partId = this.isFemale ? 'markings' : 'maleDisplay';
                    else if (hue >= 30 && hue < 90) partId = 'special';
                    else if (hue >= 90 && hue < 150) partId = 'underbelly';
                    else if (hue >= 150 && hue < 210) partId = 'body';
                    else if (hue >= 210 && hue < 270) partId = 'flank';
                    else partId = 'markings';
                }
            }

            let rough = this.partRoughness[partId] != null ? this.partRoughness[partId] : 0.6;
            let metal = this.partMetalness[partId] != null ? this.partMetalness[partId] : 0.0;
            out.data[i] = 0;
            out.data[i + 1] = Math.round(clamp01(rough) * 255);
            out.data[i + 2] = Math.round(clamp01(metal) * 255);
            out.data[i + 3] = 255;
        }
        pCtx.putImageData(out, 0, 0);
        const tex = new THREE.CanvasTexture(pCanvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = false;
        tex.colorSpace = THREE.LinearSRGBColorSpace;
        tex.needsUpdate = true;
        return tex;
    }

    _disposeRMTexture() {
        if (this._rmTex) { try { this._rmTex.dispose(); } catch (e) {} this._rmTex = null; }
    }

    _recomputeRMActive() {
        const sOn = this.smoothnessTuningEnabled, mOn = this.metalnessTuningEnabled;
        if (!sOn && !mOn) { this._rmActive = false; return; }
        this._rmActive = ROUGH_METAL_PARTS.some(id =>
            (sOn && this.partRoughness[id] != null && this.partRoughness[id] !== 0.6) ||
            (mOn && this.partMetalness[id] != null && this.partMetalness[id] !== 0.0));
    }

    applyRACState() {
        const sTuned = !!this.smoothnessTuningEnabled;   // 启用光滑度微调 → RAC 不再控制粗糙度
        const mTuned = !!this.metalnessTuningEnabled;    // 启用金属度微调 → RAC 不再控制金属度
        const useRAC = this.racEnabled && !!this.currentRACTex; // RAC 纹理可用：提供 Smoothness(R) / Cavity·AO(B)
        let rmTex = null;
        if (sTuned || mTuned) {
            if (this._rmTex) { try { this._rmTex.dispose(); } catch (e) {} this._rmTex = null; }
            rmTex = this._bakeRoughMetalTexture();
            this._rmTex = rmTex;
        } else {
            this._disposeRMTexture();
        }
        for (const mat of this.bodyMaterials) {
            // —— 粗糙度 ——（默认跟随 RAC；启用光滑度微调时改由自定义 RM 贴图驱动，二者不混合）
            if (sTuned && rmTex) {
                mat.roughnessMap = rmTex;          // 自定义 RM：G 通道 = 粗糙度
                mat.roughness = 1.0;               // 标量锁 1.0，让贴图完整表达，不二次缩放
            } else if (useRAC) {
                mat.roughnessMap = this.currentRACTex; // RAC 的 R 通道 = Smoothness（白=光滑，黑=粗糙）
                mat.roughness = this.smoothRendering ? 0.2 : 1.0; // 修复：常态(平滑关)倍乘=1.0，RAC 完整控制粗糙度，不再过滑
            } else {
                mat.roughnessMap = null;
                mat.roughness = this.smoothRendering ? 0.2 : 0.6; // RAC 缺失时的兜底
            }
            // —— 金属度 ——（默认 0；启用金属度微调时由自定义 RM 贴图驱动；RAC 不含金属度）
            if (mTuned && rmTex) {
                mat.metalnessMap = rmTex;          // 自定义 RM：B 通道 = 金属度
                mat.metalness = 1.0;
            } else {
                mat.metalnessMap = null;
                mat.metalness = 0.0;               // 默认绝不金属（恐龙不反光成铁甲暴龙）
            }
            // —— AO / Cavity ——（只要 RAC 存在就由 RAC 提供，与粗糙度来源解耦）
            if (useRAC) {
                mat.aoMap = this.currentRACTex;
                mat.aoMapIntensity = 1.0;
                // 粗糙度由自定义 RM 驱动时，只需把 aoMap 读取通道从 .r 改到 .b（缝隙阴影），勿动粗糙度；
                // 粗糙度由 RAC 驱动时，需要 full remap（粗糙度读 R、ao 读 B）。
                this._injectRACShader(mat, (sTuned && rmTex) ? 'cavity' : 'full');
            } else {
                mat.aoMap = null;
                delete mat.onBeforeCompile;
                delete mat.customProgramCacheKey;
            }
            mat.needsUpdate = true;
        }
        // 自发光与 RAC/RM 共用同一批材质，RM 更新后同步刷新自发光（flat 模式内部已 return）
        this.applyEmissionState();
        this.renderer.render(this.scene, this.camera);
    }

    // ===== 分部位粗糙度/金属度 对外接口 (供 UIManager 调用) =====
    setPartRoughMetal(partId, roughness, metalness) {
        if (partId in this.partRoughness) this.partRoughness[partId] = clamp01(roughness);
        if (partId in this.partMetalness) this.partMetalness[partId] = clamp01(metalness);
        this._recomputeRMActive();
        this.applyRACState();
    }
    setGlobalRoughMetal(roughness, metalness) {
        const r = clamp01(roughness), m = clamp01(metalness);
        for (const id of ROUGH_METAL_PARTS) { this.partRoughness[id] = r; this.partMetalness[id] = m; }
        this._recomputeRMActive();
        this.applyRACState();
    }
    setAllRoughness(val) {
        const v = clamp01(val);
        for (const id of ROUGH_METAL_PARTS) this.partRoughness[id] = v;
        this._recomputeRMActive();
        this.applyRACState();
    }
    setAllMetalness(val) {
        const v = clamp01(val);
        for (const id of ROUGH_METAL_PARTS) this.partMetalness[id] = v;
        this._recomputeRMActive();
        this.applyRACState();
    }
    resetPartRoughMetal() {
        for (const id of ROUGH_METAL_PARTS) { this.partRoughness[id] = 0.6; this.partMetalness[id] = 0.0; }
        this._recomputeRMActive();
        this.applyRACState();
    }
    getPartRoughMetalSettings() {
        return { roughness: { ...this.partRoughness }, metalness: { ...this.partMetalness }, active: this._rmActive };
    }

    // ===== 分部位自发光 (emission) 对外接口 (供 UIManager 调用) =====
    getPartEmissionSettings() {
        return { emission: { ...this.partEmission }, global: this.globalEmission, active: this._emissionActive };
    }
    _recomputeEmissionActive() {
        const custom = this.emissionTuningEnabled &&
            ROUGH_METAL_PARTS.some(id => this.partEmission[id] != null && this.partEmission[id] > 0);
        // 故障皮：正向/荧光/反色故障的部位需自发光（与游戏内一致）；反向故障不发光
        const glitch = !!this.glitchMode && Object.values(this.glitchMode).some(m => m === 'pos' || m === 'fluor' || m === 'invfluor');
        this._emissionActive = custom || glitch;
    }
    _disposeEmissionTexture() {
        if (this._emissionTex) { try { this._emissionTex.dispose(); } catch (e) {} this._emissionTex = null; }
    }
    /** 烘焙分部位自发光贴图：每个像素按 body/underbelly/... 区域分类，
     *  RGB = 该部位配色 × 该部位发光强度（0~1），alpha=255；配合 mat.emissive=白、emissiveIntensity=全局强度。 */
    _bakeEmissiveTexture() {
        const patternTex = this.currentPatternTex;
        const maskTex = this.currentMaskTex;
        if (!patternTex || !patternTex.image) return null;
        const src = patternTex.image;
        const w = Math.min(src.width, 1024);
        const h = Math.min(src.height, 1024);
        const pCanvas = document.createElement('canvas'); pCanvas.width = w; pCanvas.height = h;
        const pCtx = pCanvas.getContext('2d');
        pCtx.drawImage(src, 0, 0, w, h);
        const patternData = pCtx.getImageData(0, 0, w, h);
        let maskData = null, isTMC = false;
        if (maskTex && maskTex.image) {
            const mCanvas = document.createElement('canvas'); mCanvas.width = w; mCanvas.height = h;
            const mCtx = mCanvas.getContext('2d');
            mCtx.drawImage(maskTex.image, 0, 0, w, h);
            maskData = mCtx.getImageData(0, 0, w, h);
            isTMC = this.detectTMCMask(maskData);
        }
        const out = pCtx.createImageData(w, h);
        for (let i = 0; i < patternData.data.length; i += 4) {
            const r = patternData.data[i] / 255, g = patternData.data[i + 1] / 255, b = patternData.data[i + 2] / 255;
            const a = patternData.data[i + 3] / 255;
            let partId = null;
            if (isTMC && maskData) {
                const mr = maskData.data[i], mg = maskData.data[i + 1], mb = maskData.data[i + 2];
                const th = 100;
                const rHi = mr > th, gHi = mg > th, bHi = mb > th;
                const hi = (rHi ? 1 : 0) + (gHi ? 1 : 0) + (bHi ? 1 : 0);
                if (hi === 1) { if (rHi) partId = 'teeth'; else if (gHi) partId = 'mouth'; else partId = 'claws'; }
            }
            if (!partId) {
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                const sat = max === 0 ? 0 : (max - min) / max;
                if (a < 0.05 || sat < 0.15 || max < 0.05) {
                    partId = 'body';
                } else {
                    const hue = this.rgbToHue(r, g, b);
                    if (hue >= 330 || hue < 30) partId = this.isFemale ? 'markings' : 'maleDisplay';
                    else if (hue >= 30 && hue < 90) partId = 'special';
                    else if (hue >= 90 && hue < 150) partId = 'underbelly';
                    else if (hue >= 150 && hue < 210) partId = 'body';
                    else if (hue >= 210 && hue < 270) partId = 'flank';
                    else partId = 'markings';
                }
            }
            const intensity = (() => {
                const gid = colorKeyToCnreId(partId);
                const gmode = this.glitchMode ? this.glitchMode[gid] : null;
                if (gmode === 'pos' || gmode === 'fluor' || gmode === 'invfluor') return 1.0; // 故障自发光（满强度）
                return this.partEmission[partId] != null ? clamp01(this.partEmission[partId]) : 0;
            })();
            const hex = (this.currentColors && this.currentColors[partId]) || '000000';
            const c = hexToRgb(hex.replace('#', ''));
            out.data[i]     = Math.round(clamp01(c.r / 255 * intensity) * 255);
            out.data[i + 1] = Math.round(clamp01(c.g / 255 * intensity) * 255);
            out.data[i + 2] = Math.round(clamp01(c.b / 255 * intensity) * 255);
            out.data[i + 3] = 255;
        }
        pCtx.putImageData(out, 0, 0);
        const tex = new THREE.CanvasTexture(pCanvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        return tex;
    }
    /** 应用自发光状态到材质：flat 模式下由 flat 外观接管，此处直接返回；
     *  否则开启时烘焙自发光贴图（每个部位按自身配色发光），关闭时清除。 */
    applyEmissionState() {
        if (this.currentLighting === 'flat') return;
        if (!this.bodyMaterials || this.bodyMaterials.length === 0) return;
        if (this._emissionActive) {
            if (this._emissionTex) { try { this._emissionTex.dispose(); } catch (e) {} this._emissionTex = null; }
            const tex = this._bakeEmissiveTexture();
            this._emissionTex = tex;
            const glitchGlow = !!this.glitchMode && Object.values(this.glitchMode).some(m => m === 'pos' || m === 'fluor' || m === 'invfluor');
            for (const mat of this.bodyMaterials) {
                if (tex) {
                    mat.emissiveMap = tex;
                    mat.emissive.setRGB(1, 1, 1);
                    mat.emissiveIntensity = glitchGlow ? 1.0 : this.globalEmission;
                } else {
                    // 贴图未就绪（如无 pattern 纹理）时不套用，避免整只龙泛白发光
                    mat.emissiveMap = null;
                    mat.emissive.setRGB(0, 0, 0);
                    mat.emissiveIntensity = 1.0;
                }
                mat.needsUpdate = true;
            }
        } else {
            this._disposeEmissionTexture();
            for (const mat of this.bodyMaterials) {
                mat.emissiveMap = null;
                mat.emissive.setRGB(0, 0, 0);
                mat.emissiveIntensity = 1.0;
                mat.needsUpdate = true;
            }
        }
        if (this.renderer) this.renderer.render(this.scene, this.camera);
    }
    setPartEmission(partId, intensity) {
        if (partId in this.partEmission) this.partEmission[partId] = clamp01(intensity);
        this._recomputeEmissionActive();
        this.applyEmissionState();
    }
    setGlobalEmission(val) {
        this.globalEmission = Math.max(0, Math.min(2, typeof val === 'number' ? val : 1));
        this.applyEmissionState();
    }
    /** 同步故障态到预览（供故障自发光烘焙）：modeMap 为 CNRE 通道 id → 模式；displayMap 为 CNRE id → 显示色 hex） */
    setGlitchModes(modeMap, displayMap) {
        this.glitchMode = modeMap || {};
        this.glitchDisplayColors = displayMap || {};
        this._recomputeEmissionActive();
        this.applyEmissionState();
        if (this.currentPatternTex && this.bodyMaterials.length > 0) this.rebuildBodyTexture();
        if (this.glitchMode['eyes'] && (this.irisImg || this.pupilImg)) this.composeAndApplyEyeTexture();
    }
    setAllEmission(val) {
        const v = clamp01(val);
        for (const id of ROUGH_METAL_PARTS) this.partEmission[id] = v;
        this._recomputeEmissionActive();
        this.applyEmissionState();
    }
    resetPartEmission() {
        for (const id of ROUGH_METAL_PARTS) this.partEmission[id] = 0;
        this._recomputeEmissionActive();
        this.applyEmissionState();
    }
    /** 切换自发光微调开关：开启=应用分部位自发光 */
    setEmissionTuningEnabled(enabled) {
        this.emissionTuningEnabled = !!enabled;
        this._recomputeEmissionActive();
        this.applyEmissionState();
    }

    /** 切换光滑度微调开关：开启=应用自定义分部位粗糙度（否则用 RAC/默认粗糙度） */
    setSmoothnessTuningEnabled(enabled) {
        this.smoothnessTuningEnabled = !!enabled;
        this._recomputeRMActive();
        this.applyRACState();
    }
    /** 切换金属度微调开关：开启=应用自定义分部位金属度（否则用默认金属度 0） */
    setMetalnessTuningEnabled(enabled) {
        this.metalnessTuningEnabled = !!enabled;
        this._recomputeRMActive();
        this.applyRACState();
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
            keyIntensity = this.keyLightIntensity;
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
        // 自定义模式：应用用户指定的主光 + 环境光参数
        if (mode === 'custom') this.applyCustomLightToScene();
    }

    /** 把当前自定义光照参数套用到已存在的灯光对象上（不重建灯光，避免闪烁） */
    applyCustomLightToScene() {
        if (this.currentLighting !== 'custom') return;
        if (this.lights.key) {
            this.lights.key.color.set(this.customLightColor);
            this.lights.key.intensity = this.keyLightIntensity;
            this.lights.key.position.set(...this.calcLightPosition(this.customLightAzimuth, this.customLightElevation));
        }
        if (this.lights.ambient) {
            this.lights.ambient.color.set(this.ambientColor);
            this.lights.ambient.intensity = this.ambientIntensity;
        }
        if (this.lights.hemi) {
            this.lights.hemi.color.set(this.ambientColor);
            const a = this.ambientAngle * Math.PI / 180;
            this.lights.hemi.position.set(Math.sin(a) * 6, 8, Math.cos(a) * 6);
        }
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
        this.applyCustomLightToScene();
        this.onStateChange?.();
    }

    setKeyIntensity(v) { this.keyLightIntensity = Math.max(0, Math.min(4, Number(v) || 0)); this.applyCustomLightToScene(); this.onStateChange?.(); }
    setAmbientColor(c) { this.ambientColor = c; this.applyCustomLightToScene(); this.onStateChange?.(); }
    setAmbientIntensity(v) { this.ambientIntensity = Math.max(0, Math.min(2, Number(v) || 0)); this.applyCustomLightToScene(); this.onStateChange?.(); }
    setAmbientAngle(v) { this.ambientAngle = Math.max(0, Math.min(360, Number(v) || 0)); this.applyCustomLightToScene(); this.onStateChange?.(); }

    updateTheme(theme) { this.setSceneBackground(theme === 'dark' ? 'dark' : 'light'); }
    setGender(isFemale) { if (this.isFemale !== isFemale) { this.isFemale = isFemale; this.setFemaleMorph(isFemale); if (this.currentPatternTex && this.bodyMaterials.length > 0) this.rebuildBodyTexture(); } }
    setFeatherAlpha(alpha) {
        alpha = Math.max(0, Math.min(1, alpha));
        if (this.featherAlpha === alpha) return;
        this.featherAlpha = alpha;
        if (!this.currentDinoHasFeathers || this.bodyMaterials.length === 0) return;
        this.rebuildBodyTexture();
    }
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
            if (this.eyeNormalTex) { mat.normalMap = this.eyeNormalTex; mat.normalScale.set(1, -1); }
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
        const displayEyeColor = (this.glitchMode && this.glitchMode['eyes'] && this.glitchDisplayColors && this.glitchDisplayColors['eyes']) || this.eyeColor;
        const tex = this.composeEyeTexture(this.eyeConfig, displayEyeColor);
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

    /** 释放上一只恐龙遗留的独立贴图，必须在加载新贴图之前调用（此时仍指向旧龙） */
    _disposeCurrentTextures() {
        const ds = (t) => { if (t && t.dispose) { try { t.dispose(); } catch (e) {} } };
        ds(this.currentPatternTex); ds(this.currentNormalTex);
        ds(this.currentMaskTex); ds(this.currentRACTex); ds(this.currentEyeTex);
        this.currentPatternTex = this.currentNormalTex = this.currentMaskTex = this.currentRACTex = this.currentEyeTex = null;
    }

    rebuildBodyTexture() {
        // 故障皮预览：base color 保持原样，仅预览贴图使用显示色覆盖
        const displayColors = { ...this.currentColors };
        if (this.glitchMode && this.glitchDisplayColors) {
            for (const [cnreId, mode] of Object.entries(this.glitchMode)) {
                if (!mode || cnreId === 'eyes') continue;
                const key = cnreIdToColorKey(cnreId);
                const hex = this.glitchDisplayColors[cnreId];
                if (key && hex) displayColors[key] = hex.replace('#', '');
            }
        }
        const bakedTex = this.bakeColorTexture(this.currentPatternTex, displayColors, this.currentDinoHasSpecial);
        const finalTex = this.mergeMaskTexture(bakedTex, this.currentMaskTex, displayColors);
        bakedTex.dispose();  // 中间产物，合并后不再需要
        const cavityTex = this.applyCavityToTexture(finalTex, this.currentRACTex, 0.7);
        finalTex.dispose();  // 中间产物，渗线后不再需要
        const featherCut = this.currentDinoHasFeathers && this.featherAlpha > 0.001;
        for (const mat of this.bodyMaterials) {
            if (mat.map && mat.map !== cavityTex) mat.map.dispose();  // 释放上一次的旧合成贴图
            mat.map = cavityTex;
            if (this.currentLighting === 'flat') mat.emissiveMap = cavityTex;
            // 羽毛区用 alphaTest 硬切避免半透明穿模，而不是 transparent 软混合
            mat.transparent = false;
            mat.alphaTest = featherCut ? 0.5 : 0.0;
            mat.depthWrite = true;
            mat.needsUpdate = true;
        }
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

    /**
     * RGB → 色相角 (0~360)
     */
    rgbToHue(r, g, b) {
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max === min) return 0;
        const d = max - min;
        let h = 0;
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return h * 60;
    }

    bakeColorTexture(maskTex, colors, hasSpecial = true, luminanceStrength = 0.75, maxSize = 2048) {
        const source = maskTex.image;
        if (!source) return maskTex;
        const w = Math.min(source.width, maxSize);
        const h = Math.min(source.height, maxSize);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const maleColor = this.isFemale ? hexToRgb(colors.markings || '5D4343') : hexToRgb(colors.maleDisplay || 'E78D60');
        const cMarkings = hexToRgb(colors.markings || '5D4343');
        const cBody = hexToRgb(colors.body || 'C08F78');
        const cFlank = hexToRgb(colors.flank || 'A16C60');
        const cUnderbelly = hexToRgb(colors.underbelly || '9D8D7C');
        const cSpecial = hasSpecial ? hexToRgb(colors.special || '000000') : null;
        for (let i = 0; i < imgData.data.length; i += 4) {
            const r = imgData.data[i] / 255, g = imgData.data[i+1] / 255, b = imgData.data[i+2] / 255;
            const a = imgData.data[i+3] / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;

            // 透明 / 低饱和 / 近黑 → 保留明度，用 body 色
            if (a < 0.05 || saturation < 0.15 || max < 0.05) {
                const lum = 1 - (1 - max) * luminanceStrength;
                imgData.data[i]   = Math.min(255, cBody.r * lum);
                imgData.data[i+1] = Math.min(255, cBody.g * lum);
                imgData.data[i+2] = Math.min(255, cBody.b * lum);
                continue;
            }

            // 按色相（hue）分类到对应身体区域
            const hue = this.rgbToHue(r, g, b);
            let out;
            if (hue >= 330 || hue < 30)      out = maleColor;
            else if (hue >= 30  && hue < 90) out = cSpecial || cBody;
            else if (hue >= 90  && hue < 150) out = cUnderbelly;
            else if (hue >= 150 && hue < 210) out = cBody;
            else if (hue >= 210 && hue < 270) out = cFlank;
            else                               out = cMarkings;

            const lum = 1 - (1 - max) * luminanceStrength;
            imgData.data[i]   = Math.min(255, out.r * lum);
            imgData.data[i+1] = Math.min(255, out.g * lum);
            imgData.data[i+2] = Math.min(255, out.b * lum);
        }
        ctx.putImageData(imgData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        tex.userData.canvas = canvas; // 供贴图导出复用合成结果
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

        // 先把基础身体贴图 alpha 全部填为 255，避免 pattern 自身半透明像素
        // 被羽毛 alphaTest 硬切误删（TMC/身体/TMC 器官必须完全不透明）。
        // 对于半透明像素用 body 色补足 RGB，防止透明区直接变成黑色碎片。
        const cBody = hexToRgb(colors.body || 'C08F78');
        for (let i = 0; i < baseData.data.length; i += 4) {
            const a = baseData.data[i+3] / 255;
            if (a < 1.0) {
                const inv = 1 - a;
                baseData.data[i]   = Math.min(255, baseData.data[i]   + cBody.r * inv);
                baseData.data[i+1] = Math.min(255, baseData.data[i+1] + cBody.g * inv);
                baseData.data[i+2] = Math.min(255, baseData.data[i+2] + cBody.b * inv);
            }
            baseData.data[i+3] = 255;
        }

        // 检测 mask 是否为 TMC 格式 (R=牙, G=嘴, B=爪)
        const isTMC = colors ? this.detectTMCMask(maskData) : false;
        // 羽毛检测：TMC 中青色/品红色双通道区域为羽毛/绒毛
        this.currentDinoHasFeathers = isTMC && this.detectFeatherRegions(maskData);
        // 带毛恐龙：始终自动切除黑色背景（身体），保留品红/青羽区与 TMC。
        // 不再用滑块控制，featherAlpha 固定为 1（黑色背景 alpha=0 被硬切）。
        this.featherAlpha = this.currentDinoHasFeathers ? 1 : 0;

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
                } else if (this.currentDinoHasFeathers) {
                    if (hiCount >= 2 && ((rHi && bHi) || (gHi && bHi))) {
                        // 羽毛/绒毛 mask 区域（品红/青）：这是要保留的部分。
                        // 蒙版本身不是颜色，真实羽毛由游戏 alpha 贴图实现；颜色保留基础身体贴图，
                        // 不叠加品红/青色，alpha 始终 255（不切除）。
                        baseData.data[i+3] = 255;
                    } else if (hiCount === 0) {
                        // 黑色背景（身体皮肤区域）：带毛恐龙始终切除（featherAlpha 已固定为 1）。
                        // 露出底层，即游戏里被羽毛/绒毛覆盖、本身无皮肤贴图的区域。
                        // 保留：品红/青羽毛区 + TMC（牙/嘴/爪）。
                        baseData.data[i+3] = 0;
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
        tex.userData.canvas = canvas; // 供贴图导出复用合成结果
        return tex;
    }

    /**
     * 合成"烘焙完毕"的漫反射贴图 canvas：pattern 按部位着色 + TMC 牙/嘴/爪换色。
     * 与预览管线共用 bakeColorTexture/mergeMaskTexture，但**不注入 RAC 渗线和法线**。
     * 输出为 sRGB 平铺贴图；有羽毛恐龙的青色/品红色羽毛 mask 区域只控制 alpha、不叠加颜色。
     * @returns {HTMLCanvasElement|null}
     */
    composeBakedBodyCanvas() {
        if (!this.currentPatternTex || !this.currentPatternTex.image) return null;
        const bakedTex = this.bakeColorTexture(this.currentPatternTex, this.currentColors, this.currentDinoHasSpecial, 0.75, Infinity);
        let canvas = bakedTex.userData.canvas || bakedTex.image;
        if (this.currentMaskTex && this.currentMaskTex.image) {
            const mergedTex = this.mergeMaskTexture(bakedTex, this.currentMaskTex, this.currentColors);
            canvas = mergedTex.userData.canvas || mergedTex.image;
        }
        return canvas;
    }

    /**
     * 导出烘焙贴图为 PNG 并触发下载。
     * @param {string} filename - 下载文件名, 如 'Dilophosaurus_Pattern_1_baked.png'
     * @returns {boolean} 是否成功开始导出
     */
    exportBakedTexturePNG(filename) {
        const canvas = this.composeBakedBodyCanvas();
        if (!canvas) return false;
        canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'baked_skin.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
        return true;
    }

    /**
     * 导出当前恐龙的透明背景 PNG（场景背景清空、临时隐藏网格，仅保留模型本身）。
     * 渲染器已开启 preserveDrawingBuffer，且本方法在导出前同步再渲染一帧，确保 toDataURL 取到最新画面。
     * @returns {boolean} 是否成功开始导出
     */
    downloadTransparentPNG() {
        if (!this.renderer || !this.scene || !this.camera) return false;
        const prevBg = this.scene.background;
        const prevGrid = this.gridEnabled;
        const prevBgMode = this.currentBg;
        const prevClear = new THREE.Color();
        this.renderer.getClearColor(prevClear);
        const prevAlpha = this.renderer.getClearAlpha();
        const prevAutoClear = this.renderer.autoClear;
        // 进入透明导出模式：直接改状态字段，不走 toggleGrid/applyBackground
        // （applyBackground 在「关网格」时会把 scene.background 重新设成黑色 Color，覆盖我们要的 null）
        this.gridEnabled = false;
        this.currentBg = 'transparent';
        this.scene.background = null;
        this.renderer.autoClear = true;
        this.renderer.setClearColor(prevClear, 0);
        this.renderer.clear();
        // 同步渲染一帧，确保 drawing buffer 是当前画面
        this.renderer.render(this.scene, this.camera);
        // 诊断：读取左上角像素 alpha，若不为 0 则控制台报错
        try {
            const gl = this.renderer.getContext();
            const pixel = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            if (pixel[3] !== 0) {
                console.error('[DinoPreview] 透明导出诊断：背景像素 alpha =', pixel[3], '（应为 0，请把此截图发给我）');
            }
        } catch (e) { /* ignore readPixels 失败 */ }
        let ok = false;
        try {
            const dataURL = this.renderer.domElement.toDataURL('image/png');
            const a = document.createElement('a');
            const base = (this.currentDinoName || 'Dino') + (this.currentPatternName ? '_' + this.currentPatternName : '');
            a.href = dataURL;
            a.download = `${base}_transparent.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            ok = true;
        } catch (e) {
            console.error('[DinoPreview] 透明背景导出失败:', e);
        } finally {
            // 还原背景、clear alpha、autoClear、网格与背景模式（不调用 applyBackground，避免再次覆盖场景背景）
            this.scene.background = prevBg;
            this.gridEnabled = prevGrid;
            this.currentBg = prevBgMode;
            this.renderer.setClearColor(prevClear, prevAlpha);
            this.renderer.autoClear = prevAutoClear;
            // 还原后立即渲染一帧，避免画面残留透明状态
            this.renderer.render(this.scene, this.camera);
        }
        return ok;
    }

    /**
     * 将 RAC 贴图的 cavity 数据（B 通道）乘入最终皮肤贴图，复现游戏中鳞片缝隙的"渗线"效果。
     *
     * RAC 的 B 通道 = Cavity（缝隙处暗，凸起处亮）。
     * 渗线公式：`factor = 1.0 - (1.0 - cavity) * 0.7` 让缝隙处压暗到 0.3 倍，凸起处不变。
     */
    applyCavityToTexture(finalTex, racTex, intensity = 1.0) {
        if (!racTex || !racTex.image || !finalTex || !finalTex.image) return finalTex;
        if (intensity <= 0) return finalTex;
        const finalImg = finalTex.image;
        const canvas = document.createElement('canvas');
        canvas.width = finalImg.width;
        canvas.height = finalImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(finalImg, 0, 0);
        const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 把 RAC 缩放到与 final 贴图同尺寸
        const racCanvas = document.createElement('canvas');
        racCanvas.width = canvas.width;
        racCanvas.height = canvas.height;
        const racCtx = racCanvas.getContext('2d');
        racCtx.drawImage(racTex.image, 0, 0, racCanvas.width, racCanvas.height);
        const racData = racCtx.getImageData(0, 0, racCanvas.width, racCanvas.height);

        for (let i = 0; i < finalData.data.length; i += 4) {
            // Cavity 从 B 通道读取（缝隙暗→压暗，凸起亮→不变）
            const cavity = racData.data[i + 2] / 255;
            const factor = 1.0 - (1.0 - cavity) * 0.7;
            finalData.data[i]     = Math.min(255, finalData.data[i]     * factor);
            finalData.data[i + 1] = Math.min(255, finalData.data[i + 1] * factor);
            finalData.data[i + 2] = Math.min(255, finalData.data[i + 2] * factor);
        }

        ctx.putImageData(finalData, 0, 0);
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

    /**
     * 检测 TMC mask 是否包含羽毛/绒毛区域。
     * 羽毛在 TMC 中用双通道高亮表示：品红(R+B)、青(G+B)，有时含蓝通道。
     * 阈值 0.5%：只要这类像素足够多，就视为有羽毛恐龙。
     */
    detectFeatherRegions(maskData) {
        let featherCount = 0;
        const totalPixels = maskData.data.length / 4;
        if (totalPixels === 0) return false;
        const threshold = 100;
        for (let i = 0; i < maskData.data.length; i += 4) {
            const rHi = maskData.data[i] > threshold;
            const gHi = maskData.data[i + 1] > threshold;
            const bHi = maskData.data[i + 2] > threshold;
            const hiCount = (rHi ? 1 : 0) + (gHi ? 1 : 0) + (bHi ? 1 : 0);
            if (hiCount >= 2) {
                // 品红(R+B) 或 青(G+B) 视为羽毛；黄色(R+G) 在本游戏 TMC 中未出现，也忽略
                if ((rHi && bHi) || (gHi && bHi)) featherCount++;
            }
        }
        return featherCount / totalPixels > 0.005;
    }

    async loadModel(dinoName, patternName) {
        this.showLoading(true);
        this.updateLoadingProgress(0, '准备加载...');
        this.currentDinoName = dinoName;
        this.currentPatternName = patternName;
        // 加载新贴图前先释放上一只恐龙的独立贴图（此时仍指向旧龙，避免显存累积）
        this._disposeCurrentTextures();
        const data = DINOSAUR_DATA[dinoName];
        // 按皮肤设置 hasSpecial (优先 patternMeta, 否则恐龙级), 修复无 special 皮肤的怪色块
        this.currentDinoHasSpecial = getPatternHasSpecial(dinoName, patternName);
        // 机制B/C：读取该恐龙的 rig 描述符（无则 null，走旧逻辑零回归）
        this.rig = (data && data.rig) ? data.rig : null;
        // 允许 per-dino 覆盖模型文件名（部分恐龙的完整动作集在 *_both.glb 等额外文件里）
        const modelFile = (data && data.modelFile) ? data.modelFile : `${dinoName}.glb`;
        const modelPath = assetUrl(`./Assets/Dino/${dinoName}/${modelFile}`);
        const patternPath = assetUrl(`./Assets/Dino/${dinoName}/${dinoName}_${patternName}.png`);
        const normalPath = assetUrl(`./Assets/Dino/${dinoName}/${dinoName}_Normal.png`);
        const maskPathNew = assetUrl(`./Assets/Dino/${dinoName}/${dinoName}_TMC_Mask.png`);
        const maskPathOld = assetUrl(`./Assets/Dino/${dinoName}/${dinoName}_Mask.png`);
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
                // 旧模型已移出场景，释放其合成的漫反射/自发光贴图
                for (const m of (this.bodyMaterials || [])) { try { m.map && m.map.dispose(); m.emissiveMap && m.emissiveMap.dispose(); } catch (e) {} }
            }
            // 清空旧 action 引用，防止切恐龙时残留
            this.curIdleAction = null;
            this.curJuvIdleAction = null;
            this.curAdultIdleAction = null;
            this.curVocalAction = null;
            this.vocalPlaying = false;
            this.idleWeightCurr = { juv: 0, ad: 0 };
            this.idleWeightTarget = { juv: 0, ad: 0 };
            this.ageIdleActions = {};            // mixer 已失效，旧 action 引用丢弃
            // 机制B：重置 additive 叠加层（旧 action 随 currentMixer 失效，无需单独 stop）
            this.additiveActions = [];
            this.additiveWeightCurr = 0;
            this.additiveWeightTarget = 0;
            const model = gltf.scene;
            // 归一化缩放：某些 GLB（如 Oviraptor_both.glb）根节点已有非 1 的缩放（0.01759），
            // Box3 得到的是世界尺寸。若直接拿这个世界尺寸当几何本征尺寸去重设 model.scale，
            // 会丢弃原始缩放并把模型放大几十倍。这里先除以当前 uniform scale，得到真实几何尺寸。
            const currentScale = model.scale.x || 1;
            const box = new THREE.Box3().setFromObject(model);
            const worldCenter = box.getCenter(new THREE.Vector3());
            const worldSize = box.getSize(new THREE.Vector3());
            const geoHeight = worldSize.y / currentScale;
            const targetHeight = 1.6;
            const baseScale = targetHeight / geoHeight;
            this.modelBaseScale = Math.min(baseScale * 0.5, 0.8);
            this.modelUserScale = 1;
            const defaultScale = this.modelBaseScale;
            this.modelCenter.copy(worldCenter).divideScalar(currentScale);
            model.scale.setScalar(defaultScale);
            model.position.set(-this.modelCenter.x * defaultScale, -this.modelCenter.y * defaultScale, -this.modelCenter.z * defaultScale);
            this.updateLoadingProgress(85, '加载贴图...');
            // Dispose previous composited eye texture
            if (this.currentEyeTex) { this.currentEyeTex.dispose(); this.currentEyeTex = null; }
            this.irisImg = null; this.pupilImg = null;
            const [normalTex, maskTex, racTex] = await Promise.all([
                this.tryLoadTexture(normalPath, '法线'),
                (async () => {
                    let tex = await this.tryLoadTexture(maskPathNew, 'Mask(TMC)');
                    if (!tex) tex = await this.tryLoadTexture(maskPathOld, 'Mask(旧)');
                    return tex;
                })(),
                (async () => {
                    // 多路径回退：约定名 → 简化名 → UE导出名(T_前缀)
                    let tex = await this.tryLoadTexture(assetUrl(`./Assets/Dino/${dinoName}/${dinoName}_RAC_Mask.png`), 'RAC(Mask)');
                    if (!tex) tex = await this.tryLoadTexture(assetUrl(`./Assets/Dino/${dinoName}/${dinoName}_RAC.png`), 'RAC');
                    if (!tex) tex = await this.tryLoadTexture(assetUrl(`./Assets/Dino/${dinoName}/T_${dinoName}_RAC.png`), 'RAC(T_)');
                    return tex;
                })()
            ]);
            this.currentMaskTex = maskTex;
            this.currentNormalTex = normalTex;
            if (this.currentNormalTex) this.currentNormalTex.colorSpace = THREE.LinearSRGBColorSpace;
            this.currentRACTex = racTex;
            if (this.currentRACTex) this.currentRACTex.colorSpace = THREE.LinearSRGBColorSpace;
            this.updateLoadingProgress(95, '烘焙贴图中...');
            const bakedTex = this.bakeColorTexture(patternTex, this.currentColors, this.currentDinoHasSpecial);
            const finalBodyTex = this.mergeMaskTexture(bakedTex, maskTex, this.currentColors);
            const bodyTexWithCavity = this.applyCavityToTexture(finalBodyTex, racTex, 1.0);
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
                        map: null,
                        roughness: 0.4,
                        metalness: 0.1,
                        side: THREE.DoubleSide,
                        color: c
                    });
                    child.material = em;
                    child.frustumCulled = false;
                    this.eyeMaterials.push(em);
                } else {
                    // 使用RAC的R通道作为完整roughness数据，基础roughness设为1.0避免二次缩放
                    const featherCut = this.currentDinoHasFeathers && this.featherAlpha > 0.001;
                    const bm = new THREE.MeshStandardMaterial({
                        map: bodyTexWithCavity,
                        roughness: this.currentRACTex ? 1.0 : 0.6,
                        metalness: 0.0,
                        side: THREE.DoubleSide,
                        // 羽毛区用 alphaTest 硬切剔除，避免 transparent 软混合导致穿模
                        transparent: false,
                        alphaTest: featherCut ? 0.5 : 0.0,
                        depthWrite: true
                    });
                    if (normalTex && this.normalMapEnabled && this.quality !== 'low') {
                        bm.normalMap = normalTex;
                        bm.normalScale.set(0.4, -0.4);
                    }
                    if (racTex && this.racEnabled && this.quality !== 'low') {
                        bm.roughnessMap = racTex;
                        bm.aoMap = racTex;
                        bm.aoMapIntensity = 1.0;
                        this._injectRACShader(bm);
                    }
                    if (this.smoothRendering) {
                        bm.roughness = 0.2;
                        bm.metalness = 0.0;
                    }
                    child.material = bm;
                    this.bodyMaterials.push(bm);
                }
                // 骨骼网格关闭视锥剔除，防止 bind-pose 包围球在某些情况下失效导致整只龙消失
                child.frustumCulled = false;
                child.castShadow = this.shadowsEnabled;
                child.receiveShadow = this.shadowsEnabled;
            });
            if (gltf.animations && gltf.animations.length > 0) {
                this.currentMixer = new THREE.AnimationMixer(model);
                this.parseAnimClips(gltf, dinoName);
                // 从 dino data 读取动画速度配置
                const dinoData = DINOSAUR_DATA[dinoName];
                this.timeScale = (typeof this.savedAnimSpeed === 'number') ? this.savedAnimSpeed
            : ((dinoData && dinoData.animSpeed) ? dinoData.animSpeed : 1.0);
                this.vocalTimeScale = (dinoData && dinoData.vocalSpeed) ? dinoData.vocalSpeed : 1.5;
            }
            // 先把模型加入场景，再启动动画/形态键，避免初始 T-pose
            this.scene.add(model);
            this.currentModel = model;
            // T Pose 状态随模型重载复位（新模型默认即 bind/T-pose，idle 会重新启动）
            this.tPoseMode = false;
            // 缓存 bind 姿势（骨骼局部变换），供 T Pose 复位——直接还原局部变换，
            // 绕开 skeleton.pose() 用 bone.matrixWorld*inverse 反推时受根节点缩放污染（导致剑龙等缩小）。v0.5.9.46
            this._bindPose = new Map();
            model.updateMatrixWorld(true);
            model.traverse(obj => {
                if (obj.isBone) {
                    this._bindPose.set(obj, { pos: obj.position.clone(), quat: obj.quaternion.clone(), scl: obj.scale.clone() });
                }
            });
            const tPoseBtn = document.getElementById('tPoseBtn');
            if (tPoseBtn) { tPoseBtn.classList.remove('active'); tPoseBtn.title = '设为 T Pose（静止参考姿势）'; }
            // 解析形态键（内部会调 setAgeStage -> playIdleForAge）
            this.parseMorphTargets(model, dinoName);
            this.applyFlatMode(this.currentLighting === 'flat');
            await this.applyEyeConfig(dinoName);
            // 确保法线贴图状态在模型加载完成后正确应用
            this.applyNormalMapState();
            this.applyRACState(); // applyRACState 末尾已同步调用 applyEmissionState
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
        // 自发光贴图编码了各部位配色，配色变化后需重烘焙
        if (this._emissionActive) this.applyEmissionState();
    }

    forceUpdateColors(colors) {
        this.currentColors = { ...colors };
        this.forceRebuildBodyTexture();
    }

    /** 把已加载的贴图降采样到 maxDim 以内，避免 4K 源贴图直接吃满显存导致上下文丢失 */
    _downscaleTexture(tex, maxDim) {
        if (!maxDim) return tex;
        const img = tex.image;
        if (!img || !img.width || !img.height) return tex;
        const w = img.width, h = img.height;
        if (w <= maxDim && h <= maxDim) return tex;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, cw, ch);
        const newTex = new THREE.CanvasTexture(canvas);
        newTex.flipY = tex.flipY;
        newTex.colorSpace = tex.colorSpace;
        newTex.wrapS = tex.wrapS; newTex.wrapT = tex.wrapT;
        newTex.needsUpdate = true;
        tex.dispose();
        return newTex;
    }

    tryLoadTexture(path, label, colorSpace = THREE.SRGBColorSpace, maxDim = 2048) {
        return new Promise(r => {
            this.texLoader.load(path, tex => {
                tex.flipY = false;
                tex.colorSpace = colorSpace;
                r(this._downscaleTexture(tex, maxDim));
            }, undefined, () => {
                console.warn(`⚠️ ${label}缺失: ${path}`);
                r(null);
            });
        });
    }

    loadTexture(path) { return new Promise((res, rej) => { this.texLoader.load(path, res, undefined, rej); }); }
    loadGLTFWithProgress(path, onProgress) { return new Promise((res, rej) => { this.loader.load(path, res, p => { if (p.total && onProgress) onProgress(p.loaded / p.total); }, rej); }); }

    /** 进入预览点击取色模式 (v0.5.9.25)：光标变十字，等待用户点击画布 */
    beginEyedrop(key) {
        this.eyedropKey = key;
        if (this.renderer && this.renderer.domElement) this.renderer.domElement.style.cursor = 'crosshair';
    }

    /** 退出预览点击取色模式，恢复光标 */
    endEyedrop() {
        this.eyedropKey = null;
        if (this.renderer && this.renderer.domElement) this.renderer.domElement.style.cursor = '';
    }

    /** 预览画布指针按下事件：取色模式下左键读取像素并回调 UIManager；右键取消 */
    _onPreviewPointerDown(e) {
        if (!this.eyedropKey) return;
        if (e.button === 2) { this.endEyedrop(); return; }
        if (e.button !== 0) return;
        const hex = this._readPixelHexAt(e);
        const key = this.eyedropKey;
        if (hex && this.onEyedrop) this.onEyedrop(key, hex);
        this.endEyedrop();
    }

    /** 读取点击事件处画布像素的 sRGB 十六进制（WebGL 默认帧缓冲，含 toneMapping 结果）(v0.5.9.25) */
    _readPixelHexAt(e) {
        const canvas = this.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const xCss = e.clientX - rect.left;
        const yCss = e.clientY - rect.top;
        if (xCss < 0 || yCss < 0 || xCss > rect.width || yCss > rect.height) return null;
        const x = Math.floor(xCss * (canvas.width / rect.width));
        const yTop = Math.floor(yCss * (canvas.height / rect.height));
        const yGl = canvas.height - yTop; // WebGL 原点在左下，需翻转 Y
        const gl = this.renderer.getContext();
        const px = new Uint8Array(4);
        gl.readPixels(x, yGl, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (px[3] === 0) return null; // 透明背景区域，不取色
        const h = (v) => v.toString(16).padStart(2, '0').toUpperCase();
        return h(px[0]) + h(px[1]) + h(px[2]);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const d = Math.min(this.clock.getDelta(), 0.1);
        if (this.currentMixer) {
            this.currentMixer.timeScale = this.timeScale;
            // 暂停时彻底不推进时间轴，避免"慢慢放"
            if (!this.animationPaused) {
                this.currentMixer.update(d);
            }
            // 平滑 lerp idle 混合权重（约 0.3 秒过渡）；T Pose 下所有 action 已停，跳过避免干扰
            if (!this.tPoseMode) {
                this._lerpIdleWeights(d);
                // 平滑 lerp 机制B additive 叠加权重
                this._lerpAdditiveWeights(d);
            }
        }
        this.controls.update();
        // 贴近视距时自适应降分辨率，缓解填充率瓶颈带来的卡顿（不影响导出清晰度）
        this._applyAdaptivePixelRatio();
        this.renderer.render(this.scene, this.camera);
        this.updateGizmo();
    }

    /** 每帧 lerp idle 混合权重，实现平滑 crossFade */
    _lerpIdleWeights(delta) {
        if (this.vocalPlaying) return;
        const factor = 1 - Math.exp(-delta * 12);
        const tgt = this.idleWeightTarget;
        const cur = this.idleWeightCurr;

        cur.juv += (tgt.juv - cur.juv) * factor;
        cur.ad  += (tgt.ad  - cur.ad)  * factor;
        if (Math.abs(tgt.juv - cur.juv) < 0.001) cur.juv = tgt.juv;
        if (Math.abs(tgt.ad  - cur.ad)  < 0.001) cur.ad  = tgt.ad;

        if (this.curJuvIdleAction) {
            this.curJuvIdleAction.setEffectiveWeight(cur.juv);
            this.curJuvIdleAction.setEffectiveTimeScale(cur.juv > 0.01 ? 1 : 0);
        }
        if (this.curAdultIdleAction) {
            this.curAdultIdleAction.setEffectiveWeight(cur.ad);
            this.curAdultIdleAction.setEffectiveTimeScale(cur.ad > 0.01 ? 1 : 0);
        }
    }

    toggleAnimationPause() {
        this.animationPaused = !this.animationPaused;
        return this.animationPaused;
    }

    /** 切换 T Pose（静止参考姿势）：停掉所有 mixer action 并把每个骨骼复位到加载时缓存的 bind 局部变换；
     *  关闭时重新播放当前年龄段 idle 动画。v0.5.9.46 修正：用缓存还原（不再缩小）、退出时彻底恢复播放 */
    setTPose(enabled) {
        this.tPoseMode = !!enabled;
        if (this.tPoseMode) {
            // 1) 停掉所有正在运行的 action（idle 混合 / 单一 idle / crossfade / additive / vocal）
            if (this.currentMixer) {
                for (const a of Object.values(this.ageIdleActions || {})) { try { a.stop(); } catch (e) {} }
                for (const a of (this.additiveActions || [])) { try { a.stop(); } catch (e) {} }
                for (const a of [this.curIdleAction, this.curJuvIdleAction, this.curAdultIdleAction, this.curVocalAction]) { try { if (a) a.stop(); } catch (e) {} }
            }
            // 2) 骨骼复位到 bind 姿势（缓存局部变换，绕开 skeleton.pose() 的缩小 bug）
            this._restoreBindPose();
        } else {
            // 退出 T Pose：被 stop 的 action 需 reset+play 才能真正恢复（仅 setEffectiveWeight 对已停 action 无效）
            if (this.currentMixer) {
                const replay = (a) => { if (a) { try { a.enabled = true; a.reset(); a.play(); } catch (e) {} } };
                Object.values(this.ageIdleActions || {}).forEach(replay);
                replay(this.curJuvIdleAction); replay(this.curAdultIdleAction); replay(this.curIdleAction); replay(this.curVocalAction);
            }
            if (this.currentMixer) this.playIdleForAge(this.ageStage);
            // 若当前处于暂停态，推进一帧让姿态落到 idle 第一帧（否则停在被还原的 bind 姿势）
            if (this.animationPaused && this.currentMixer) this.currentMixer.update(0);
        }
        this.onStateChange?.();
        return this.tPoseMode;
    }

    /** 用加载时缓存的 bind 局部变换还原所有骨骼（免疫根节点缩放，模型不改大小） */
    _restoreBindPose() {
        if (!this.currentModel || !this._bindPose) return;
        this.currentModel.traverse(obj => {
            if (obj.isBone) {
                const b = this._bindPose.get(obj);
                if (b) { obj.position.copy(b.pos); obj.quaternion.copy(b.quat); obj.scale.copy(b.scl); }
            }
        });
    }

    /** 设置 idle 动画播放速度倍率（0.1~3.0）；同时记忆为用户覆盖值并触发热更新 */
    setTimeScale(v) {
        const s = Math.max(0.1, Math.min(3.0, Number(v) || 1.0));
        this.timeScale = s;
        this.savedAnimSpeed = s;
        if (this.currentMixer) this.currentMixer.timeScale = s;
        this.onStateChange?.();
        return s;
    }

    // ==================== 形态键系统 ====================

    /** 从已加载的 model 解析 morph targets，自动检测形态键类型 */
    parseMorphTargets(model, dinoName) {
        this.morphMeshes = [];
        const allMorphNames = new Set();
        model.traverse(child => {
            if (!child.isMesh || !child.morphTargetDictionary || !child.morphTargetInfluences) return;
            this.morphMeshes.push(child);
            Object.keys(child.morphTargetDictionary).forEach(k => allMorphNames.add(k));
        });
        // 自动检测形态键
        this._morphKeyToName = this._detectMorphKeys(allMorphNames);
        // 动态构建 morphTimeline
        this.morphTimeline = this._buildMorphTimeline(this._morphKeyToName);
        // 初始化年龄
        this.ageStage = 75;
        this.femaleMorphEnabled = false;
        if (this.morphTimeline && Object.keys(this.morphTimeline).length > 0) {
            // 含年龄段形态键（可玩物种）→ 按滑块位置应用 morph + idle
            this.setAgeStage(75, dinoName);
        } else {
            // 无可玩的年龄段形态键（如非可玩物种 美颌龙/翼手龙）：
            // 不显示年龄段 UI，直接以 Adult_Idle 为默认姿态（无 morph 可应用）
            this.applyMorphWeights({}, dinoName);
            if (this.currentMixer) this.playIdleForAge(this.ageStage);
        }
    }

    /**
     * 从 GLB morph target 名称中自动识别形态键类型。
     * 关键词：hatch/hatchling → hatchling, juv/juvenile → juvenile,
     *        sub/subadult → subadult, elder/old → elder, female/fem → female
     * 忽略：gore/wound/blood/damage
     */
    _detectMorphKeys(allMorphNames) {
        const result = { hatchling: null, juvenile: null, subadult: null, elder: null, female: null };
        for (const name of allMorphNames) {
            const lower = name.toLowerCase();
            if (/gore|wound|blood|damage/i.test(lower)) continue;
            // 拆分成 token：支持下划线分隔 + 驼峰（SubAdult → sub, adult）
            const tokens = name.split(/[_\s]+/).flatMap(t =>
                t.replace(/([a-z])([A-Z])/g, '$1_$2').split('_').map(ct => ct.toLowerCase())
            );
            // subadult：token 为 "sub" 或 "subadult"
            if (tokens.some(t => t === 'sub' || t === 'subadult')) {
                result.subadult = name; continue;
            }
            // hatchling
            if (tokens.some(t => t.includes('hatch'))) {
                result.hatchling = name; continue;
            }
            // juvenile
            if (tokens.some(t => t.includes('juv'))) {
                result.juvenile = name; continue;
            }
            // elder
            if (tokens.some(t => t === 'elder' || t === 'old' || t.includes('elder'))) {
                result.elder = name; continue;
            }
            // female
            if (tokens.some(t => t === 'female' || t === 'fem')) {
                result.female = name; continue;
            }
        }
        return result;
    }

    /**
     * 根据检测到的形态键动态构建 morphTimeline。
     * 规则：无键=75%为模型基态，elder=100%，其余按以下位置分布：
     *   hatch+juv+sub → hatch=0, juv=25, sub=50
     *   juv+sub(无hatch) → juv=0, sub=50
     *   hatch+juv(无sub) → hatch=0, juv=50
     *   juv only → juv=0
     * 每个时间轴都会显式补上 0% 权重为 0，防止 slider 在首帧之前取到首帧值。
     */
    _buildMorphTimeline(detected) {
        const tl = {};
        const hasHatch = !!detected.hatchling;
        const hasJuv   = !!detected.juvenile;
        const hasSub   = !!detected.subadult;
        const hasElder = !!detected.elder;
        if (!hasHatch && !hasJuv && !hasSub && !hasElder && !detected.female) return tl;

        let juvPos;
        if (hasHatch && hasSub)  juvPos = 25;
        else if (hasHatch)       juvPos = 50;
        else                     juvPos = 0;

        if (hasHatch)  tl.hatchling = { 0: 1.0, [juvPos]: 0 };
        if (hasJuv) {
            // 如果 juvenile 是首个形态键，从 0% 开始；否则 0% 权重为 0
            if (juvPos === 0) {
                tl.juvenile = hasSub ? { 0: 1.0, 50: 0 } : { 0: 1.0, 75: 0 };
            } else {
                tl.juvenile = hasSub ? { 0: 0, [juvPos]: 1.0, 50: 0 } : { 0: 0, [juvPos]: 1.0, 75: 0 };
            }
        }
        if (hasSub)    tl.subadult  = { [juvPos]: 0, 50: 1.0, 75: 0 };
        if (hasElder)  tl.elder     = { 0: 0, 75: 0, 100: 1.0 };
        if (detected.female) tl.female = { 0: 0, 50: 0, 75: 1.0 };
        return tl;
    }

    /** 根据滑块位置和 timeline 计算各 morph 权重 */
    calcMorphWeights(sliderPos) {
        const weights = {};
        if (!this.morphTimeline) return weights;
        for (const [key, keyframes] of Object.entries(this.morphTimeline)) {
            const entries = Object.entries(keyframes).map(([p, w]) => [parseFloat(p), w]).sort((a, b) => a[0] - b[0]);
            if (entries.length === 0) continue;
            // sliderPos 在首帧之前 → 若严格早于首帧则权重为 0，否则取首帧值
            if (sliderPos <= entries[0][0]) {
                weights[key] = sliderPos < entries[0][0] ? 0 : entries[0][1];
                continue;
            }
            // sliderPos 在末帧之后 → 末帧权重
            if (sliderPos >= entries[entries.length - 1][0]) {
                weights[key] = entries[entries.length - 1][1];
                continue;
            }
            // 在两帧之间 → 线性插值
            for (let i = 0; i < entries.length - 1; i++) {
                const [p0, w0] = entries[i];
                const [p1, w1] = entries[i + 1];
                if (sliderPos >= p0 && sliderPos <= p1) {
                    const t = (sliderPos - p0) / (p1 - p0);
                    weights[key] = w0 + (w1 - w0) * t;
                    break;
                }
            }
        }
        return weights;
    }

    /**
     * 设置年龄段滑块 (0~100)，同时处理 morph 混合 + 动画 crossFade
     */
    setAgeStage(value, dinoName) {
        // 保留当前 idle 动画时间，避免拖动滑块时从头播放
        const prevIdleTime = this._getActiveIdleTime();
        this.ageStage = Math.max(0, Math.min(100, value));
        // 1. 计算 morph 权重
        const morphWeights = this.calcMorphWeights(this.ageStage);
        // 2. 应用 female toggle
        if (typeof morphWeights.female === 'number') {
            morphWeights.female = this.femaleMorphEnabled ? morphWeights.female : 0;
        }
        // 3. 应用到所有 mesh 的 morph targets
        this.applyMorphWeights(morphWeights, dinoName);
        // 4. 切换 idle 动画（传入滑块位置用于 crossFade）
        this.playIdleForAge(this.ageStage);
        // 5. 恢复动画时间，使拖动滑块在当前帧继续而非从头播放
        this._restoreActiveIdleTime(prevIdleTime);
    }

    /** 取当前正在播放的 idle action 的本地时间（用于拖动滑块时保持帧连续） */
    _getActiveIdleTime() {
        if (this.curIdleAction) return this.curIdleAction.time;
        // 从持续播放的 ageIdleActions 中取权重最大者的时间
        let bestTime = 0, bestW = -1;
        for (const action of Object.values(this.ageIdleActions)) {
            const w = action.getEffectiveWeight();
            if (w > bestW) { bestW = w; bestTime = action.time; }
        }
        return bestTime;
    }

    /** 把本地时间恢复到当前活动 idle action 上（按各自 clip 时长取模，避免超长 seek） */
    _restoreActiveIdleTime(t) {
        if (this.curIdleAction) {
            const d = this.curIdleAction.getClip().duration;
            if (d > 0) this.curIdleAction.time = ((t % d) + d) % d;
            return;
        }
        for (const action of Object.values(this.ageIdleActions)) {
            const d = action.getClip().duration;
            if (d > 0) action.time = ((t % d) + d) % d;
        }
    }

    /** 切换雌性形态键开关 */
    setFemaleMorph(enabled) {
        if (this.femaleMorphEnabled === enabled) return;
        this.femaleMorphEnabled = enabled;
        // 重新计算 morph（female 权重随 toggle 变）
        const morphWeights = this.calcMorphWeights(this.ageStage);
        if (typeof morphWeights.female === 'number') {
            morphWeights.female = this.femaleMorphEnabled ? morphWeights.female : 0;
        }
        this.applyMorphWeights(morphWeights, this.currentDinoName);
    }

    /**
     * 将 morph 权重应用到所有 mesh（使用自动检测的名称映射）
     */
    applyMorphWeights(weights, dinoName) {
        if (this.morphMeshes.length === 0) return;
        const keyToName = this._morphKeyToName;
        for (const mesh of this.morphMeshes) {
            const dict = mesh.morphTargetDictionary;
            const inf = mesh.morphTargetInfluences;
            if (!dict || !inf) continue;
            for (const [key, weight] of Object.entries(weights)) {
                const targetName = keyToName[key];
                if (!targetName) continue;
                const idx = dict[targetName];
                if (idx !== undefined && idx < inf.length) {
                    inf[idx] = weight;
                }
            }
        }
    }

    // ==================== 动画 Clip 系统 ====================

    /** 把 GLB 中各种大小写/缩写的年龄名统一成标准名 */
    _normalizeAgeName(name) {
        const n = (name || '').toLowerCase();
        if (n === 'subadult' || n === 'sub') return 'SubAdult';
        if (n === 'juvenile' || n === 'juv') return 'Juvenile';
        if (n === 'hatchling' || n === 'hatch') return 'Hatchling';
        if (n === 'adult' || n === 'ad') return 'Adult';
        if (n === 'elder' || n === 'old') return 'Elder';
        return name;
    }

    /** 解析 GLB 中的动画 clip，按年龄段和动作分组 */
    parseAnimClips(gltf, dinoName) {
        this.animClips = {};
        this.ageIdleClips = {};
        this.ageVocalClips = {};
        this.availableAges = [];

        const vocalActions = ['Vocal_Broadcast', 'Vocal_Attract', 'Vocal_Threaten', 'Vocal_Danger', 'Vocal_Generic'];
        const vocalKeyMap = { Broadcast: 'Vocal_Broadcast', Attract: 'Vocal_Attract', Threaten: 'Vocal_Threaten', Danger: 'Vocal_Danger', Generic: 'Vocal_Generic' };

        for (const clip of gltf.animations) {
            this.animClips[clip.name] = clip;
            const parts = clip.name.split('_');
            if (parts.length < 3) continue;

            // 方式1：按恐龙名匹配 → "A_Stegosaurus_Adult_Idle" / "F A_Stegosaurus_Adult_Idle"
            let dinoIdx = parts.findIndex(p => p === dinoName);
            let age, action;

            if (dinoIdx >= 0) {
                age = parts[dinoIdx + 1];
                action = parts.slice(dinoIdx + 2).join('_');
            } else {
                // 方式2：通用 fallback — 按 "Idle" / "Vocal_*" 模式识别
                const idleIdx = parts.findIndex(p => p === 'Idle');
                const vocalIdx = parts.findIndex(p => vocalKeyMap[p] !== undefined);
                if (idleIdx >= 1) {
                    age = parts[idleIdx - 1]; action = 'Idle';
                } else if (vocalIdx >= 1) {
                    age = parts[vocalIdx - 1];
                    action = parts.slice(vocalIdx).join('_');
                } else {
                    continue;
                }
            }

            if (!age) continue;
            age = this._normalizeAgeName(age);

            if (!this.availableAges.includes(age)) this.availableAges.push(age);

            if (action === 'Idle' || action.startsWith('Idle')) {
                this.ageIdleClips[age] = clip.name;
            } else if (vocalActions.some(va => action.startsWith(va))) {
                if (!this.ageVocalClips[age]) this.ageVocalClips[age] = {};
                const vocalKey = vocalActions.find(va => action.startsWith(va));
                if (vocalKey) this.ageVocalClips[age][vocalKey] = clip.name;
            }
        }
    }

    /** 根据 morphTimeline 计算每个有 idle clip 的年龄段对应的滑块位置 */
    _getAgeStages() {
        const order = ['Hatchling', 'Juvenile', 'SubAdult', 'Adult', 'Elder'];
        const positions = { Adult: 75 };
        const tl = this.morphTimeline || {};
        const morphToAge = { hatchling: 'Hatchling', juvenile: 'Juvenile', subadult: 'SubAdult', elder: 'Elder' };
        for (const [key, ageName] of Object.entries(morphToAge)) {
            const frames = tl[key];
            if (!frames) continue;
            let bestPos = null, bestW = -Infinity;
            for (const [p, w] of Object.entries(frames)) {
                const pos = parseFloat(p);
                if (w > bestW) { bestW = w; bestPos = pos; }
            }
            if (bestPos !== null) positions[ageName] = bestPos;
        }
        return order
            .filter(age => this.ageIdleClips[age] && positions[age] !== undefined)
            .map(age => ({ age, pos: positions[age], clipName: this.ageIdleClips[age] }));
    }

    /** 根据 ageStage 播放 idle 动画。
     *  有形态键的恐龙：为每个年龄段创建并持续播放 idle action，按「阶段三角权重」设置
     *  各 action 的 effectiveWeight。这样 25% 干净播 Juvenile、50% 干净播 SubAdult、
     *  75% 干净播 Adult；相邻阶段间（如 37.5%）才做线性 crossfade，且任意位置权重之和
     *  恒为 1、只有相邻两段同时非零——既不会出现权重 >1 的叠加鬼畜，也不会在边界 stop
     *  旧 action 造成 T-pose。
     *  无形态键或只有单一年龄段 idle 的恐龙回退到直接播放可用 clip。 */
    playIdleForAge(sliderPos) {
        if (!this.currentMixer) { return; }

        const stages = this._getAgeStages();

        // 没有任何年龄段 idle → 尝试播放任意 idle
        if (stages.length === 0) {
            const fallback = Object.values(this.ageIdleClips)[0];
            if (fallback) this.playIdleClip(fallback);
            return;
        }

        // 只有一个年龄段 idle → 直接播放
        if (stages.length === 1) {
            this.playIdleClip(stages[0].clipName);
            return;
        }

        // 多年龄段恐龙：持续混合所有年龄段 idle（按阶段三角权重），避免边界切换 T-pose
        // 停掉旧式单一/crossfade action 路径
        if (this.curIdleAction) { this.curIdleAction.stop(); this.curIdleAction = null; }
        if (this.curJuvIdleAction) { this.curJuvIdleAction.stop(); this.curJuvIdleAction = null; }
        if (this.curAdultIdleAction) { this.curAdultIdleAction.stop(); this.curAdultIdleAction = null; }
        this.idleWeightCurr = { juv: 0, ad: 0 };
        this.idleWeightTarget = { juv: 0, ad: 0 };

        // 确保每个年龄段都有正在播放的 action（权重初始 0）
        for (const s of stages) {
            if (!this.ageIdleActions[s.age]) {
                const clip = this.animClips[s.clipName];
                if (!clip) continue;
                const action = this.currentMixer.clipAction(clip);
                action.setLoop(THREE.LoopRepeat);
                action.setEffectiveWeight(0);
                action.play();
                this.ageIdleActions[s.age] = action;
            }
        }

        // 按「阶段三角权重」分配各年龄段 idle 权重：
        // 每个阶段在自身中心位置权重为 1，相邻阶段之间线性过渡，任意位置权重之和恒为 1，
        // 且只有相邻的两个阶段会同时非零（不会像 morph 权重那样出现 >1 的叠加导致鬼畜姿态）。
        stages.sort((a, b) => a.pos - b.pos);
        const w = new Array(stages.length).fill(0);
        const lo = stages[0].pos;
        const hi = stages[stages.length - 1].pos;
        const p = Math.max(lo, Math.min(hi, sliderPos));
        if (p <= lo) {
            w[0] = 1;
        } else if (p >= hi) {
            w[stages.length - 1] = 1;
        } else {
            for (let i = 0; i < stages.length - 1; i++) {
                const p0 = stages[i].pos, p1 = stages[i + 1].pos;
                if (p >= p0 && p <= p1) {
                    const t = (p1 - p0) > 0 ? (p - p0) / (p1 - p0) : 0;
                    w[i] = 1 - t;
                    w[i + 1] = t;
                    break;
                }
            }
        }
        for (let i = 0; i < stages.length; i++) {
            const action = this.ageIdleActions[stages[i].age];
            if (action) action.setEffectiveWeight(w[i]);
        }

        this._refreshAdditiveLayer();
    }

    /** 在两个 idle clip 之间按权重 crossFade（只设目标，由 animate() lerp 平滑逼近） */
    crossfadeIdleClips(juvClipName, adClipName, juvTarget, adTarget) {
        if (!this.currentMixer) return;
        const juvClip = this.animClips[juvClipName];
        const adClip  = this.animClips[adClipName];
        if (!juvClip || !adClip) return;

        const mixer = this.currentMixer;

        // --- Juvenile side ---
        const juvNew = !this.curJuvIdleAction || this.curJuvIdleAction.getClip() !== juvClip;
        if (juvNew) {
            if (this.curJuvIdleAction) this.curJuvIdleAction.stop();
            this.curJuvIdleAction = mixer.clipAction(juvClip);
            this.curJuvIdleAction.setLoop(THREE.LoopRepeat);
            // 从 0 权重开始，由 _lerpIdleWeights 平滑拉起到目标值
            this.curJuvIdleAction.setEffectiveWeight(0);
            this.curJuvIdleAction.play();
            this.idleWeightCurr.juv = 0;
        }

        // --- Adult side ---
        const adNew = !this.curAdultIdleAction || this.curAdultIdleAction.getClip() !== adClip;
        if (adNew) {
            if (this.curAdultIdleAction) this.curAdultIdleAction.stop();
            this.curAdultIdleAction = mixer.clipAction(adClip);
            this.curAdultIdleAction.setLoop(THREE.LoopRepeat);
            this.curAdultIdleAction.setEffectiveWeight(0);
            this.curAdultIdleAction.play();
            this.idleWeightCurr.ad = 0;
        }

        // 停掉旧的单一 idle action（如果存在）
        if (this.curIdleAction) {
            this.curIdleAction.stop();
            this.curIdleAction = null;
        }

        // 只存目标权重，实际 lerp 由 animate() 驱动
        this.idleWeightTarget.juv = juvTarget;
        this.idleWeightTarget.ad  = adTarget;
    }

    /** 播放单个 idle clip（用于只有单一年龄段的恐龙），直接以权重 1 启动，避免 fadeIn 在某些 clip 下失效导致 T-Pose */
    playIdleClip(clipName) {
        if (!this.currentMixer) { return; }
        const clip = this.animClips[clipName];
        if (!clip) { return; }
        // 停掉 crossfade 双 action
        if (this.curJuvIdleAction) { this.curJuvIdleAction.stop(); this.curJuvIdleAction = null; }
        if (this.curAdultIdleAction) { this.curAdultIdleAction.stop(); this.curAdultIdleAction = null; }
        this.idleWeightCurr.juv = 0; this.idleWeightCurr.ad = 0;
        this.idleWeightTarget.juv = 0; this.idleWeightTarget.ad = 0;
        // 停掉旧 action（fadeOut 过渡）
        if (this.curIdleAction && this.curIdleAction.getClip() !== clip) {
            this.curIdleAction.fadeOut(0.3);
        }
        const isNew = !this.curIdleAction || this.curIdleAction.getClip() !== clip;
        if (isNew) {
            this.curIdleAction = this.currentMixer.clipAction(clip);
        }
        this.curIdleAction.setLoop(THREE.LoopRepeat);
        this.curIdleAction.reset();
        this.curIdleAction.setEffectiveTimeScale(1);
        // 直接以权重 1 播放，避免 fadeIn 在某些 clip/Three 版本下导致始终为 0（T-Pose）
        this.curIdleAction.setEffectiveWeight(1);
        this.curIdleAction.play();
        // 机制B：idle 就绪后建立/刷新 additive 叠加层
        this._refreshAdditiveLayer();
    }

    // ==================== 机制B：Additive 叠加层 ====================

    /**
     * 根据 rig 描述符建立/刷新 additive 叠加层。
     * 机制B 恐龙只有 Adult idle + Juvenile morph，靠 Juvenile_Additive 之类的 additive 动画
     * 按 morph 权重叠到 Adult 姿态上，修正幼年嘴部/比例（否则地包天/天包地）。
     *
     * - additive 动画在 glb 里是绝对姿态，单独播会扭曲模型；
     *   用 THREE.AnimationUtils.makeClipAdditive(clip, 0, baseClip, 0) 转成相对 baseClip 首帧的差值，
     *   再以 AdditiveAnimationBlendMode + 权重(=juvenile morph 值) 叠加。
     * - rig.additive.rawAdditive=true 时跳过转换，直接把 clip 当 delta 使用（适用于已是差值的导出）。
     */
    _refreshAdditiveLayer() {
        const add = this.rig && this.rig.additive;
        if (!add || !this.currentMixer) { this._stopAdditive(); this.additiveWeightTarget = 0; return; }

        // crossfade 模式：Juvenile_Additive 当作完整幼年 idle，由 playIdleForAge 直接混合，这里不处理
        if (add.blendMode === 'crossfade') {
            this._stopAdditive();
            this.additiveWeightTarget = 0;
            return;
        }

        // 决定基础 idle clip（用于把 additive 转成相对差值）
        const adultAction = this.ageIdleActions['Adult'];
        const baseClip = this.animClips[add.baseIdle]
            || (this.curIdleAction && this.curIdleAction.getClip())
            || (this.curAdultIdleAction && this.curAdultIdleAction.getClip())
            || (adultAction && adultAction.getClip())
            || null;
        if (!baseClip) { this._stopAdditive(); this.additiveWeightTarget = 0; return; }

        // 首次建立 action（每个 additive clip 一个），之后只更新目标权重
        if (this.additiveActions.length === 0) {
            for (const name of (add.additiveClips || [])) {
                const srcClip = this.animClips[name];
                if (!srcClip) { continue; }

                // makeClipAdditive 返回新 clip，不能丢弃返回值！
                // fps 不能传 0，否则 referenceFrame/fps = 0/0 = NaN，会导致整只龙在 weight=0 时就因
                // NaN * 0 = NaN 污染骨骼矩阵而消失。
                let additiveClip = srcClip;
                if (!add.rawAdditive) {
                    additiveClip = THREE.AnimationUtils.makeClipAdditive(srcClip, 0, baseClip, 30);
                    if (additiveClip && additiveClip !== srcClip) {
                        additiveClip.name = srcClip.name + '::additive';
                    }
                }

                const action = this.currentMixer.clipAction(additiveClip);
                action.blendMode = THREE.AdditiveAnimationBlendMode;
                // 修正姿态一般是静态单帧，停在第 0 帧避免循环漂移
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
                action.setEffectiveWeight(0);
                action.play();
                action.time = 0;
                action.paused = true;
                this.additiveActions.push(action);
            }
        }

        // 目标权重 = juvenile morph 当前值（0~1）；成年为 0，幼年为 1，中间平滑过渡
        const w = (this.calcMorphWeights(this.ageStage).juvenile) || 0;
        this.additiveWeightTarget = w;
    }

    /** 停止并清空 additive 叠加层 */
    _stopAdditive() {
        if (this.currentMixer) {
            for (const a of this.additiveActions) { try { a.stop(); } catch (e) {} }
        }
        this.additiveActions = [];
    }

    /** 每帧 lerp additive 叠加权重（约 0.3 秒过渡），与 idle 权重同步 */
    _lerpAdditiveWeights(delta) {
        if (this.additiveActions.length === 0) return;
        const factor = 1 - Math.exp(-delta * 12);
        this.additiveWeightCurr += (this.additiveWeightTarget - this.additiveWeightCurr) * factor;
        if (Math.abs(this.additiveWeightTarget - this.additiveWeightCurr) < 0.001) this.additiveWeightCurr = this.additiveWeightTarget;
        const w = this.additiveWeightCurr;
        for (const a of this.additiveActions) {
            a.setEffectiveWeight(w);
            a.setEffectiveTimeScale(w > 0.01 ? 1 : 0);
        }
    }

    /** 播放叫声 (1=Broadcast, 2=Attract, 3=Threaten, 4=Danger, F=Generic)
     *  简单直接：停掉 idle → 播 vocal → vocal 结束后重启 idle */
    playVocal(keyCode) {
        if (!this.currentMixer || this.vocalPlaying) return;
        const keyMap = {
            'Digit1': 'Vocal_Broadcast',
            'Digit2': 'Vocal_Attract',
            'Digit3': 'Vocal_Threaten',
            'Digit4': 'Vocal_Danger',
            'KeyF':  'Vocal_Generic',
        };
        const vocalKey = keyMap[keyCode];
        if (!vocalKey) return;

        let age = this.ageStage <= 40 ? 'Juvenile' : 'Adult';
        let ageVocals = this.ageVocalClips[age];
        if (!ageVocals || !ageVocals[vocalKey]) {
            for (const a of Object.keys(this.ageVocalClips)) {
                if (this.ageVocalClips[a][vocalKey]) { age = a; ageVocals = this.ageVocalClips[a]; break; }
            }
        }
        if (!ageVocals) {
            return;
        }
        const clipName = ageVocals[vocalKey];
        if (!clipName || !this.animClips[clipName]) {
            return;
        }

        const clip = this.animClips[clipName];
        const action = this.currentMixer.clipAction(clip);
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.setEffectiveTimeScale(this.vocalTimeScale);
        action.setEffectiveWeight(1);

        // 停掉所有 idle action（包括持续混合的 ageIdleActions）
        if (this.curJuvIdleAction) { this.curJuvIdleAction.stop(); this.curJuvIdleAction = null; }
        if (this.curAdultIdleAction) { this.curAdultIdleAction.stop(); this.curAdultIdleAction = null; }
        if (this.curIdleAction) { this.curIdleAction.stop(); this.curIdleAction = null; }
        for (const a of Object.values(this.ageIdleActions)) { try { a.stop(); } catch (e) {} }
        this.ageIdleActions = {};

        this.vocalPlaying = true;
        this.curVocalAction = action;
        action.play();

        const mixer = this.currentMixer;
        const self = this;
        const onFinished = (e) => {
            if (e.action !== action) return;
            mixer.removeEventListener('finished', onFinished);
            // vocal 结束 → 停掉 vocal → 重启 idle
            action.stop();
            self.vocalPlaying = false;
            self.curVocalAction = null;
            self.playIdleForAge(self.ageStage);
        };
        mixer.addEventListener('finished', onFinished);
    }

    /** 检查当前恐龙是否有形态键数据 */
    hasMorphData() {
        return this.morphTimeline !== null && this.morphMeshes.length > 0;
    }

    /**
     * 是否检测到"年龄段"形态键（hatchling / juvenile / subadult / elder）。
     * 不含 female（性别形态键，由性别切换控制，不属于年龄段 UI）。
     * 非可玩物种（如美颌龙/翼手龙）通常这里为 false → 隐藏年龄段 UI、直接用 Adult_Idle。
     */
    hasAgeStageMorph() {
        const k = this._morphKeyToName;
        return !!(k && (k.hatchling || k.juvenile || k.subadult || k.elder));
    }

    /** 返回检测到的形态键映射，供 UI 动态更新标签 */
    getDetectedMorphKeys() {
        return this._morphKeyToName;
    }

    /** 检查当前恐龙是否有动画数据（idle / vocal） */
    hasAnimData() {
        return Object.keys(this.ageIdleClips).length > 0 || Object.keys(this.ageVocalClips).length > 0;
    }

    /** 获取可用年龄段列表（用于 UI） */
    getAvailableAges() {
        return [...this.availableAges];
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

    /** 自适应像素比：相机越靠近模型（模型铺满视口），每像素的 PBR + 环境反射 + RAC 渗线着色开销越大，
     *  此时临时降低渲染分辨率可显著减少填充率压力，消除贴近看细节时的卡顿；拉远后自动恢复满质量。
     *  仅当目标分辨率变化超过阈值才调用 setPixelRatio（避免每帧重建绘图缓冲）。 */
    _applyAdaptivePixelRatio() {
        if (!this.controls || !this.camera || !this.renderer) return;
        const base = this._qualityPixelRatio || Math.min(window.devicePixelRatio, 1.5);
        const dist = this.camera.position.distanceTo(this.controls.target);
        let desired = base;
        const FAR = 2.2, NEAR = 1.4; // 距离 <= NEAR 降到最低，>= FAR 用满质量
        if (dist < FAR) {
            const t = Math.max(0, (dist - NEAR) / (FAR - NEAR)); // 0=极近, 1=远
            // 下限锁在 1.0（CSS 像素分辨率）：既缓解填充率卡顿，又绝不降到 1.0 以下导致浏览器放大的糊感
            const minR = Math.max(1.0, base * 0.6);
            desired = minR + (base - minR) * t;
        }
        const cur = this._adaptivePixelRatio ?? base;
        if (Math.abs(desired - cur) > 0.12) {
            this._adaptivePixelRatio = desired;
            this.renderer.setPixelRatio(desired);
        }
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