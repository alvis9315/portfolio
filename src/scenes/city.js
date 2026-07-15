import * as THREE from 'three'
import { flat, glow, box, island, palette, seededRandom } from '../flight/stage/materials.js'

/**
 * 場景 02：城市（Projects）——真實內容整合的示範場景。
 * ctx.content.projects 的每一筆資料會長出一棟「地標樓」，
 * 樓高吃 project.height，樓的 userData 帶著 project 資料，
 * 之後要做 hover / click 顯示作品資訊，就從 userData 撈。
 * 其餘小樓是程序化生成的背景（seed 固定，每次長一樣）。
 */
export function buildCity(ctx = {}) {
  const projects = ctx.content?.projects || []
  const g = new THREE.Group()
  const B = island(g, 26, 20, 60, -2, -30)
  const colors = [palette.buildingA, palette.buildingB, palette.buildingC, palette.buildingD]
  const rnd = seededRandom(7)

  const addWindows = (bx, bz, bw, bd, bh) => {
    const rows = Math.floor(bh / 1.2)
    for (let r = 0; r < rows; r++) {
      if (rnd() < 0.4) continue
      box(B, bw * 0.5, 0.22, 0.02, glow(palette.warmGlow), bx, 0.9 + r * 1.2, bz + bd / 2 + 0.02)
    }
  }

  // 地標樓：一棟 = 一個 project（沿著飛行走廊兩側排）
  projects.forEach((p, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const bx = side * (3.5 + rnd() * 1.5)
    const bz = -6 + i * 4.5
    const bh = p.height || 6
    const b = box(B, 2.4, bh, 2.4, flat(colors[i % colors.length]), bx, bh / 2, bz)
    b.userData.project = p
    addWindows(bx, bz, 2.4, 2.4, bh)
    box(B, 0.6, 0.25, 0.06, glow(palette.screenGlow), bx, bh + 0.3, bz) // 樓頂識別燈
  })

  // 背景小樓：程序化填充
  for (let i = 0; i < 10; i++) {
    const bw = 1.6 + rnd() * 1.6, bd = 1.6 + rnd() * 1.6, bh = 2.5 + rnd() * 5
    const bx = (rnd() - 0.5) * 20, bz = (rnd() - 0.5) * 14
    if (Math.abs(bx) < 2.6) continue // 保留飛行走廊
    box(B, bw, bh, bd, flat(colors[i % 4]), bx, bh / 2, bz)
    addWindows(bx, bz, bw, bd, bh)
  }

  return g
}
