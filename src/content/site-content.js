/**
 * 內容層：整個網站唯一的「真實內容」來源。
 * 文案改這裡、作品加這裡——UI 與 3D 都是吃這份資料 render 的。
 * projects 每一筆會在城市場景長出一棟地標樓（見 scenes/city.js）。
 * 之後要接 CMS / JSON API，只要讓這個模組改成 fetch 即可，其他層不用動。
 */
export const site = {
  sections: [
    {
      id: 'hero',
      range: [0.0, 0.16],
      position: { left: '6vw', top: '18vh' },
      eyebrow: 'Portfolio · Flight 01',
      title: 'Alvis — Full-Stack Engineering Lead',
      body: '向下捲動，走進我打造系統、帶領交付，並探索 AI 產品的旅程。',
    },
    {
      id: 'about',
      range: [0.18, 0.34],
      position: { right: '4vw', top: '11vh', textAlign: 'right', maxWidth: '360px' },
      eyebrow: '01 — Workbench',
      title: '一切從這張桌子開始',
      body: '從產品介面、後端到系統架構；帶領團隊，也親手把產品交付上線。',
    },
    {
      id: 'projects',
      range: [0.46, 0.68],
      // 城市遠景左上方的天空留白：與第一幕錯開高度，也避開月球與建築輪廓。
      position: { left: '6vw', top: '22vh', textAlign: 'left', maxWidth: '460px' },
      eyebrow: '02 — Systems',
      title: '打造會被使用的系統',
      body: '每一棟樓是一個 project。',
    },
  ],

  projects: [
    { id: 'knowledge-inbox', name: 'Knowledge Inbox', height: 8 },
    { id: 'workbench-nexus', name: 'Workbench Nexus', height: 6.5 },
    // 佔位名用英文：城市霓虹字的字型（troika 預設 Roboto）沒有 CJK 字元
    { id: 'project-3', name: 'Coming Soon', height: 5 },
  ],
}
