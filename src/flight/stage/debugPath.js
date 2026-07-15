import * as THREE from 'three'
import { disposeGroup } from './materials.js'

/**
 * Dev 路徑視覺化：把整條飛行取樣後畫成 Three.js 線條，調路徑時用眼睛看比算座標快。
 *
 * 畫四樣東西（顏色刻意避開 scene palette，讓 debug 疊在場景上仍醒目）：
 *   - flight path（青）：camera position 隨 t 的軌跡，含 gap 期間的 hold（會疊成一點）
 *   - look path（洋紅）：camera lookAt 目標隨 t 的軌跡
 *   - 視線連接線（灰）：每隔幾個取樣點，從 position 拉一條線到對應 look，看得出鏡頭朝向
 *   - seam 標記（黃）：每個 segment 的 range 端點各放一顆球。seam rule 成立時
 *     相鄰球會完全重疊；出現兩顆分開的球 = 該接縫有 gap，配合 console 的 seam 警告使用
 *
 * 只在 dev + ?debug 時由 FlightStage 掛載，production build 完全不含這條路徑。
 */

const COLOR = {
  flight: 0x00e5ff,
  look: 0xff3d81,
  connector: 0x94a3b8,
  seam: 0xffd54a,
}

function polyline(points, color, opts = {}) {
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, ...opts }))
}

function segments(pairs, color, opacity) {
  const geo = new THREE.BufferGeometry().setFromPoints(pairs)
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }))
}

function marker(p, color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), new THREE.MeshBasicMaterial({ color }))
  m.position.copy(p)
  return m
}

/**
 * @param flight  composeShots() 的回傳值
 * @param samples 整條飛行的取樣密度（越高線越平滑）
 * @param connectorEvery 每隔幾個取樣點畫一條視線連接線
 * @returns { group, dispose }
 */
export function createFlightDebug(flight, { samples = 240, connectorEvery = 12 } = {}) {
  const group = new THREE.Group()
  group.name = 'flight-debug'

  const pos = new THREE.Vector3()
  const look = new THREE.Vector3()
  const flightPts = []
  const lookPts = []
  const connectorPts = []

  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    flight.getPose(t, pos, look)
    flightPts.push(pos.clone())
    lookPts.push(look.clone())
    if (i % connectorEvery === 0) connectorPts.push(pos.clone(), look.clone())
  }

  group.add(polyline(flightPts, COLOR.flight))
  group.add(polyline(lookPts, COLOR.look))
  group.add(segments(connectorPts, COLOR.connector, 0.35))

  for (const seg of flight.segments || []) {
    for (const edge of seg.range) {
      flight.getPose(edge, pos, look)
      group.add(marker(pos, COLOR.seam))
    }
  }

  // eslint-disable-next-line no-console
  console.info(
    '%c[flight] debug path on%c  青=flight  洋紅=look  灰=視線  黃=seam（相鄰黃球分開 = 接縫有 gap）',
    'color:#00e5ff;font-weight:600', 'color:inherit'
  )

  return { group, dispose: () => disposeGroup(group) }
}
