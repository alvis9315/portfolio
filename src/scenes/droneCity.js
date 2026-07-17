import * as THREE from 'three'
import { box, emissive, flat, focus, island, seededRandom, standard } from '../flight/stage/materials.js'

/** 第三幕：以無人機高空視角隱喻全端視野；它是視覺主題，不宣稱真實無人機專案。 */
export function buildDroneCity() {
  const g = new THREE.Group()
  const B = island(g, 34, 28, 122, -1.5, -78)
  const rnd = seededRandom(43)

  box(B, 33, 0.08, 27, flat(0x0d1620), 0, 0.04, 0)
  const road = flat(0x121d29)
  for (const x of [-10, -3.4, 3.4, 10]) box(B, 2.1, 0.05, 27, road, x, 0.09, 0)
  for (const z of [-8.2, 0, 8.2]) box(B, 33, 0.05, 1.8, road, 0, 0.1, z)

  const buildingMats = [standard(0x1a2b3b, { roughness: 0.36, metalness: 0.5 }), standard(0x25384a, { roughness: 0.42, metalness: 0.38 })]
  for (let i = 0; i < 58; i++) {
    const x = -15 + rnd() * 30
    const z = -12 + rnd() * 24
    if ([-10, -3.4, 3.4, 10].some((r) => Math.abs(x - r) < 1.6)) continue
    if ([-8.2, 0, 8.2].some((r) => Math.abs(z - r) < 1.5)) continue
    const w = 1.2 + rnd() * 2.2
    const d = 1.2 + rnd() * 2.2
    const h = 1.8 + rnd() * 7
    box(B, w, h, d, buildingMats[i % 2], x, h / 2, z)
    if (rnd() > 0.62) box(B, w * 0.5, 0.05, d * 0.5, emissive(0x4d7896, 0.16), x, h + 0.04, z)
  }

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
  const makeDrone = (index) => {
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
    d.scale.setScalar(index === 0 ? 1.2 : 0.82 + (index % 3) * 0.08)
    return d
  }
  const starts = [[-10, 8, 8], [-5, 11, -4], [1, 9, 1], [7, 11, -6], [11, 8, 7], [-8, 6, 0], [5, 7, 6]]
  starts.forEach((p, i) => {
    const d = makeDrone(i)
    d.position.set(...p)
    d.rotation.y = -0.4 + i * 0.18
    d.userData.base = d.position.clone()
    d.userData.phase = i * 0.9
    B.add(d)
    drones.push(d)
  })

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

export function updateDroneCity(group, t) {
  group.visible = t >= 0.37 && t <= 0.59
  const time = performance.now() * 0.001
  for (const drone of group.userData.drones || []) {
    drone.position.y = drone.userData.base.y + Math.sin(time * 1.35 + drone.userData.phase) * 0.22
    drone.position.x = drone.userData.base.x + Math.sin(time * 0.36 + drone.userData.phase) * 0.35
    drone.rotation.z = Math.sin(time * 0.8 + drone.userData.phase) * 0.035
  }
}
