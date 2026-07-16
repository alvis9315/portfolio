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
      title: 'Alvis — Frontend Engineer',
      body: '向下捲動。整段是同一顆鏡頭，沒有剪接。',
    },
    {
      id: 'about',
      range: [0.18, 0.34],
      position: { left: '6vw', bottom: '16vh' },
      eyebrow: '01 — Workbench',
      title: '一切從這張桌子開始',
      body: 'Vue 3 · Tailwind CSS · 帶團隊也寫 code。',
    },
    {
      id: 'projects',
      range: [0.46, 0.68],
      position: { right: '6vw', top: '20vh', textAlign: 'right' },
      eyebrow: '02 — Systems',
      title: '打造會被使用的系統',
      body: '每一棟樓是一個 project。',
    },
    {
      id: 'contact',
      range: [0.86, 1.0],
      position: { left: '50%', top: '42vh', transform: 'translateX(-50%)', textAlign: 'center' },
      eyebrow: '03 — Next',
      title: '往下一座山',
      body: '這裡放 Contact 與 CTA。',
    },
  ],

  projects: [
    { id: 'knowledge-inbox', name: 'Knowledge Inbox', height: 8 },
    { id: 'workbench-nexus', name: 'Workbench Nexus', height: 6.5 },
    // 佔位名用英文：城市霓虹字的字型（troika 預設 Roboto）沒有 CJK 字元
    { id: 'project-3', name: 'Coming Soon', height: 5 },
  ],
}
