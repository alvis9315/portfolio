# HANDOFF — Scroll Flight Portfolio 實作交接說明

> 給 Claude Code 的開工文件。可直接放在專案根目錄（建議改名為 `CLAUDE.md` 讓 Claude Code 自動讀取）。

## 專案背景

這是 Alvis 的個人 portfolio 網站，核心特效是「scroll 驅動的 3D 鏡頭飛行」：
使用者捲動頁面時，一顆鏡頭無剪接地飛越多個 low-poly 場景（工作桌 → 城市 → 山），
原理同 Apple 的 scroll-through 產品頁，但用 Three.js 即時渲染，**不使用任何影片素材**。
技術棧：Vue 3 + Vite + Three.js，部署目標 GitHub Pages（vite base 已設 `'./'`）。

## 你手上的兩份檔案

1. **`scroll-flight-skeleton.zip`** — 完整可跑的專案骨架。解壓後即為專案根目錄。
   已驗證 `npm install && npm run build` 可通過。
2. **`ARCHITECTURE.md`** — 架構與模組說明文件（zip 內也有一份）。
   **這是本專案的 source of truth**：四層架構、每個模組的介面 contract、
   使用方法、擴充方式、easing 原則、seam rule 全部在裡面。
   **動任何程式碼前先完整讀它。**

## 開工步驟

```bash
unzip scroll-flight-skeleton.zip && cd scroll-flight
npm install
npm run dev        # 先跑起來，實際捲動一次體驗完整飛行
```

## 架構速覽（細節見 ARCHITECTURE.md）

核心公式：`scroll → t (0~1) → camera { position, lookAt } → render`。

| 層 | 檔案 | 職責 |
|---|---|---|
| 驅動層 | `src/flight/useScrollFlight.js` | scroll → damped progress，全站唯一 t 來源 |
| Shot 層 | `src/flight/shots.js` | 五種運鏡 primitive，統一 contract `getPose(t, pos, look)` |
| 編排層 | `src/flight/composeShots.js` | 串接 shots、分配 range、seam 驗證 |
| 舞台層 | `src/flight/FlightStage.vue` + `stage/` | renderer、燈光 preset、lazy 場景管理 |
| 場景 | `src/scenes/*.js` | 純函數 `build(ctx) → Group` |
| 內容 | `src/content/site-content.js` | 文案與作品資料的唯一來源 |
| UI | `FlightCaption.vue` + App.vue | 訂閱 progress 區間的 overlay |

## 必須遵守的專案慣例

1. **Seam rule**：相鄰兩個 shot，前者 t=1 的 pose 必須等於後者 t=0 的 pose。
   接縫座標一律宣告成常數共用（見 `App.vue` 的 `SEAM_1`/`SEAM_2`）。
   改完任何路徑，開 dev mode 看 console 有無 `[flight] seam gap` 警告。
2. **Vue ref 陷阱**：`useScrollFlight()` 的回傳值不要解構成頂層變數，
   統一 `const ctl = useScrollFlight(...)` 再以 `ctl.progress` 傳遞——
   template 會自動 unwrap 頂層 ref，傳進子元件會變成不會更新的死數字。
3. **材質集中管理**：場景檔內禁止直接 `new THREE.Mesh*Material`，
   一律從 `stage/materials.js` 取用（palette token + `flat()`/`glow()`/`standard()`）。
4. **場景是純函數**：`build(ctx)` 只回傳 Group，不碰 scene、不碰 camera、
   不留全域狀態；dispose 由 `lazyScenes.js` 統一處理。
5. **內容與程式分離**：文案、作品清單只改 `site-content.js`，
   UI 與 3D 都是吃這份資料 render 的。
6. **UI 與 3D 解耦**：新 UI 元件一律疊在 `FlightStage` 外面，
   透過 computed 綁 `ctl.progress` 的區間，不要把 DOM 塞進舞台元件。
7. 調鏡頭節奏的順序：先 `linear` 調對路徑座標 → 確認 seam 無警告 →
   最後才加 easing。節奏太慢/太快改 App.vue 的捲動空間高度（640vh），
   不要動 damping。

## 實作任務（依優先序）

依 ARCHITECTURE.md 的 roadmap 執行，每完成一項先跑 `npm run build` 驗證再往下：

1. **Dev 路徑視覺化工具**：dev mode 下用 `THREE.Line` 把 flight path 與
   look path 畫出來（可用 URL query `?debug` 切換）。先做這個，後面調路徑快十倍。
2. **Raycaster 互動**:城市地標樓 hover 高亮 + click 顯示作品資訊卡。
   資料已在每棟樓的 `userData.project`；資訊卡是 UI 層元件，走慣例 6。
3. **真實內容填充**：與 Alvis 確認 `site-content.js` 的正式文案與作品清單
   （目前是 placeholder；作品欄位可自行擴充，如 `description`、`stack`、`url`）。
4. **材質升級第一波**：焦點物件（螢幕、地標樓）從 `flat()` 換 `standard()`，
   其餘維持 low-poly 平光，對比出焦點。
5. **手機體驗調校**：驗證 640vh 在行動裝置的捲動節奏、caption 排版、
   以及 devicePixelRatio 已 cap 在 2 的效能表現。
6. **（後續）GLTF 場景升級與音效**：介面已預留，見 ARCHITECTURE.md。

## 驗收標準

- `npm run build` 通過，無 seam 警告
- 從頭捲到尾：無鏡頭跳動、無場景 pop-in（必要時調 `lazyScenes` 的 margin）
- 手機（375px 寬）可正常體驗完整飛行
- `prefers-reduced-motion` 下功能完整（平滑自動關閉，已內建，勿破壞）
- 新增的每個 shot / 場景 / preset 都遵守既有 contract，不引入跨層依賴

## 拆分 flight core 為獨立 repo（延後執行）

**觸發條件**：連續 2-3 個功能的實作都完全沒有修改 `src/flight/` 底下任何檔案，
代表 core API 已穩定。**在此之前不要拆**，避免介面還在變動時的跨 repo 同步成本。
拆分前先向 Alvis 確認一次。

執行步驟：

1. 建新 repo `scroll-flight-core`，把 `src/flight/` 整個目錄搬過去作為 `src/`，
   保留 git history（可用 `git filter-repo --path src/flight/`，或直接複製後首 commit 註明來源）。
2. 補上 package 設定：`package.json` 加 `name: "scroll-flight-core"`、
   `main` / `exports` 指向入口（建一個 `src/index.js` 統一 re-export：
   `useScrollFlight`、五種 shots、`composeShots`、easing、`FlightStage.vue`、
   `FlightCaption.vue`、`stage/` 各模組）。`three` 與 `vue` 宣告為 `peerDependencies`。
3. 把 ARCHITECTURE.md 中屬於 core 的章節（驅動層、Shot 層、編排層、舞台層、
   lights / materials / lazyScenes）搬到新 repo 的 README，portfolio 這邊保留
   場景、內容、UI 整合的部分並加上連結。
4. portfolio repo 移除 `src/flight/`，改為 `npm i github:<帳號>/scroll-flight-core`
   安裝（不需發 npm registry），import 路徑從 `'./flight/...'` 改為
   `'scroll-flight-core'`。
5. 兩邊各跑 `npm run build` 驗證，portfolio 從頭捲到尾確認行為完全一致、
   console 無 seam 警告。
6. `src/scenes/` 與 `src/content/` **留在 portfolio repo**——它們是內容，不是框架。

## 溝通慣例

- 回覆使用繁體中文，技術名詞保留英文
- 有多個待確認事項時一次列出，不要逐條來回
