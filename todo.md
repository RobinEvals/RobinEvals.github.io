# SkinPreviewer v0.5.7 — 待办事项

> 最后更新: 2026-08-03
> 合并自两个开发会话的讨论与任务清单

---

## 一、RAC 贴图"湿润模式"（核心功能）

将现有"模型平滑"按钮改造为"湿润"模式，使用 RAC 贴图红通道作为 roughnessMap。

### 任务拆解（按依赖顺序）

- [ ] **1.1 建立 RAC 文件名映射表**
  - 确认每个恐龙对应的 RAC 贴图文件名
  - 现有 RAC 文件在 `Assets/fmodel_output_rac/` 目录（约 30 个文件）
  - 注意命名差异：`T_Austroraptor_RAC.png` vs `T_Avaceratops_Mask_RAC.png`
  - 产出：恐龙名 → RAC 文件路径的映射对象

- [ ] **1.2 设计 RAC 贴图加载与缓存机制**（依赖 1.1）
  - 在 `loadModel()` 流程中并行加载 RAC 贴图
  - 缓存已加载的 Texture，避免重复请求
  - 加载失败时静默降级（不影响主流程）

- [ ] **1.3 实现 RAC R 通道提取**（依赖 1.2）
  - Three.js `roughnessMap` 默认采样 G 通道，需做通道提取
  - 方案：用 Canvas 2D 读取 R 通道 → 生成灰度 DataTexture 作为 roughnessMap
  - 或用 `DataTexture` + 手动采样 R 通道

- [ ] **1.4 改造 applySmoothRendering() 为湿润模式**
  - 当前位置：`skin-three-preview.js` 第 473 行
  - 开启时：`material.roughnessMap = racTexture`，`material.roughness = 1.0`
  - 关闭时：`material.roughnessMap = null`，恢复默认 roughness
  - 按钮文案：`平滑:开/关` → `湿润:开/关`

- [ ] **1.5 在 loadModel 中接入 RAC 加载流程**（依赖 1.3, 1.4）
  - 模型加载完成后异步加载 RAC
  - RAC 就绪后若湿润模式已开启，自动应用

- [ ] **1.6 处理缺失 RAC 的恐龙**（依赖 1.5）
  - 部分恐龙可能没有 RAC 贴图
  - 回退到统一默认 roughness（如 0.6）
  - UI 上给用户适当提示（如按钮置灰或提示文字）

- [ ] **1.7 更新 UI 文案**（依赖 1.5）
  - HTML: `smoothToggleBtn` 相关文案
  - JS: `smoothBtn.textContent` 文案
  - `LIGHTING_TITLES.smooth` 可保留"柔光"（这是光照模式，不是平滑）

- [ ] **1.8 湿润状态保存与预设兼容**（依赖 1.5, 1.7）
  - `getPreviewState()` / `applyPreviewState()` 中 `smooth` 字段保留
  - 考虑预设文件向后兼容（旧预设的 `smooth: true` 语义不变）

- [ ] **1.9 视觉验证与微调**（依赖 1.6, 1.7, 1.8）
  - 逐恐龙对比游戏内湿润效果
  - 调整 roughness 值范围（可能需要 0.3~1.0 而非全 1.0）
  - 验证 NormaMap 与 roughnessMap 叠加效果

---

## 二、三角龙 Special 区域

游戏更新后，Triceratops 新增了 special 区域配色。

- [ ] **2.1 更新 Triceratops hasSpecial**
  - 文件：`js/skin-dino-data.js` 第 3 行
  - `hasSpecial: false` → `hasSpecial: true`

- [ ] **2.2 验证 Mask 贴图**
  - 确认 Triceratops 的 `Mask.png` 是否已包含 special 区域通道
  - 若 Mask 未更新，需从游戏解包中提取新的 Mask 贴图

- [ ] **2.3 验证 special 默认配色**
  - 当前 `special: '000000'`（纯黑）
  - 确认游戏内默认值是否变化，必要时更新

---

## 三、新增 Pattern 资源整合

新解包的 pattern 资源在 `D:\002Documents\001_Htmls\Patterns\`（147 个文件）。
需对比 v0.5.7 现有资源，补充缺失的 pattern。

### 3.1 新增恐龙

- [ ] **添加 Pterodactylus（翼手龙）**
  - 当前 `DINOSAUR_DATA` 中无此条目
  - 已有资源：`Assets/TMC mask/ptero/` 下的贴图（Pattern_Adult, Mask_RAC, N, Teeth-Mouth-Claws）
  - 需添加：DINOSAUR_DATA 条目、Assets/Dino/Pterodactylus/ 目录、模型 .glb

### 3.2 现有恐龙新增 Pattern

以下恐龙需要添加新的 pattern 选项（已对比 Patterns 文件夹 vs v0.5.7 数据）：

- [ ] **Baryonyx（重爪龙）** — 添加 `4`（Royal）, `5`（Brindle）
- [ ] **Carnotaurus（牛龙）** — 添加 `3`, `4`
- [ ] **Stegosaurus（剑龙）** — 添加 `White-Tipped`, `3`
- [ ] **Deinosuchus（恐鳄）** — 添加 `3`
- [ ] **Pteranodon（无齿翼龙）** — 添加 `3`
- [ ] **Austroraptor（南方盗龙）** — 添加 `3`, `Heron`
- [ ] **Beipiaosaurus（北票龙）** — 添加 `3`
- [ ] **Hypsilophodon（棱齿龙）** — 添加 `2`, `3`（注意 Male 后缀）
- [ ] **Dilophosaurus（双脊龙）** — 添加 `2`, `3`
- [ ] **Dryosaurus（橡树龙）** — 添加 `3`
- [ ] **Ceratosaurus（角鼻龙）** — 添加 `3`
- [ ] **Kentrosaurus（肯氏龙）** — 添加 `3`
- [ ] **Tenontosaurus（腱龙）** — 添加 `3`
- [ ] **Maiasaura（慈母龙）** — 添加 `3`
- [ ] **Omniraptor（全能盗龙）** — 添加 `Desert`（`4` 和 `Python` 已存在）
- [ ] **Troodon（伤齿龙）** — 添加 `2`, `3`
- [ ] **Diabloceratops（恶魔角龙）** — 添加 `3`
- [ ] **Parasaurolophus（副栉龙）** — 添加 `M`（当前仅有 `A`）
- [ ] **Compsognathus（美颌龙）** — 添加 `M`
- [ ] **Camarasaurus（圆顶龙）** — 确认 pattern 命名映射（新资源用 `Adult_Pattern_1` 而非 `A`）

### 3.3 Pattern 文件整理

- [ ] **复制新 pattern 贴图到 v0.5.7 Assets 目录**
  - 按现有目录结构存放（`Assets/Dino/<DinoName>/`）
  - 统一命名格式（去除 `T_` 前缀，对齐现有 `<DinoName>_Pattern_X.png` 格式）
- [ ] **更新 skin-dino-data.js 的 patterns 数组**
  - 每个恐龙的 `patterns: [...]` 数组添加新 pattern 名
- [ ] **验证 pattern 切换功能**
  - 确保新 pattern 能正确加载和显示
  - 检查 Mask 通道映射是否正确

---

## 四、默认配色方案系统重构

合并三个相关需求：per-dinosaur 方案归属、per-pattern 默认配色、官方配色选择器。
其他配色相关功能依赖此重构，优先级高。

### 4.1 skin-dino-data 方案归属重构

当前默认配色方案全局共享，但新皮肤可能不适用于其他恐龙的方案（如皮肤 ABC 有甲乙丙，皮肤 D 只有丁）。

- [ ] **4.1.1 方案归属改为 per-dinosaur**
  - 每只恐龙自带 `schemes` 数组，结构：`{ name, colors: {...}, thumb? }`
  - 皮肤码格式不动（只编码颜色，不绑定恐龙）
  - UI 层按当前恐龙过滤显示 schemes
- [ ] **4.1.2 迁移现有全局方案到各恐龙**
  - 直接复制到各自 `schemes`（恐龙数量不大，冗余可接受）
  - 或用 `schemeGroups` 索引引用（省空间但需维护引用）
- [ ] **4.1.3 方案选择器按恐龙过滤**
  - 切换恐龙时只显示该恐龙适用的 schemes

### 4.2 Pattern 默认配色

不同 pattern 可能有不同的默认配色，而非统一使用第一方案。

- [ ] **4.2.1 设计 patternColors 覆盖表**
  - 结构：`{ 'DinoName': { 'patternId': { body: 'XXXXXX', ... } } }`
  - 在 `skin-dino-data.js` 或新文件中维护
  - 可并入 4.1.1 的 schemes 结构（按 pattern 再细分）
- [ ] **4.2.2 从游戏导出默认配色**
  - 在游戏内逐个切换 pattern，导出皮肤码
  - 用 `parseSkinCode()` 解析，记录每个 pattern 的默认颜色
- [ ] **4.2.3 实现 pattern 切换时自动应用默认配色**
  - 切换 pattern 时检查覆盖表，有则应用，无则用恐龙默认配色
- [ ] **4.2.4 添加"重置为 pattern 默认配色"按钮**
  - 手动触发当前 pattern 的默认配色

### 4.3 官方默认配色选择器（带图片）

- [ ] **4.3.1 准备选色缩略图**
  - 每个方案一张缩略图（`thumb` 字段）
  - 待确认图片来源：游戏截图 or 官方资源包
- [ ] **4.3.2 重构方案选择器为图片网格**
  - 替代当前文字列表
  - 点击图片应用该方案
- [ ] **4.3.3 缩略图懒加载与缓存**
  - 避免一次性加载过多图片

---

## 五、形态键：雌雄二态

用户已攻破形态键（morph targets），可实现雌雄区别。
GLB 内含 morph targets，通过 `mesh.morphTargetDictionary` / `morphTargetInfluences` 设权重。

- [ ] **5.1 确认 morph target 命名约定**
  - 检查 GLB 中 morph target 的 key 名（如 `female`/`male`）
  - 若命名不统一，建立恐龙 → morph key 映射表
- [ ] **5.2 实现雌雄 morph 权重切换**
  - 复用现有 `isFemale` 开关
  - 切换时设置对应 morph target influence
- [ ] **5.3 处理无雌雄二态的恐龙**
  - 无 morph target 的恐龙隐藏/禁用性别开关
- [ ] **5.4 雌雄状态保存与恢复**
  - `isFemale` 已在偏好持久化中，确认 morph 权重同步恢复
- [ ] **5.5 视觉验证**
  - 逐恐龙对比游戏内雌雄差异

---

## 六、形态键：年龄段 + 动画混合（最复杂）

四档年龄：幼年 / 亚成年 / 成年（默认）/ 长老。
每档对应一组 morph 权重预设；部分恐龙因体型差异过大，游戏为不同年龄做了不同 idle clip。

### 6.1 形态层

- [ ] **6.1.1 确认各恐龙年龄 morph target 命名**
  - 检查 GLB 中是否有 `juvenile`/`subadult`/`elder` 等 morph key
  - 建立恐龙 → 年龄 morph 权重预设表
- [ ] **6.1.2 实现年龄切换 UI**
  - 四选一控件（幼年/亚成年/成年/长老）
  - 成年为默认（morph influence 全 0）
- [ ] **6.1.3 切换年龄时设置 morph 权重**
  - 平滑过渡（lerp morph influences）

### 6.2 动画层

- [ ] **6.2.1 确认 GLB 动画 clip 组织方式**（⚠️ 阻塞项）
  - 单 GLB 多 clip vs 每年龄一个 GLB？
  - 列出哪些恐龙有年龄专用 idle clip
- [ ] **6.2.2 实现年龄 idle clip 切换**
  - 用 `AnimationAction.crossFadeTo(newAction, duration, false)` 交叉淡入淡出
  - 无年龄专用 clip 的恐龙共用同一套 idle
- [ ] **6.2.3 恐龙数据标记 `ageClips: true/false`**
  - 有则启用年龄动画切换，无则只切 morph

### 6.3 集成与验证

- [ ] **6.3.1 年龄状态保存与恢复**
  - 偏好持久化加入年龄档位
- [ ] **6.3.2 逐恐龙验证形态 + 动画**
  - 重点验证有年龄差异 clip 的恐龙
  - 检查幼年形态套成年动画是否穿模

---

## 七、皮肤码功能增强

### 7.1 Nyor's overlay 导出导入 ✅ 已完成

- [x] **7.1.1 确认 overlay 码格式** ✅
  - JSON 格式：`{v, c[10], p, var, g}`，线性 0-1 浮点颜色，色块顺序与 CNRE 一致
  - detail = special，var=1.0→fine, 0.5→medium, 0.0→coarse
- [x] **7.1.2 实现导出** ✅
  - `encodeNyorOverlay()` — sRGB hex → 线性浮点，输出 JSON 字符串
  - 文件：`js/skin-nyor-overlay.js`
- [x] **7.1.3 实现导入** ✅
  - `decodeNyorOverlay()` — 线性浮点 → sRGB hex，自动检测 JSON 格式
  - UI 集成：导入框自动识别 Nyor JSON，码显示区新增 Nyor Overlay 码 + 复制按钮
  - 5 个用户样本测试通过，round-trip 验证通过

### 7.2 CNRE 码导入自动线性→RGB

- [ ] **7.2.1 导入解析后做颜色空间转换**
  - CNRE 若为线性空间存储，导入到编辑器（sRGB 显示）做 `convertLinearToSRGB`
  - 注意方向：`THREE.Color.convertLinearToSRGB`
- [ ] **7.2.2 验证转换正确性**
  - 对比游戏内 CNRE 码颜色与导入后显示

---

## 八、UI 工具增强

### 8.1 吸管取色

- [ ] **8.1.1 接入 EyeDropper API**
  - Chrome/Edge 原生支持：`const { sRGBHex } = await new EyeDropper().open()`
  - 在颜色选择器旁加吸管按钮
- [ ] **8.1.2 浏览器兼容降级**
  - Firefox/Safari 不支持 EyeDropper API
  - 降级方案：隐藏吸管按钮 or 提示用户换浏览器
  - 待确认：是否需要降级处理

### 8.2 清空本地数据/偏好

- [ ] **8.2.1 添加清空按钮**
  - `localStorage.removeItem('isle_prefs_v1')` + 其他缓存 key
  - 清空后 `location.reload()` 立即生效
- [ ] **8.2.2 确认清空范围**
  - 用户偏好（恐龙选择、光照、背景等）
  - 是否清空历史调色板、自定义背景图等

---

## 九、已完成的优化（v0.5.6 → v0.5.7）

以下已完成，记录备查：

- [x] CNRE 线性码字号统一
- [x] 双色渐变 HEX 输入框样式统一
- [x] 高级调色板标签与数值放大
- [x] 渲染面板颜色选择器填满方形（`compact-color-input`）
- [x] 可配置网格背景叠加层（颜色/间距/粗细）
- [x] 网格 HEX 同步修复
- [x] 网格 UI 移至透视与光照之间
- [x] 深色/浅色背景默认启用网格
- [x] 深色背景底色改为纯黑 `#000000`
- [x] 网格默认粗细 2px
- [x] 标准光照 → 暗色光照
- [x] 中键改为平移（PAN）
- [x] 右键恢复默认平移（PAN）

---

## 建议优先级

按依赖关系排序（可并行项标注）：

1. **四** 默认配色方案系统重构（其他配色功能依赖它）
2. **八** UI 工具增强（吸管 + 清空，小活，可并行）
3. **七** 皮肤码功能增强（CNRE + overlay，独立，可并行）
4. **一** RAC 湿润模式（材质增强，独立）
5. **三** Pattern 资源整合（体力活，可并行）
6. **二** 三角龙 special（小活，可并行）
7. **五** 雌雄二态形态键（依赖 morph 数据确认）
8. **六** 年龄段形态键 + 动画混合（最重，最后做，阻塞项 6.2.1）

---

## 待确认的开放问题

- RAC 文件格式（PNG/JPG/TGA？）
- GLB 里动画 clip 怎么组织（单文件多 clip vs 多文件）— **阻塞 6.2**
- 哪些恐龙有年龄专用 idle clip
- Eyedropper 浏览器兼容性是否需要降级
- 官方配色选色图片来源（截图 or 官方资源包）
- ~~Nyor's overlay 码格式说明~~ ✅ 已确认并实现
- morph target 命名约定是否统一

---

## 备注

- **项目路径**：`D:\002Documents\001_Htmls\SkinPreviewer\v0.5.7\`
- **新 Pattern 资源路径**：`D:\002Documents\001_Htmls\Patterns\`
- **纯前端项目**：无构建工具，ES Module + Three.js 0.160.0（CDN importmap）
- **贴图合成**：Mask.png（RGB 通道划分区域）+ Normal.png + Pattern_*.png
- **9 颜色部位** + 眼球色，当前 27 种恐龙
- **动画管线**：PSK 解包 + PSA idle 导入 → 导出 GLB（骨骼蒙皮 + 动画 clip），即骨骼动画
- **形态键**：已攻破，GLB 内含 morph targets，可实现幼年/雌雄二态
