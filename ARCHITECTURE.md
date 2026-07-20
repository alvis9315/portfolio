# Scroll Flight — 架構與模組說明

一個 scroll 驅動的 3D 鏡頭飛行系統。核心只有一條公式：

```
scroll 位置 → t (0~1) → camera 的 { position, lookAt } → render
```

所有模組都是圍繞這條公式的分工。UI 元件與 3D 舞台互不相識，只共享同一個 `progress`。

## 目錄結構

```
src/
├── journey/
│   ├── timeline.js             # shot / scene / caption / UI progress 區間唯一來源
│   └── flight.js               # 六幕正式鏡頭座標與 shot 編排
├── flight/                     # 特效核心（可獨立抽成 package 或 skill reference）
│   ├── useScrollFlight.js      # 驅動層：scroll → damped progress (Vue composable)
│   ├── easing.js               # 鏡頭變速曲線
│   ├── shots.js                # Shot 層：五種運鏡 primitive
│   ├── composeShots.js         # 編排層：串接 shots + seam 檢查
│   ├── FlightStage.vue         # 舞台元件：renderer / camera / 燈光 / lazy 場景
│   ├── FlightCaption.vue       # UI 整合示範元件：綁定 progress 區間
│   └── stage/
│       ├── lights.js           # 燈光氛圍 preset（dusk / night / dawn）
│       ├── materials.js        # palette token + 材質 preset + 建模 helper
│       ├── lazyScenes.js       # 場景 lazy build / dispose 管理
│       ├── assets.js           # 外部 Texture cache / loading / error / dispose
│       ├── resourceRegistry.js # Stage-shared Texture ownership
│       ├── renderPipeline.js   # WebGLRenderer + EffectComposer ownership
│       ├── resize.js           # viewport / camera resize lifecycle
│       ├── performance.js      # desktop / mobile 渲染預算
│       ├── visibility.js       # 背景分頁 RAF pause / resume
│       ├── projectPicker.js    # project raycast / hover / click lifecycle
│       ├── environment.js      # PMREM 夜景環境貼圖
│       ├── sky.js              # 單一天空 shader 與時間色彩
│       └── debugPath.js        # dev-only flight / look 路徑視覺化
├── scenes/                     # 場景模組：純函數 build(ctx) → Group
│   ├── workbench.js            # 01 工作桌（About）
│   ├── city.js                 # 02 城市（Projects，data-driven）
│   ├── droneCity.js            # 03 無人機系統城市
│   ├── droneArrival.js         # 02 → 03 共用機體／鏡頭路徑
│   ├── commandRoom.js          # 04 交付指揮室
│   ├── creativeLab.js          # 05 AI × FigureShot Lab
│   └── finalDesk.js            # 06 升級桌面收束
├── content/
│   └── site-content.js         # 內容層：文案 + 作品資料，唯一的內容來源
├── ui/
│   ├── ProjectCard.vue         # 第二幕作品卡
│   └── MissionGate.vue         # 第三幕任務選擇 + 數位 Portal overlay
└── App.vue                     # 組裝根：把四層接在一起
```

## 資料流

```
                    site-content.js（內容層）
                     ↙                  ↘
useScrollFlight ──t──→ FlightStage        FlightCaption × N
（驅動層）              │ composeShots(t) → camera pose
                       │ lazyScenes(t)  → build/dispose 場景
                       │ ctx.content    → 場景吃真實資料
                       └→ renderer.render()
```

`t` 是鏡頭、場景與 UI 的唯一時間同步機制；場景選取另以單向 `select` event
把 Raycaster 結果送到 UI，不建立第二套動畫狀態。

---

## 各模組使用方法

### 0. journey timeline（敘事時間軸）

`src/journey/timeline.js` 是所有 progress 區間的唯一來源，分為：

- `shots`：鏡頭實際移動區間，區間間 gap 仍代表 hold。
- `scenes.*.load`：lazy scene 建構／卸載範圍。
- `scenes.*.visible`：scene 已預載但何時真正出鏡。
- `captions` / `ui`：DOM overlay 顯示區間。

調整一幕時先在這裡確認所有受影響區間；場景與內容檔不可再 hardcode 同一組
progress 邊界。Camera 座標、easing 與 scene content 仍留在各自原本的模組。

### 1. useScrollFlight（驅動層）

```js
const ctl = useScrollFlight({
  damping: 0.08,
  stations: journeyStations,
  isInteractionBlocked: () => Boolean(activeProject.value),
})
// ctl.activeStation: Ref<object|null> current hidden narrative station
// ctl.stationAnimating / stationArmed: station input state
// ctl.jumpTo(t): programmatic chapter navigation
// ctl.progress: Ref<number>  平滑後的 t，給鏡頭與 UI
// ctl.raw:      Ref<number>  未平滑的 t，需要精準對齊捲動時用
```

- `damping` 越小鏡頭越滑順（電影感），越大越跟手。0.06–0.12 是甜蜜區。
- `prefers-reduced-motion` 時自動關閉平滑。
- 全站只呼叫一次（在 App.vue），往下用 props 傳遞。
- 注意：在 template 裡請透過 `ctl.progress` 傳遞（保持 ref 身分），
  不要解構成頂層 `progress` —— Vue template 會自動 unwrap 頂層 ref，
  傳進子元件就變成死的數字了。

- `stations` 未提供時維持純 scroll scrub；提供後只在定義區間啟用一次 gesture
  觸發一段固定時間動畫。播放中忽略 wheel／touch／keyboard，抵達且 input idle 後才
  重新 armed，向上 gesture 使用相同路徑倒放。
- Station 定義與轉場 keyframes 集中在 `journey/timeline.js`；右側 rail 仍只表示六幕，
  不把隱藏 Station 當成新的導覽點。
- `isInteractionBlocked` 用於作品卡等章節內互動；回傳 `true` 時會消耗換站 gesture，
  關閉互動並等待 idle 後才恢復。

### 2. shots（Shot 層）

統一 contract：**`{ getPose(localT, outPosition, outLookAt) }`**。
`localT` 是該 shot 自己的 0~1；直接寫入傳入的 Vector3，每 frame 零配置。

| Shot | 參數 | 運鏡語言 | 適合 |
|---|---|---|---|
| `dollyIn` | `from, to, target` | 推軌拉近，視線鎖定 | 逼近單一焦點（原 scroll-world repo 的招牌） |
| `line` | `fromPos, toPos, fromLook, toLook` | 直線位移 + 視線轉移 | crane 升降、離場、任何 A→B |
| `flyThrough` | `path[], look[], tension` | 沿曲線穿越 | 穿過場景群、走廊 |
| `orbit` | `center, radius, height, fromDeg, toDeg, target` | 環繞 | 展示單一作品的 360° |
| `pan` | `position, fromLook, toLook` | 定點搖鏡 | 開場環顧、收尾凝視 |

**新增自訂 shot**：寫一個工廠函數回傳同樣 contract 即可，例如螺旋下降：

```js
export function spiral({ center, fromRadius, toRadius, fromY, toY, turns = 2, target }) {
  const C = new THREE.Vector3(...center), T = new THREE.Vector3(...target)
  return {
    getPose(t, pos, look) {
      const a = t * turns * Math.PI * 2
      const r = fromRadius + (toRadius - fromRadius) * t
      pos.set(C.x + Math.cos(a) * r, fromY + (toY - fromY) * t, C.z + Math.sin(a) * r)
      look.copy(T)
    },
  }
}
```

不用改任何其他檔案，直接丟進 `composeShots` 就能編排。

### 3. composeShots（編排層）

```js
const flight = composeShots([
  { shot: shotA, range: [0.0, 0.3],  easing: easeOutCubic },
  { shot: shotB, range: [0.34, 0.74], easing: easeInOutSine },
  { shot: shotC, range: [0.8, 1.0],  easing: easeInOutCubic },
])
```

- `range` 是全域 t 區間。**區間之間的 gap = 鏡頭 hold**（停在上一段結尾），
  這是刻意的設計：hold 的時候正好讓使用者讀字幕。
- **Seam rule（最重要的一條）**：相鄰 shot，前者 `t=1` 的 pose 必須等於
  後者 `t=0` 的 pose。實務做法是把接縫座標集中在 `journey/flight.js` 的
  `journeyViews`，由相鄰 shot 共用。
- `flight.validateSeams()` 會回傳所有不連續的接縫；FlightStage 在
  dev mode 自動呼叫並在 console 警告；`npm test` 也會對正式 flight 做回歸檢查。

### 4. easing（鏡頭變速）

均速 = 監視器畫面；變速 = 電影。原則寫在 `easing.js` 檔頭：

- 逼近目標收尾 → `easeOutCubic` / `easeOutQuint`（鏡頭「停穩」的感覺）
- 中段巡航 → `easeInOutSine`
- 離場加速 → `easeInCubic`
- `flyThrough` 曲線本身已有節奏時 → `linear`

easing 掛在 segment 上（每段各自指定），不要全域套一條。

### 5. FlightStage（舞台元件）

```vue
<FlightStage
  :flight="flight"          <!-- composeShots() 的回傳值 -->
  :scenes="scenes"          <!-- lazy 場景 registry -->
  :progress="ctl.progress"  <!-- 驅動層的 ref -->
  :context="{ content: site }"  <!-- 傳進每個場景 build(ctx) 的資料 -->
  lighting="dusk"           <!-- lights.js 的 preset key -->
/>
```

它是唯一碰 renderer 的地方。UI 一律疊在外面，不要塞進來。

### 6. lazyScenes（場景 lazy 建構）

Registry 條目：

```js
{ id: 'city', range: [0.3, 0.78], build: (ctx) => buildCity(ctx), update?, dispose? }
```

- `t` 進入 `range ± margin`（預設 0.12）時 build 並加入 scene，
  離開後自動 dispose（geometry / material / scene-owned texture，以及 Object3D
  自訂 disposer，例如 Reflector 的 render target）。跨場景共用的材質貼圖 cache
  會保留到整個 FlightStage 卸載才統一釋放。
- 場景的 `range` 要比它「出鏡」的 shot range **寬一點**——鏡頭還在遠處
  就看得到下一個場景的輪廓，太窄會看到場景 pop 進畫面。
- `build` 是純函數：回傳 Group、不碰 scene、不碰 camera。
  這讓每個場景可以獨立開發與測試。
- `update(group, t, ctx, frame)` 的 `frame` 由 Stage 的單一 clock 提供
  `{ progress, elapsed, delta }`。場景不要各自呼叫 `performance.now()`；這讓動畫能被
  暫停、測試並與 visibility lifecycle 一起控制。前三個參數維持原 contract。
- `ctx.assets` 是 Stage-level AssetRegistry；外部 Texture 應使用
  `ctx.assets.loadTexture('textures/...')`，同 URL 會去重並依 Vite `BASE_URL` 解析。
  lazy scene 卸載不釋放共享資產，整個 Stage 卸載時才統一清理。場景程序化建立的
  CanvasTexture 仍由該 scene 的 disposer 負責。
- `ctx.performance` 是 Stage 建立時依 viewport／pointer 決定的渲染預算。手機降低
  DPR、Reflector render target 與 Bloom 強度；桌面維持原參數。分頁不可見時 Stage
  會停止 RAF，重新可見後保留原本 elapsed time 繼續。

### 7. lights（燈光氛圍）

Preset 簽名：`(scene) => cleanup`。兩條氛圍鐵律：

1. **fog 顏色 = 背景色**，遠處物體才會「融進天空」而不是被切邊。
2. fog 的 far 同時是效能預算：far 以外看不到，場景就不必建那麼遠。

換氛圍 = 改 `<FlightStage lighting="night" />` 一個字。
新增 preset = 在 `lights.js` 加一個同簽名函數。

### 8. materials（材質與模型細節）

所有場景透過 `materials.js` 拿材質，**不要在場景檔內直接 new Material**，
這樣全站換風格只改一個檔。升級路徑（正式版逐步做）：

1. `flat()`（Lambert，低多邊形平光）← 現在
2. `standard()`（PBR）：對焦點物件逐件替換，例如螢幕邊框、地標樓
3. 貼圖：`standard(color, { map: texture })`
4. GLTF 匯入：某個場景整組換成 Blender 匯出的模型，
   `build()` 介面不變（回傳 Group），其他層零改動

### 9. FlightCaption 與 UI 自由搭配

`FlightCaption` 只是示範。真正的 pattern 是三行 computed：

```js
const opacity = computed(() => fade(ctl.progress.value, 0.46, 0.68))
```

任何元件——Tailwind 卡片、nav、CTA 按鈕、甚至 chart——都能用同樣方式
綁定任何區間。要做「進場滑入」就多綁一個 `transform`。
UI 與 3D 唯一的共識是 `t`，所以彼此可以自由增減，互不影響。

### 10. 內容整合（site-content.js）

- `sections[]` 驅動所有字幕（文字、區間、畫面位置都在資料裡）。
- `projects[]` 驅動城市場景：一筆資料 = 一棟地標樓，樓的 `userData.project`
  帶著原始資料，之後做 hover / click 顯示作品卡片就從這撈
  （用 `THREE.Raycaster`，掛在 FlightStage 即可）。
- 要接 CMS / API：把這個模組改成 async fetch，其他層完全不動。

---

## 運鏡配置指南（推薦配方與預期觀感）

Shot 是零件，配置才是敘事。本節是給「編排飛行的人」的指南：每種 shot 帶來
什麼觀感、推薦哪些組合、以及各參數轉出來的體感結果。原則只有一條：
**每一段運鏡都要有敘事理由，一次飛行用 3-4 種就夠**，全用上會變雲霄飛車 demo。

### 每種 shot 的觀感

| Shot | 觀眾的感受 | 敘事用途 |
|---|---|---|
| `dollyIn` | 「被邀請靠近」，注意力被收束到單一焦點 | 開場破題、進入一個主題 |
| pull-back（`dollyIn` 反向） | 「原來全貌是這樣」，豁然開朗的回味感 | 收尾揭示、章節總結 |
| `flyThrough` | 「在遊覽」，資訊逐一經過眼前 | 瀏覽多個作品、串接章節 |
| `orbit` | 「被正式介紹」，物件被鄭重端詳 | 停留在單一代表作 |
| `line`（crane 用法） | 「視野升高／降落」，尺度感切換 | 進出章節、轉換高度 |
| `pan` | 「站定環顧」，先建立空間感再行動 | 開場定場、結尾凝視 |
| `spiral` | 「盤旋接近」，儀式感、鄭重其事 | 揭幕最重要的一件事 |
| `shake`（wrapper） | 「臨場、手持」，真實但不安定 | 極少量點綴，portfolio 慎用 |
| dolly zoom（需 contract 擴充） | 空間被擠壓的不安感，戲劇衝擊 | 幾乎不適合 portfolio，框架能力展示用 |

### 推薦配方（可直接抄的 segments 結構）

**配方 A：經典導覽流（現行示範，最穩的預設）**
`dollyIn`(easeOutCubic) → gap → `flyThrough`(easeInOutSine) → gap → `line` 爬升(easeInOutCubic)
預期結果：開場被拉進世界 → 從容遊覽作品 → 登高遠望收尾。節奏像一支好走的導覽，
不搶戲、內容是主角。適合第一版上線。

**配方 B：作品聚焦流（有代表作要主打時）**
`dollyIn` → `flyThrough`（短） → `orbit` 繞代表作 180°(easeInOutSine) → `flyThrough` → pull-back
預期結果：中段觀眾會明確感覺「這一件是重點」，orbit 的停留 + 環繞讓單一作品
獲得不成比例的注意力。orbit 的 range 建議給足（≥0.15），太短會變成甩頭。

**配方 C：揭示流（重氛圍、重餘韻）**
`pan` 環顧(linear) → `dollyIn` → `flyThrough` → 大幅 pull-back 到全景(easeOutQuint)
預期結果：先建立「這是一個世界」的空間感，結尾把整段旅程一次收進畫面裡，
回味感最強。代價是開場慢熱，適合觀眾願意花時間的場合（面試作品連結），
不適合注意力稀缺的社群流量。

### 參數 → 體感 對照

- **range 長度**：同樣的路徑距離，range 越短體感越快。焦點段（orbit、dollyIn 收尾）
  給長一點讓觀眾看清楚；過場段可以短。
- **gap（range 之間的空隙）**：鏡頭 hold 不動 = 閱讀時間。有字幕的地方前後都留 gap，
  沒有 gap 的字幕等於要求觀眾邊跑邊讀。
- **easing**：`easeOut*` = 進站停穩（抵達感）；`easeInOut*` = 漂浮滑行（過場感）；
  `easeIn*` = 蓄力離場。錯配的典型症狀：焦點段用 linear 會像監視器、
  過場段用 easeOutQuint 會有莫名其妙的急煞。
- **damping**（useScrollFlight）：0.06 電影感最重但最不跟手，0.12 反之。
  全站只有一個值，不要為單一段落調它。
- **捲動空間高度**（App.vue 的 1100vh）：整體節奏的總開關。覺得「整段都太趕」
  改這裡，覺得「只有某段太趕」改該段 range。

### 反模式（配置後會出事的組合）

- 連續兩段以上 `orbit`，或 `orbit` 弧度 > 270°：暈眩。
- `shake` 包在 `flyThrough` 外：高速移動 + 抖動 = 3D 暈的配方。
- 相鄰兩段視線方向落差過大（look 瞬間轉超過 ~90°）：即使 position 的 seam 是
  連續的，觀眾也會感覺「被甩頭」。讓前一段的 look 終點先轉到位。
- 沒有任何 gap 的滿檔飛行：觀眾從頭到尾找不到喘息點，字幕全部讀不完。



```bash
npm install
npm run dev      # 改 shots / scenes / content 都有 HMR
npm test         # flight / drone / SceneManager / resource lifecycle 回歸測試
npm run build    # 產出 dist/，可直接丟 GitHub Pages（base 已設 './'）
```

調鏡頭的順序建議：先用 `linear` 把路徑座標調對 → 開 console 確認
seam 無警告 → 最後才加 easing 調節奏。節奏太快就拉長 App.vue 裡的
捲動空間高度，不要去改 damping。

目前測試分工（共 24 項）：

- `tests/flight.test.js`：正式六幕 seam、hold、第三幕標題／第四幕邊界與 Portal 落點。
- `tests/drone-arrival.test.js`：由下往上 reveal、路徑接點與半機身追隨距離。
- `tests/scene-manager.test.js`：lazy build/update/dispose/destroy lifecycle。
- `tests/resources.test.js`：GPU ownership、手機渲染預算與 visibility listener。
- `tests/project-picker.test.js`：第三幕 mission 面板的 gate-aware Raycaster 選取。
- `tests/station-controller.test.js`：中繼站進出、固定時間正反向播放、輸入鎖定、
  inertia re-arm、最終站一秒停留與 reduced-motion。

## 已知的擴充關卡（roadmap）

1. **第三幕互動閘門**：Cinematic Stations 與 `SELECT A MISSION` → Portal → 現有第四幕
   Control Center 的 PoC 已完成。Analyze／Build／Deliver 目前共用同一出口；第四幕資訊架構
   定稿後才分流真實案例，不在 PoC 內捏造內容。
2. **首屏 bundle 拆分**：目前 production JS 約 656 KB；場景 registry 若改 dynamic
   import，必須先設計 async build 與取消載入，不能在現行同步 manager 內硬塞。
3. **GLTF 資產階段**：確認正式模型後，擴充 AssetRegistry 到 GLTF／DRACO；不要先為
   技術名稱重寫既有程序化場景。
4. **真實內容與連結**：補 GitHub、LinkedIn、Email／Contact、View All Projects。
5. **音效**：progress 跨越 range 邊界時觸發 whoosh（同樣訂閱 t，不需新機制）。
