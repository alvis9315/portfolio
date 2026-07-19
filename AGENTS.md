# AGENTS.md — Scroll Flight Portfolio（Codex / 非 Claude 模型進入點）

本檔是給 Codex 等模型的接力入口，**刻意精簡、與 CLAUDE.md 各自維護（不是複製品）**。
完整交接說明在 `CLAUDE.md`，架構 source of truth 在 `ARCHITECTURE.md`——
**動任何程式碼前先完整讀這兩份。**

## 快速上手

```bash
npm install
npm run dev    # 先跑起來，實際從頭捲到尾體驗一次完整飛行
npm test       # 鏡頭／場景／資源 lifecycle 回歸測試
npm run build  # 每完成一項任務必跑，須通過且 console 無 seam 警告
```

## 模型分工（接任務前必做）

本專案由多個模型接力，強模型（目前為 Claude Fable 5）額度有限。
接到任務先跑 CLAUDE.md「模型分工規範」的三問判斷法，摘要：

1. 驗收主觀（節奏、好看）→ 留給最強模型，說明後建議 Alvis 保留。
2. 動核心介面（shot contract、composeShots、FlightStage props、跨層架構）
   → 留給最強模型。遵守既有 contract 新增實作 → 可做。
3. **執行中的逃生門**：做到一半發現要做文件沒載明的設計決策，
   立即停下，把決策問題整理成清單交給 Alvis，不要自行發明。

## 接力流程

- 一個任務由一個模型從頭做到尾，完成即 commit；接手一律從乾淨 commit 開始。
- 「必須遵守的專案慣例」1-7 與驗收標準見 CLAUDE.md，全部適用；
  特別注意：材質一律走 `stage/materials.js`、場景是純函數、
  UI 疊在 FlightStage 外、seam 座標集中於 `journey/flight.js` 的 `journeyViews`。

## 溝通慣例

- 回覆使用繁體中文，技術名詞保留英文。
- 有多個待確認事項時一次列出，不要逐條來回。
