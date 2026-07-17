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
      range: [0.0, 0.075],
      position: { left: '6vw', top: '18vh' },
      eyebrow: 'Portfolio · Flight 01',
      title: 'Alvis — Full-Stack Engineering Lead',
      body: '向下捲動，走進我打造系統、帶領交付，並探索 AI 產品的旅程。',
    },
    {
      id: 'about',
      range: [0.08, 0.17],
      position: { right: '4vw', top: '11vh', textAlign: 'right', maxWidth: '360px' },
      eyebrow: '01 — Workbench',
      title: '一切從這張桌子開始',
      body: '從產品介面、後端到系統架構；帶領團隊，也親手把產品交付上線。',
    },
    {
      id: 'projects',
      // 玻璃鏡頭在 t≈.32 停穩後才顯示，移動途中不遮住看板與城市。
      range: [0.32, 0.35],
      // 城市遠景左上方的天空留白：與第一幕錯開高度，也避開月球與建築輪廓。
      position: { left: '6vw', top: '22vh', textAlign: 'left', maxWidth: '460px' },
      eyebrow: '02 — Systems',
      title: '打造會被使用的系統',
      body: '每一棟樓是一個 project。',
    },
    {
      id: 'drone-ops',
      range: [0.4, 0.51],
      position: { right: '6vw', top: '18vh', textAlign: 'right', maxWidth: '560px' },
      eyebrow: '03 — Perspective',
      title: '在複雜系統中找到清楚航線',
      body: '從需求、架構到交付風險，以全端視角掌握脈絡，讓團隊知道現在在哪裡、下一步往哪裡走。',
    },
    {
      id: 'delivery',
      range: [0.56, 0.67],
      position: { left: '6vw', top: '17vh', textAlign: 'left', maxWidth: '470px' },
      eyebrow: '04 — Delivery',
      title: '把複雜系統帶到穩定交付',
      body: '串起服務拓撲、部署節奏與異常回應，讓團隊看見同一個真實狀態。',
    },
    {
      id: 'ai-lab',
      range: [0.72, 0.84],
      position: { right: '5vw', top: '13vh', textAlign: 'right', maxWidth: '470px' },
      eyebrow: '05 — AI × FigureShot',
      title: '把研究變成能被使用的創作工具',
      body: '文件經過 Embedding、檢索與 RAG，另一側則把靈感落進真實攝影棚。',
      link: { label: 'FIGURE PHOTOGRAPHY · @figsman99', url: 'https://www.instagram.com/figsman99/' },
    },
    {
      id: 'contact',
      // 第六幕進場與桌面巡覽時先保持乾淨，接近最底部才顯示收束文案。
      range: [0.965, 1.0],
      position: { left: '50%', top: '10vh', transform: 'translateX(-50%)', textAlign: 'center', maxWidth: '760px' },
      eyebrow: '06 — What Comes Next',
      title: "I build systems, lead delivery, and explore what's next with AI.",
      body: 'Alvis Wu · Full-Stack Engineering Lead × Solution Engineer × AI Explorer',
    },
  ],

  projects: [
    { id: 'knowledge-inbox', name: 'Knowledge Inbox', height: 8 },
    { id: 'workbench-nexus', name: 'Workbench Nexus', height: 6.5 },
    // 佔位名用英文：城市霓虹字的字型（troika 預設 Roboto）沒有 CJK 字元
    { id: 'project-3', name: 'Coming Soon', height: 5 },
  ],
}
