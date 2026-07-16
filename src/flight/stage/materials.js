import * as THREE from 'three'

/**
 * 材質層：palette token + 三個等級的材質 preset。
 * 升級路徑（見 ARCHITECTURE.md「模型細節與材質」）：
 *   flat (Lambert) → standard (PBR) → 貼圖 / GLTF 匯入模型。
 * 場景程式碼一律透過這裡拿材質，換風格時只改這一個檔。
 */

export const palette = {
  // 島/地面：深板岩灰藍（原本綠色被嫌醜，2026-07-16 改）
  islandTop: 0x262d3a,
  islandMid: 0x1d2431,
  islandDeep: 0x161c27,
  wood: 0x6b5a44,
  woodDark: 0x4a3f31,
  device: 0x1c2530,
  steel: 0x2c3a48,
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
export const glow = (c) => new THREE.MeshBasicMaterial({ color: c })

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

/**
 * 玻璃鏡面材質（Spider-Man PS5 曼哈頓風）：高 metalness + 低 roughness，
 * 靠 scene.environment（見 stage/environment.js）反射夜空與城市輝光出玻璃感。
 * 一定要有 scene.environment，否則金屬面會是死黑。
 */
export const glass = (c, opts = {}) =>
  new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.16, envMapIntensity: 1.8, ...opts })

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
      const v = 24 + Math.random() * 7 // 每格明度差要「微」——太大會像壞掉的拼布
      cctx.fillStyle = `rgb(${(v * 0.55) | 0},${(v * 0.8) | 0},${(v * 1.15) | 0})`
      cctx.fillRect(x * S, y * S, S, S)
      rctx.fillStyle = 'rgb(18,18,18)' // 面板：近鏡面
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
  grid(cctx, 'rgba(140,160,185,0.55)')
  grid(rctx, 'rgb(215,215,215)') // 窗櫺：霧面
  grid(nctx, 'rgb(128,128,255)') // 窗櫺：無傾斜
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
    normalScale: new THREE.Vector2(0.6, 0.6),
    metalness: 0.93,
    envMapIntensity: 2.6,
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
    const g = ctx.createLinearGradient(0, 0, 0, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)') // 天花板燈：頂部最亮
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)')
    g.addColorStop(1, 'rgba(255,255,255,0.1)') // 往地板漸暗
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 64)
    ceilTexCache = new THREE.CanvasTexture(c)
  }
  return new THREE.MeshBasicMaterial({
    map: ceilTexCache,
    transparent: true,
    color: warm ? 0xffd9a0 : 0xcfe2ff,
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
  ctx.strokeStyle = 'rgba(24,32,44,0.9)'
  ctx.lineWidth = 2
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * S, 0); ctx.lineTo(i * S, 512); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * S); ctx.lineTo(512, i * S); ctx.stroke()
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
export function island(parent, w, d, x, y, z) {
  const g = new THREE.Group()
  box(g, w, 1.2, d, flat(palette.islandTop), 0, -0.6, 0)
  box(g, w * 0.7, 1.6, d * 0.7, flat(palette.islandMid), 0, -1.9, 0)
  box(g, w * 0.35, 1.8, d * 0.35, flat(palette.islandDeep), 0, -3.4, 0)
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
