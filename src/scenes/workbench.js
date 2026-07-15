import * as THREE from 'three'
import { flat, glow, box, island, palette } from '../flight/stage/materials.js'

/**
 * 場景 01：工作桌（About）。
 * 場景是純函數：build(ctx) → Group。不碰 scene、不碰 camera。
 * 之後升級模型細節就在這裡動：加椅子、書堆、換 PBR 材質、或整組換成 GLTF。
 */
export function buildWorkbench() {
  const g = new THREE.Group()
  const A = island(g, 14, 12, 0, 0, 0)

  // 桌子
  box(A, 4.6, 0.25, 2.2, flat(palette.wood), 0, 1.6, 0)
  for (const [x, z] of [[-2, 0.8], [2, 0.8], [-2, -0.8], [2, -0.8]]) {
    box(A, 0.25, 1.6, 0.25, flat(palette.woodDark), x, 0.8, z)
  }

  // 螢幕（發光面是這個場景的視覺焦點，也是 dolly-in 的 target）
  box(A, 2.4, 1.5, 0.12, flat(palette.device), 0, 2.7, -0.5)
  box(A, 2.1, 1.2, 0.02, glow(palette.screenGlow), 0, 2.7, -0.43)
  box(A, 0.3, 0.7, 0.3, flat(palette.device), 0, 1.95, -0.5)
  box(A, 1.6, 0.08, 0.6, flat(palette.steel), 0, 1.77, 0.55)

  // 周邊小物
  box(A, 0.9, 0.9, 0.9, flat(palette.buildingA), -4.2, 0.45, 2.2, 0.4)
  box(A, 0.7, 1.4, 0.7, flat(palette.buildingB), 4.0, 0.7, -2.6, 0.3)
  box(A, 0.15, 1.1, 0.15, flat(palette.woodDark), -1.7, 2.25, -0.7)
  box(A, 0.5, 0.3, 0.5, glow(palette.warmGlow), -1.7, 2.9, -0.7)

  return g
}
