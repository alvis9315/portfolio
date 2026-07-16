# 兩種渲染路線（Rendering Approaches）

> **重要選擇**：這個 portfolio 的「scroll 驅動視覺」有兩條可互換的實作路線。
> 目前採用 **路線 A（Three.js 即時 3D）**。路線 B（AI 影片）已保留完整實作方法，
> 尚未建置。兩者共用同一個驅動層與 UI 層，差別只在「舞台（Stage）」元件。

## 為什麼有兩條路線

原始靈感 [oso95/scroll-world](https://github.com/oso95/scroll-world) 的官方 demo 之所以
看起來像實景／精緻 3D 動畫，是因為它**不是即時渲染，而是 AI 生成的預渲染影片**
（GPT Image 2 生等距立體場景靜圖 → Seedance / Kling image-to-video 動畫化 →
vanilla JS scrub engine 用捲動拖動影片時間軸）。

本專案當初刻意走了**另一條路**：用 Three.js 即時渲染、不用任何影片素材，把
scroll-world 的 seam 智慧用 3D 運鏡重寫。兩條路各有取捨，於是保留成可選的兩個模組。

| | 路線 A：Three.js 即時 3D（現用） | 路線 B：AI 影片 scrub（官方） |
|---|---|---|
| 畫面來源 | WebGL 即時渲染幾何 | 預渲染影片（AI 生成） |
| 視覺天花板 | 低多邊形 → GLTF/貼圖/後製可拉高，但難到照片級 | 可寫實、可動畫、很精緻 |
| 改內容 | 改程式/座標即時反映 | 要重新生成影片 |
| 成本 | 純程式、零素材、零 API 費 | 需 Higgsfield + Seedance/Kling（**付費**） |
| 體積 | 幾百 KB JS | 一堆影片檔（行動裝置頻寬要顧） |
| 互動 | Raycaster 可點選任何物件（作品卡） | 影片上疊 UI，物件點選要另外對位 |
| 對應元件 | `src/flight/FlightStage.vue` | `src/stages/VideoStage.vue`（待建） |

## 共用契約（兩條路線都不動這些）

`t`（progress）是唯一同步機制。切換路線 = 換掉舞台元件，其餘不動：

- **驅動層** `src/flight/useScrollFlight.js`：scroll → damped progress。與渲染方式無關。
- **UI 層**（`FlightCaption`、`src/ui/ProjectCard`…）：只綁 `progress` 區間，疊在舞台外。
- **內容層** `src/content/site-content.js`：文案 / 作品資料。
- **舞台（Stage）**：唯一路線相關的元件。契約是「吃 `progress`（Ref<number>）→ 畫出當下畫面」。
  - 路線 A `FlightStage`：`progress → composeShots.getPose → camera pose → renderer.render`
  - 路線 B `VideoStage`：`progress → video.currentTime（scrub）→ 播放對應影格`

App.vue 只需選一個舞台元件掛上，driver 與 UI 完全共用。

---

## 路線 B 實作方法（AI 影片，保留供日後採用）

### 選項 1：直接用官方 skill（最省事）

scroll-world 本身是一個 **Claude Code / Codex 的 agent skill**。安裝後給它需求，它會跑
完整資產管線並產出前端。前提：本機要有 **Higgsfield CLI**、以及 **Seedance 或 Kling**
的 image-to-video 額度（付費），另需 FFmpeg/ffprobe、Python 3 + Pillow。

### 選項 2：手動管線（理解每一步，可控）

1. **每個場景一張靜圖**：用 GPT Image 2 生「cohesive isometric diorama」風格靜圖，
   6 個場景 = 6 張，需維持一致的美術風格（同一 prompt 骨架 + 場景描述）。
2. **每個場景一段 dive-in 影片**：把靜圖丟 Seedance/Kling image-to-video，生成
   「鏡頭飛入該場景」的短片（即官方說的「camera genuinely moves; scroll only drives time」）。
3. **connector clips（接縫片段）**：相鄰兩場景之間，**取前一段結尾影格與後一段起始影格**
   當條件生成過場片段，確保 frame-identical——這就是路線 A 的 seam rule 在影片版的等價物。
   接縫不對齊，捲動時就會「跳」。
4. **（選配）9:16 直式版**：另渲一組行動裝置直式影片。
5. **前端 scrub engine（vanilla JS，即 `VideoStage` 要實作的）**：
   - 把所有 clip 依序接成一條邏輯時間軸（總長 = 各 clip 長度和）。
   - 每 frame：`const T = progress * totalDuration`，找出 T 落在哪個 clip、
     設 `videoEl.currentTime = 局部時間`（scrub，不是 play）。跨 clip 邊界時切換
     `videoEl.src`（或用多個預載的 `<video>` 疊放，切換顯示）。
   - 行動裝置注意：iOS Safari 對 `<video>` scrub 需 `playsinline`、且 seek 效能有限，
     常見做法是把影片**轉成影格序列（FFmpeg 抽格）**改用 canvas 逐格繪製，避開 seek 卡頓。
   - UI 與作品卡照樣疊在 `VideoStage` 外、綁 `progress`；但 3D 的 Raycaster 點選不適用，
     作品「熱區」要改用畫面座標（每個場景記錄作品在該影格的螢幕位置區間）。

### 路線 B 的取捨（決定前先想清楚）

- **改一個字都要重生影片**：文案/作品變動頻繁的話，路線 B 很痛。
- **成本與時間**：AI 影片生成要錢也要等；6 場景 + 接縫是十幾段生成。
- **體積與載入**：影片檔大，首屏與行動裝置頻寬要規劃（預載策略、解析度分級）。
- **無法程式化互動**：不像 Three.js 能即時 raycast，互動要靠螢幕座標熱區硬對。

---

## 目前狀態與切換方式

- **現用：路線 A**。App.vue 掛 `FlightStage`。
- 要試路線 B：實作 `src/stages/VideoStage.vue`（見該檔註解的介面），
  在 App.vue 把 `<FlightStage .../>` 換成 `<VideoStage .../>`，driver 與 UI 不動。
- 兩條路線可長期並存：同一份 driver + UI + content，掛不同 Stage 即可 A/B 比較。
