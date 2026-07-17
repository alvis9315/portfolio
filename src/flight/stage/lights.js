import * as THREE from 'three'
import { palette } from './materials.js'

/**
 * 燈光氛圍層：每個 preset 負責 背景色 + fog + 燈 + 環境點綴，
 * 並回傳 cleanup 函數。氛圍原則：
 *  - fog 顏色永遠等於背景色（遠處物體才會「融進天空」而不是被切掉）
 *  - fog near/far 同時是效能工具：far 以外的東西可以不建（配合 lazy scenes）
 * 新增 preset：加一個同簽名的函數即可，FlightStage 以名字取用。
 */

function addStars(scene, { count = 400, centerX = 60, centerZ = -40 } = {}) {
  const geo = new THREE.BufferGeometry()
  const posArr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 160 + Math.random() * 60
    let x = r * Math.sin(phi) * Math.cos(theta)
    let y = Math.abs(r * Math.cos(phi)) * 0.8 + 8
    let z = r * Math.sin(phi) * Math.sin(theta)
    posArr.set([x + centerX, y, z + centerZ], i * 3)
  }
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: palette.star, size: 0.35, sizeAttenuation: true, transparent: true })
  )
  stars.name = 'journey-stars'
  scene.add(stars)
  return () => {
    scene.remove(stars)
    geo.dispose()
    stars.material.dispose()
  }
}

export const lightingPresets = {
  /** 暮色：PoC 的預設氛圍。冷色天光 + 暖色斜射 + 星空 */
  dusk(scene) {
    scene.background = new THREE.Color(0x0f1729)
    // far 收到 60：讓相鄰的島（相距 ~68）在還沒飛過去前被 fog 藏住，
    // 不會「第一幕還沒結束就看到第二幕」。到定格時（距 ~28）才清楚可見。
    scene.fog = new THREE.Fog(0x0f1729, 30, 60)
    const hemi = new THREE.HemisphereLight(0x7fb5a8, 0x1b2537, 0.85)
    const sun = new THREE.DirectionalLight(0xffe6c0, 0.7)
    hemi.name = 'journey-hemi'
    sun.name = 'journey-sun'
    sun.position.set(-30, 50, 20)
    scene.add(hemi, sun)
    const removeStars = addStars(scene)
    return () => {
      scene.remove(hemi, sun)
      removeStars()
    }
  },

  /** 深夜：更暗、fog 更近，窗燈與螢幕 glow 成為主角 */
  night(scene) {
    scene.background = new THREE.Color(0x080d18)
    scene.fog = new THREE.Fog(0x080d18, 20, 90)
    const hemi = new THREE.HemisphereLight(0x3a5a78, 0x0b1220, 0.55)
    const moonlight = new THREE.DirectionalLight(0xbcd0e4, 0.35)
    moonlight.position.set(40, 60, -20)
    scene.add(hemi, moonlight)
    const removeStars = addStars(scene, { count: 700 })
    return () => {
      scene.remove(hemi, moonlight)
      removeStars()
    }
  },

  /** 清晨：亮背景示範——證明氛圍是可抽換的，不是寫死的 */
  dawn(scene) {
    scene.background = new THREE.Color(0xdce8f2)
    scene.fog = new THREE.Fog(0xdce8f2, 35, 140)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8ba0b5, 0.9)
    const sun = new THREE.DirectionalLight(0xfff1d6, 0.9)
    sun.position.set(30, 40, 30)
    scene.add(hemi, sun)
    return () => scene.remove(hemi, sun)
  },
}
