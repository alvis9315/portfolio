import * as THREE from 'three'

/**
 * 材質層：palette token + 三個等級的材質 preset。
 * 升級路徑（見 ARCHITECTURE.md「模型細節與材質」）：
 *   flat (Lambert) → standard (PBR) → 貼圖 / GLTF 匯入模型。
 * 場景程式碼一律透過這裡拿材質，換風格時只改這一個檔。
 */

export const palette = {
  // 島/地面：深板岩灰藍（原本綠色被嫌醜，2026-07-16 改）
  islandTop: 0x222936,
  islandMid: 0x181f2b,
  islandDeep: 0x111722,
  // 第一幕：桃木咖啡地坪＋奶油灰桌椅，3C 全部維持極深灰。
  workbenchFloor: 0x815642,
  workbenchFloorMid: 0x614033,
  workbenchFloorDeep: 0x432c25,
  wood: 0xc9c1b9,
  woodDark: 0xc9c1b9,
  // 極深灰(非墨綠!使用者明確討厭濁綠色調的 3C 物件)
  device: 0x141519,
  keycap: 0x1a1c20,
  steel: 0x2c3a48,
  screenBlue: 0x6cb8ff, // 螢幕:科技感螢光藍
  buildingA: 0x3e5c76,
  buildingB: 0x567089,
  buildingC: 0x2c3e50,
  buildingD: 0x46627f,
  mountain: 0x33465a,
  snow: 0xdfe8ee,
  screenGlow: 0x9fe3d0,
  warmGlow: 0xffd787,
  moon: 0xf5edda,
  star: 0xbcd0e4,
  // 玻璃鏡面大樓（Spider-Man PS5 風）：深色玻璃靠反射出質感，窗光暖/冷混合
  glassWarm: 0x1b2a3c,
  glassCool: 0x203343,
  coolWindow: 0xbcd6ea,
  spideyRed: 0xff2b3a,
  spideyBlue: 0x2f6bff,
}

/** 低成本平光材質（低多邊形風格的主力） */
export const flat = (c) => new THREE.MeshLambertMaterial({ color: c })

/** 自發光效果（螢幕、窗燈、月亮）——unlit，不受燈光影響 */
export const glow = (c, opts = {}) => new THREE.MeshBasicMaterial({ color: c, ...opts })

/** PBR 材質（升級用）：需要質感時逐件替換 flat() */
export const standard = (c, opts = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05, ...opts })

/**
 * 焦點物件材質（克制版 PBR）：焦點物件（螢幕外殼、城市地標樓）專用。
 * roughness 0.5 + 低 metalness → 方向光下有微微高光層次，和平光背景（flat）
 * 拉出「這是焦點」的細微對比，但不破壞整體 low-poly 調性。
 * 要整批調焦點手感只改這一行（換 flat 主導就把數值往 standard 靠）。
 */
export const focus = (c, opts = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.15, ...opts })

/** 自發光 PBR：保留實體表面細節，同時讓螢幕／看板進入 bloom。 */
export const emissive = (c, intensity = 1, opts = {}) =>
  new THREE.MeshStandardMaterial({
    color: c,
    emissive: c,
    emissiveIntensity: intensity,
    roughness: 0.42,
    metalness: 0.08,
    ...opts,
  })

let galvanizedMap = null
/** 鍍鋅鋼：本體仍是平直鋼材，靠鋅花造成細微不均勻反射，不做誇張凹凸。 */
export const galvanizedSteel = (c = 0xa4a9ad, opts = {}) => {
  if (!galvanizedMap) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#b5b8ba'; ctx.fillRect(0, 0, 128, 128)
    const rnd = seededRandom(31)
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 128, y = rnd() * 128, r = 3 + rnd() * 10
      ctx.fillStyle = `rgba(${120 + (rnd() * 45) | 0},${124 + (rnd() * 42) | 0},${127 + (rnd() * 40) | 0},0.22)`
      ctx.beginPath()
      for (let p = 0; p < 6; p++) {
        const a = p / 6 * Math.PI * 2
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r
        if (p) ctx.lineTo(px, py); else ctx.moveTo(px, py)
      }
      ctx.closePath(); ctx.fill()
    }
    galvanizedMap = new THREE.CanvasTexture(canvas)
    galvanizedMap.wrapS = galvanizedMap.wrapT = THREE.RepeatWrapping
    galvanizedMap.repeat.set(2, 2)
    galvanizedMap.colorSpace = THREE.SRGBColorSpace
  }
  return standard(c, { map: galvanizedMap, roughness: 0.56, metalness: 0.66, envMapIntensity: 1.1, ...opts })
}

let monitorScreenMap = null
/**
 * 關機／暗內容中的 IPS 面板：整體接近黑，只留非常輕微的角度 glow 與 anti-glare 質感。
 * 不用純藍色塊，否則遠看會像發光招牌而不是螢幕。
 */
export const monitorScreen = () => {
  if (!monitorScreenMap) {
    const c = document.createElement('canvas')
    c.width = 768
    c.height = 432
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, c.width, c.height)
    // 桌面版 VS Code 比例：窄 Activity Bar、Explorer、Editor、minimap、status bar。
    ctx.fillStyle = '#181818'; ctx.fillRect(0, 0, 42, 412)
    ctx.fillStyle = '#1f1f1f'; ctx.fillRect(42, 0, 170, 412)
    ctx.fillStyle = '#181818'; ctx.fillRect(212, 0, 556, 412)
    ctx.fillStyle = '#252526'; ctx.fillRect(212, 0, 556, 29)
    ctx.fillStyle = '#1f1f1f'; ctx.fillRect(212, 29, 556, 23)
    ctx.fillStyle = '#007acc'; ctx.fillRect(0, 412, 768, 20)
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(212, 28, 148, 1)
    // Activity Bar icons（用幾何符號維持 canvas 零外部資源）。
    ctx.font = '20px system-ui, sans-serif'; ctx.fillStyle = '#c5c5c5'; ctx.textAlign = 'center'
    for (const [icon, y] of [['▱', 29], ['⌕', 70], ['⑂', 111], ['▷', 152], ['◇', 193]]) ctx.fillText(icon, 21, y)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#007acc'; ctx.fillRect(0, 0, 2, 39)
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#cccccc'
    ctx.fillText('EXPLORER', 53, 20); ctx.fillText('•••', 180, 20)
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#dddddd'
    ctx.fillText('⌄ PORTFOLIO', 53, 48)
    const tree = [
      ['⌄', 'src', 66, '#d7ba7d'], ['⌄', 'content', 84, '#d7ba7d'], ['JS', 'site-content.js  M', 102, '#dcdcaa'],
      ['⌄', 'composables', 120, '#d7ba7d'], ['JS', 'useProfile.js  M', 138, '#dcdcaa'],
      ['›', 'flight', 156, '#cccccc'], ['⌄', 'scenes', 174, '#d7ba7d'],
      ['JS', 'city.js  M', 192, '#dcdcaa'], ['JS', 'workbench.js  M', 210, '#dcdcaa'],
      ['V', 'App.vue  M', 228, '#89d185'], ['#', 'style.css', 246, '#4ec9b0'],
    ]
    tree.forEach(([icon, label, y, color]) => {
      ctx.fillStyle = color; ctx.fillText(icon, 57, y); ctx.fillStyle = '#cccccc'; ctx.fillText(label, 78, y)
    })
    // Active tab + breadcrumb。
    ctx.fillStyle = '#1e1e1e'; ctx.fillRect(212, 0, 154, 29)
    ctx.fillStyle = '#dcdcaa'; ctx.fillText('JS', 224, 19)
    ctx.fillStyle = '#eeeeee'; ctx.fillText('useProfile.js  M', 246, 19)
    ctx.fillStyle = '#aaaaaa'; ctx.fillText('src  ›  composables  ›  useProfile.js', 225, 45)
    // 語法正確的 Vue 3 composable：一包 profile 資訊可供其他畫面引用。
    const code = [
      ['#c586c0', 'import ', '#d4d4d4', '{ ', '#9cdcfe', 'computed', '#d4d4d4', ', ', '#9cdcfe', 'readonly', '#d4d4d4', " } from 'vue'"],
      [],
      ['#569cd6', 'const ', '#4fc1ff', 'profile', '#d4d4d4', ' = {'],
      ['#9cdcfe', '  name', '#d4d4d4', ': ', '#ce9178', "'Alvis Wu'", '#d4d4d4', ','],
      ['#9cdcfe', '  space', '#d4d4d4', ': ', '#ce9178', "'Portfolio'", '#d4d4d4', ','],
      ['#9cdcfe', '  title', '#d4d4d4', ': ', '#ce9178', "'Software Engineer'", '#d4d4d4', ','],
      ['#9cdcfe', '  roles', '#d4d4d4', ': [', '#ce9178', "'Full-Stack Lead'", '#d4d4d4', ', ', '#ce9178', "'Solution Engineer'", '#d4d4d4', '],'],
      ['#9cdcfe', '  explores', '#d4d4d4', ': [', '#ce9178', "'AI products'", '#d4d4d4', ', ', '#ce9178', "'RAG'", '#d4d4d4', '],'],
      ['#9cdcfe', '  creates', '#d4d4d4', ': ', '#ce9178', "'Action figure photography'", '#d4d4d4', ','],
      ['#d4d4d4', '}'],
      [],
      ['#c586c0', 'export function ', '#dcdcaa', 'useProfile', '#d4d4d4', '() {'],
      ['#569cd6', '  const ', '#4fc1ff', 'headline', '#d4d4d4', ' = ', '#dcdcaa', 'computed', '#d4d4d4', '(() =>'],
      ['#ce9178', '    `${', '#9cdcfe', 'profile.name', '#ce9178', '} · ${', '#9cdcfe', 'profile.title', '#ce9178', '}`'],
      ['#d4d4d4', '  )'],
      ['#c586c0', '  return ', '#d4d4d4', '{ profile: ', '#dcdcaa', 'readonly', '#d4d4d4', '(profile), headline }'],
      ['#d4d4d4', '}'],
    ]
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
    code.forEach((segments, row) => {
      const y = 70 + row * 18
      ctx.fillStyle = '#858585'; ctx.textAlign = 'right'; ctx.fillText(String(row + 1), 245, y); ctx.textAlign = 'left'
      let x = 259
      for (let i = 0; i < segments.length; i += 2) {
        ctx.fillStyle = segments[i]
        ctx.fillText(segments[i + 1], x, y)
        x += ctx.measureText(segments[i + 1]).width
      }
    })
    // 縮排導引、游標與 minimap。
    ctx.strokeStyle = 'rgba(255,255,255,0.055)'; ctx.lineWidth = 1
    for (const x of [267, 283, 299]) { ctx.beginPath(); ctx.moveTo(x, 54); ctx.lineTo(x, 398); ctx.stroke() }
    ctx.fillStyle = '#aeafad'; ctx.fillRect(259, 382, 2, 14)
    ctx.fillStyle = '#171717'; ctx.fillRect(714, 52, 54, 360)
    for (let y = 62; y < 300; y += 7) {
      ctx.fillStyle = y % 21 ? '#33404c' : '#72546f'; ctx.fillRect(722, y, 22 + (y * 13) % 31, 2)
    }
    ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = '#ffffff'
    ctx.fillText('⑂ main*', 12, 426); ctx.fillText('Ln 17, Col 2   Spaces: 2   UTF-8   LF   JavaScript', 530, 426)
    // IPS glow 只做成角落非常淡的不均勻亮度。
    const glow = ctx.createRadialGradient(620, 340, 0, 620, 340, 210)
    glow.addColorStop(0, 'rgba(53,91,139,0.08)')
    glow.addColorStop(1, 'rgba(53,91,139,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, c.width, c.height)
    monitorScreenMap = new THREE.CanvasTexture(c)
    monitorScreenMap.colorSpace = THREE.SRGBColorSpace
  }
  return emissive(0xffffff, 0, {
    map: monitorScreenMap,
    emissiveMap: monitorScreenMap,
    roughness: 0.68,
    metalness: 0.04,
  })
}

/**
 * 玻璃鏡面材質（Spider-Man PS5 曼哈頓風）：高 metalness + 低 roughness，
 * 靠 scene.environment（見 stage/environment.js）反射夜空與城市輝光出玻璃感。
 * 一定要有 scene.environment，否則金屬面會是死黑。
 */
export const glass = (c, opts = {}) =>
  new THREE.MeshStandardMaterial({ color: c, metalness: 0.78, roughness: 0.28, envMapIntensity: 1.5, ...opts })

/* 玻璃帷幕牆三張貼圖（curtain wall）：
 *  color   面板底色微差 + 窗櫺線
 *  rough   面板近黑(=鏡面光滑)、窗櫺亮(=霧面) → 「每一小格都是鏡面」的關鍵一
 *  normal  每格隨機微傾 → 每格反射角度略不同(真實帷幕每片玻璃角度不一) → 關鍵二
 * 共用三張 canvas，各樓 clone 後依尺寸設 repeat。 */
let facadeMaps = null
function makeFacadeMaps() {
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    return [c, c.getContext('2d')]
  }
  const [cc, cctx] = mk()
  const [rc, rctx] = mk()
  const [nc, nctx] = mk()
  const S = 64 // 高解析 + 細格線（2px/64 ≈ 3%）才像真實帷幕
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const v = 34 + Math.random() * 8 // 月光下稍微提亮，格間仍只保留細微差異
      cctx.fillStyle = `rgb(${(v * 0.55) | 0},${(v * 0.8) | 0},${(v * 1.15) | 0})`
      cctx.fillRect(x * S, y * S, S, S)
      rctx.fillStyle = 'rgb(34,34,34)' // 保留反射但擴散尖銳月光，不再形成圓形熱點
      rctx.fillRect(x * S, y * S, S, S)
      nctx.fillStyle = `rgb(${(122 + Math.random() * 12) | 0},${(122 + Math.random() * 12) | 0},255)` // 每格微傾（幅度小）
      nctx.fillRect(x * S, y * S, S, S)
    }
  }
  const grid = (ctx, style) => {
    ctx.strokeStyle = style
    ctx.lineWidth = 2
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * S, 0); ctx.lineTo(i * S, 512); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * S); ctx.lineTo(512, i * S); ctx.stroke()
    }
  }
  // 接縫（查證：現代 structural glazing 是「內凹深色矽利康縫」，不是亮線）
  grid(cctx, 'rgba(7,10,16,0.9)') // 暗縫
  grid(rctx, 'rgb(190,190,190)') // 縫：矽利康霧面
  // 法線圖做凹槽（bevel）：縫兩側各 2px 反向傾斜 → 立體內凹感
  for (let i = 0; i <= 8; i++) {
    const p = i * S
    nctx.fillStyle = 'rgb(100,128,255)'; nctx.fillRect(p - 2, 0, 2, 512) // 左壁朝左
    nctx.fillStyle = 'rgb(156,128,255)'; nctx.fillRect(p, 0, 2, 512) // 右壁朝右
    nctx.fillStyle = 'rgb(128,100,255)'; nctx.fillRect(0, p - 2, 512, 2) // 上壁朝上
    nctx.fillStyle = 'rgb(128,156,255)'; nctx.fillRect(0, p, 512, 2) // 下壁朝下
  }
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  return { map: tex(cc, true), rough: tex(rc), normal: tex(nc) }
}

/**
 * 鏡面帷幕大樓材質：每格鏡面、窗櫺霧面、每格反射角微差。
 * 側面用它、樓頂用素面 glass()（屋頂沒有窗格）。
 */
export const glassFacade = (w, h, cool = true) => {
  facadeMaps = facadeMaps || makeFacadeMaps()
  // 一格 ≈ 1.0×0.9 世界單位（貼圖一輪 8×8 格；格子放大 6 倍是 Alvis 定的比例）
  const rx = w / 8
  const ry = h / 7.2
  const clone = (t) => {
    const c = t.clone()
    c.needsUpdate = true
    c.repeat.set(rx, ry)
    return c
  }
  return new THREE.MeshStandardMaterial({
    color: cool ? 0xc2d8ea : 0xdcd2c2,
    map: clone(facadeMaps.map),
    roughnessMap: clone(facadeMaps.rough),
    roughness: 1.0, // 實際值由 roughnessMap 決定（面板鏡面/窗櫺霧面）
    normalMap: clone(facadeMaps.normal),
    normalScale: new THREE.Vector2(0.72, 0.72),
    metalness: 0.76,
    envMapIntensity: 2.5,
  })
}

/**
 * 亮燈的窗（一格）：模擬「室內天花板燈透出玻璃」——上緣最亮、往下漸暗。
 * 貼在帷幕格正中央（尺寸略小於一格，留出窗櫺），比漂浮光點真實。
 */
let ceilTexCache = null
export const litWindow = (warm = true) => {
  if (!ceilTexCache) {
    const c = document.createElement('canvas')
    c.width = 32
    c.height = 64
    const ctx = c.getContext('2d')
    // 從窗外看到的是天花板的整體反射與室內散射，不是數條清楚的燈管。
    // 只保留頂部柔亮、往樓板方向連續衰減的漸層。
    const base = ctx.createLinearGradient(0, 0, 0, 64)
    base.addColorStop(0, 'rgba(255,255,255,0.5)')
    base.addColorStop(0.12, 'rgba(255,255,255,0.34)')
    base.addColorStop(0.42, 'rgba(255,255,255,0.13)')
    base.addColorStop(1, 'rgba(255,255,255,0.015)')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 32, 64)
    ceilTexCache = new THREE.CanvasTexture(c)
  }
  return new THREE.MeshStandardMaterial({
    map: ceilTexCache,
    alphaMap: ceilTexCache,
    transparent: true,
    opacity: 0.42,
    color: warm ? 0x3d3025 : 0x283745,
    emissive: warm ? 0x806044 : 0x52697e,
    emissiveMap: ceilTexCache,
    emissiveIntensity: 0.1,
    roughness: 0.82,
    metalness: 0,
    alphaTest: 0.025,
    depthWrite: false,
  })
}

/**
 * 透明窗櫺格 overlay（給 hero 的 Reflector 用）：真實鏡面反射透過「一格一格」
 * 顯示，而不是一整面大鏡子——窗櫺線 + 每格極淡明度差，拉近看得到細節。
 */
export const glassGridOverlay = (w, h) => {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')
  const S = 64 // 與 facade 同格距、同細線
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = `rgba(10,16,26,${(0.04 + Math.random() * 0.06).toFixed(3)})` // 每格差異要微
      ctx.fillRect(x * S, y * S, S, S)
    }
  }
  // Reflector 不能吃 normalMap；用「深色縫＋極窄側壁反光」做視差錯覺，
  // 遠看是內凹接縫而非一條亮色格線。
  for (let i = 0; i <= 8; i++) {
    const p = i * S
    ctx.fillStyle = 'rgba(2,4,8,0.92)'
    ctx.fillRect(p - 2, 0, 4, 512)
    ctx.fillRect(0, p - 2, 512, 4)
    ctx.fillStyle = 'rgba(105,126,150,0.18)'
    ctx.fillRect(p + 2, 0, 1, 512)
    ctx.fillRect(0, p + 2, 512, 1)
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(w / 8, h / 7.2) // 與 glassFacade 同格距（一格 ≈ 1.0×0.9）
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })
}

/** 建模 helper：加一個 box 到 parent */
export function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  m.rotation.y = ry
  parent.add(m)
  return m
}

/** 浮島基座：所有場景的共用地形元件 */
export function island(parent, w, d, x, y, z, colors = {}) {
  const g = new THREE.Group()
  box(g, w, 1.2, d, flat(colors.top ?? palette.islandTop), 0, -0.6, 0)
  box(g, w * 0.7, 1.6, d * 0.7, flat(colors.mid ?? palette.islandMid), 0, -1.9, 0)
  box(g, w * 0.35, 1.8, d * 0.35, flat(colors.deep ?? palette.islandDeep), 0, -3.4, 0)
  g.position.set(x, y, z)
  parent.add(g)
  return g
}

/** 釋放一整個 Group 的 geometry / material（lazy 卸載時用） */
export function disposeGroup(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach((m) => m.dispose())
    }
  })
}

/** 可重現的偽隨機（場景程序化生成用，seed 固定 → 每次 build 長一樣） */
export function seededRandom(seed = 7) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}
