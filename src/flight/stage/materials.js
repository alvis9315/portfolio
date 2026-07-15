import * as THREE from 'three'

/**
 * 材質層：palette token + 三個等級的材質 preset。
 * 升級路徑（見 ARCHITECTURE.md「模型細節與材質」）：
 *   flat (Lambert) → standard (PBR) → 貼圖 / GLTF 匯入模型。
 * 場景程式碼一律透過這裡拿材質，換風格時只改這一個檔。
 */

export const palette = {
  islandTop: 0x2f4550,
  islandMid: 0x24333d,
  islandDeep: 0x1c2833,
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
