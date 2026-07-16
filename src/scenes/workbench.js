import * as THREE from 'three'
import { flat, glow, focus, box, island, palette } from '../flight/stage/materials.js'

/**
 * 場景 01：工作桌（About / 開場）。
 * 刻意「乾淨」——只有電腦、鍵盤、檯燈、馬克杯，代表故事尚未展開；
 * 第 6 幕「升級後的桌面」會多出一堆代表經歷的物件成對比。
 *
 * 螢幕開場全暗，鏡頭拉近才漸亮（updateWorkbench 隨 progress 驅動）——
 * 敘事：你靠近這張桌子，故事的螢幕才亮起。
 */

const SCREEN_DARK = new THREE.Color(0x0a0f14)
// 全亮值刻意壓到 0.7 倍：低於 bloom threshold，光暈柔和不刺眼，
// 也給之後的螢幕輪播資訊留顯示空間（太亮會蓋掉內容）
const SCREEN_ON = new THREE.Color(palette.screenGlow).multiplyScalar(0.7)

export function buildWorkbench() {
  const g = new THREE.Group()
  const A = island(g, 14, 12, 0, 0, 0)

  // 桌子（桌面頂 ≈ y 1.72）
  box(A, 4.6, 0.25, 2.2, flat(palette.wood), 0, 1.6, 0)
  for (const [x, z] of [[-2, 0.8], [2, 0.8], [-2, -0.8], [2, -0.8]]) {
    box(A, 0.25, 1.6, 0.25, flat(palette.woodDark), x, 0.8, z)
  }

  // 螢幕：開場暗屏（材質存進 userData，由 updateWorkbench 漸亮）
  box(A, 2.4, 1.5, 0.12, focus(palette.device), 0, 2.7, -0.5)
  const screenMat = new THREE.MeshBasicMaterial({ color: SCREEN_DARK.clone() })
  box(A, 2.1, 1.2, 0.02, screenMat, 0, 2.7, -0.43)
  box(A, 0.3, 0.7, 0.3, focus(palette.device), 0, 1.95, -0.5) // 螢幕頸/座
  g.userData.screenMat = screenMat

  // 鍵盤：底板 + 一格格鍵帽
  box(A, 1.6, 0.06, 0.62, focus(palette.device), 0, 1.78, 0.6)
  const keyMat = flat(palette.steel)
  for (let r = 0; r < 4; r++) {
    if (r === 3) {
      box(A, 0.7, 0.05, 0.11, keyMat, 0, 1.82, 0.44 + r * 0.12) // 空白鍵
      continue
    }
    for (let c = 0; c < 11; c++) {
      box(A, 0.1, 0.05, 0.1, keyMat, -0.64 + c * 0.128, 1.82, 0.44 + r * 0.12)
    }
  }

  // 立燈：面對螢幕時在「螢幕左後方」的地板上（-x、-z），比桌面高很多，
  // 暖黃光從後左上方灑落桌面（Alvis 2026-07-16 定位）
  const lx = -3.2
  const lz = -2.2
  box(A, 0.64, 0.08, 0.64, focus(palette.steel), lx, 0.04, lz) // 底座（地板）
  box(A, 0.08, 4.2, 0.08, focus(palette.steel), lx, 2.14, lz) // 立柱（高過桌面 2.5+）
  // 燈罩：IKEA HEKTAR 式圓鐘罩（半球罩掛在斜臂上），開口朝螢幕/桌面方向（+x +z）
  const arm = box(A, 0.55, 0.06, 0.06, focus(palette.steel), lx + 0.22, 4.28, lz + 0.18)
  arm.rotation.y = -0.6
  arm.rotation.z = -0.25
  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
    focus(palette.steel)
  )
  shade.position.set(lx + 0.45, 4.12, lz + 0.38)
  shade.rotation.z = -0.8 // 罩口轉向 +x（螢幕方向）
  shade.rotation.x = 0.45 // 再往 +z（桌面）傾
  A.add(shade)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glow(palette.warmGlow))
  bulb.position.set(lx + 0.58, 4.0, lz + 0.5) // 罩口內的燈泡
  A.add(bulb)
  // 聚光朝螢幕/桌面（照耀面向螢幕那邊）+ 小點光當環境暈
  const spot = new THREE.SpotLight(palette.warmGlow, 20, 15, 0.6, 0.5, 1.5)
  spot.position.set(lx + 0.58, 4.0, lz + 0.5)
  spot.target.position.set(0, 1.9, -0.4) // 對準螢幕/桌面
  A.add(spot)
  A.add(spot.target)
  const lampLight = new THREE.PointLight(palette.warmGlow, 6, 10, 1.7)
  lampLight.position.set(lx + 0.55, 4.0, lz + 0.45)
  A.add(lampLight)

  // 馬克杯（乾淨桌面唯一點綴）
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.34, 12), flat(palette.woodDark))
  mug.position.set(1.5, 1.9, 0.35)
  A.add(mug)

  return g
}

/** 隨 progress 讓螢幕漸亮：遠處全暗 → dolly-in 拉近途中漸層亮起（0.1–0.3）。 */
export function updateWorkbench(group, t) {
  const m = group.userData.screenMat
  if (!m) return
  const k = THREE.MathUtils.clamp((t - 0.1) / 0.2, 0, 1)
  m.color.copy(SCREEN_DARK).lerp(SCREEN_ON, k)
}
