import * as THREE from 'three'
import { box, emissive, flat, focus, island, seededRandom, standard } from '../flight/stage/materials.js'
import {
  DRONE_ARRIVAL_RANGE,
  DRONE_REVEAL_RANGE,
  journeyTimeline,
} from '../journey/timeline.js'
import { sampleDroneFlight } from './droneArrival.js'

const smoothstep = (edge0, edge1, value) => {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1)
  return t * t * (3 - 2 * t)
}

/** 第三幕：以無人機高空視角隱喻全端視野；它是視覺主題，不宣稱真實無人機專案。 */
export function buildDroneCity() {
  const g = new THREE.Group()
  const B = island(g, 34, 28, 122, -1.5, -78)
  const rnd = seededRandom(43)

  // 第三幕已進入冷灰藍晨光：提高抽象節點的可讀性，不再沿用第二幕的夜城照明。
  const daylight = new THREE.DirectionalLight(0xb8d8ef, 0.88)
  daylight.position.set(-14, 14, 10)
  daylight.target.position.set(2, 2, -3)
  B.add(daylight)
  B.add(daylight.target)
  B.add(new THREE.HemisphereLight(0xd1e5f4, 0x26384a, 0.52))

  box(B, 33, 0.08, 27, flat(0x0d1620), 0, 0.04, 0)
  // 不再畫成一般道路：窄背板匯流排把空間讀成系統拓樸，而不是第二座寫實城市。
  const bus = flat(0x172535)
  for (const x of [-10, -3.4, 3.4, 10]) box(B, 1.15, 0.05, 27, bus, x, 0.09, 0)
  for (const z of [-8.2, 0, 8.2]) box(B, 33, 0.05, 1.0, bus, 0, 0.1, z)

  const nodeMat = standard(0x40586e, { roughness: 0.5, metalness: 0.28 })
  const serviceMat = standard(0x344b61, { roughness: 0.42, metalness: 0.36 })
  const coreMat = standard(0x58758e, { emissive: 0x142b3e, emissiveIntensity: 0.12, roughness: 0.34, metalness: 0.42 })
  const nodeCap = emissive(0x4d8ba6, 0.18)

  // 多數是低矮服務／資料節點，刻意打破第二幕密集高樓的輪廓。
  for (let i = 0; i < 34; i++) {
    const x = -15 + rnd() * 30
    const z = -12 + rnd() * 24
    if ([-10, -3.4, 3.4, 10].some((r) => Math.abs(x - r) < 1.15)) continue
    if ([-8.2, 0, 8.2].some((r) => Math.abs(z - r) < 1.05)) continue
    const service = i % 5 === 0
    const w = service ? 2.2 + rnd() * 1.6 : 1.7 + rnd() * 2.4
    const d = service ? 2.0 + rnd() * 1.5 : 1.7 + rnd() * 2.3
    const h = service ? 2.2 + rnd() * 1.8 : 0.45 + rnd() * 1.05
    box(B, w, h, d, service ? serviceMat : nodeMat, x, h / 2, z)
    box(B, w * 0.56, 0.055, d * 0.56, nodeCap, x, h + 0.035, z)
  }

  // 少數核心高塔負責尺度與層級；亮頂代表關鍵服務，而非隨機窗戶。
  const cores = [
    [-9, 5.2, 6.2, 2.6, 2.6],
    [-2.2, -5.5, 8.4, 2.8, 2.5],
    [4.5, 3.4, 7.2, 3.0, 2.7],
    [10.2, -6.2, 5.8, 2.7, 2.6],
    [8.4, 9.2, 4.9, 2.5, 2.5],
  ]
  cores.forEach(([x, z, h, w, d]) => {
    box(B, w + 0.7, 0.14, d + 0.7, serviceMat, x, 0.16, z)
    box(B, w, h, d, coreMat, x, h / 2 + 0.2, z)
    box(B, w * 0.58, 0.08, d * 0.58, emissive(0x72b5ce, 0.3), x, h + 0.25, z)
  })

  const routeMat = emissive(0x20c8d8, 0.48, { transparent: true, opacity: 0.72 })
  const routes = [
    [[-13, 7, 9], [-7, 9, 3], [0, 11, -1], [8, 9, -7], [14, 8, -9]],
    [[-12, 10, -10], [-5, 12, -5], [2, 10, 2], [11, 12, 8]],
    [[-10, 6, 1], [-2, 8, 7], [6, 7, 5], [13, 9, 1]],
  ]
  routes.forEach((pts) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))
    B.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.035, 5, false), routeMat))
    for (let i = 0; i <= 8; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), emissive(0x7ff9ff, 0.8))
      dot.position.copy(curve.getPoint(i / 8))
      B.add(dot)
    }
  })

  const drones = []
  const makeDrone = (index, scale = 0.82 + (index % 3) * 0.08) => {
    const d = new THREE.Group()
    const shell = standard(0x9ba9b1, { roughness: 0.34, metalness: 0.58 })
    const dark = focus(0x17202a, { roughness: 0.3, metalness: 0.62 })
    const led = emissive(0x41f4d2, 0.85)
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 9), shell)
    core.scale.set(1.3, 0.48, 0.92)
    d.add(core)
    box(d, 1.1, 0.18, 0.68, dark, 0, -0.12, 0.1)
    for (const side of [-1, 1]) {
      box(d, 0.42, 0.32, 0.88, shell, side * 0.82, 0, 0)
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14), dark)
      fan.rotation.z = Math.PI / 2
      fan.position.set(side * 0.84, 0.02, -0.12)
      d.add(fan)
      box(d, 0.2, 0.12, 0.05, led, side * 0.82, 0.06, 0.47)
    }
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), led)
    lens.scale.set(1, 0.65, 0.45)
    lens.position.set(0, -0.04, -0.5)
    d.add(lens)
    d.scale.setScalar(scale)
    return d
  }
  // 左下角的大型無人機不先放進編隊；由第二幕飛來的 arrival drone 在轉場末端補上。
  const starts = [[-5, 11, -4], [1, 9, 1], [7, 11, -6], [11, 8, 7], [-8, 6, 0], [5, 7, 6]]
  starts.forEach((p, i) => {
    const d = makeDrone(i + 1)
    d.position.set(...p)
    d.rotation.y = -0.4 + i * 0.18
    d.userData.base = d.position.clone()
    d.userData.phase = i * 0.9
    B.add(d)
    drones.push(d)
  })

  const arrivalDrone = makeDrone(0, 1.2)
  arrivalDrone.visible = false
  arrivalDrone.userData.base = new THREE.Vector3(-10, 8, 8)
  arrivalDrone.userData.phase = 0
  arrivalDrone.userData.arrival = true
  arrivalDrone.userData.pathPoint = new THREE.Vector3()
  arrivalDrone.userData.pathTangent = new THREE.Vector3()
  B.add(arrivalDrone)
  drones.push(arrivalDrone)

  // 抽象系統脈絡 HUD：只作為 Portfolio 的視覺語言，不描述無人機職責。
  const hud = new THREE.Group()
  const panel = standard(0x102638, { transparent: true, opacity: 0.72, roughness: 0.24, metalness: 0.25 })
  box(hud, 5.2, 2.6, 0.08, panel, 0, 0, 0)
  for (let i = 0; i < 4; i++) {
    box(hud, 3.8 - i * 0.45, 0.09, 0.04, emissive(i === 3 ? 0xffa85c : 0x46d8df, 0.55), -0.25, 0.72 - i * 0.42, -0.07)
  }
  hud.position.set(-10.5, 13.5, -5)
  hud.rotation.y = 0.38
  B.add(hud)

  g.userData.drones = drones
  return g
}

export function updateDroneCity(group, t, _ctx, frame) {
  const [visibleFrom, visibleTo] = journeyTimeline.scenes.droneCity.visible
  group.visible = t >= visibleFrom && t <= visibleTo
  const time = frame?.elapsed ?? 0
  for (const drone of group.userData.drones || []) {
    if (drone.userData.arrival) {
      const [, end] = DRONE_ARRIVAL_RANGE
      const [revealStart] = DRONE_REVEAL_RANGE
      drone.visible = t >= revealStart

      if (t < end) {
        // 從第二幕下方升起直到第三幕歸位，全程只取樣同一條曲線，不在控制點煞停。
        sampleDroneFlight(t, drone.userData.pathPoint, drone.userData.pathTangent)
        drone.position.copy(drone.userData.pathPoint)
        drone.rotation.y = Math.atan2(-drone.userData.pathTangent.x, -drone.userData.pathTangent.z)
        drone.rotation.z = THREE.MathUtils.clamp(-drone.userData.pathTangent.x * 0.08, -0.08, 0.08)
      } else {
        // 到站後從精確終點逐漸接上編隊的微幅懸停，不在交界瞬間跳動。
        const hover = smoothstep(end, end + 0.02, t)
        drone.position.y = drone.userData.base.y + Math.sin(time * 1.35) * 0.22 * hover
        drone.position.x = drone.userData.base.x + Math.sin(time * 0.36) * 0.35 * hover
        drone.position.z = drone.userData.base.z
        drone.rotation.z = Math.sin(time * 0.8) * 0.035 * hover
      }
      continue
    }
    drone.position.y = drone.userData.base.y + Math.sin(time * 1.35 + drone.userData.phase) * 0.22
    drone.position.x = drone.userData.base.x + Math.sin(time * 0.36 + drone.userData.phase) * 0.35
    drone.rotation.z = Math.sin(time * 0.8 + drone.userData.phase) * 0.035
  }
}
