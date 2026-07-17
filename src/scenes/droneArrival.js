import * as THREE from 'three'

/**
 * 第二幕 → 第三幕的同一台主角無人機。
 * 機體與追隨鏡頭共用同一條曲線；鏡頭永遠留在機尾後上方，不會繞到正面。
 */
export const DRONE_ARRIVAL_RANGE = [0.4, 0.5]
export const DRONE_REVEAL_RANGE = [0.392, DRONE_ARRIVAL_RANGE[0]]

export const DRONE_CITY_OFFSET = new THREE.Vector3(122, -1.5, -78)
export const DRONE_ARRIVAL_END_POSE = {
  pos: [100.5, 18, -57],
  look: [112, 6.5, -70],
}

// drone-city 浮島的 local space。單向前進，終點是原本左下角編隊的空位。
export const DRONE_ARRIVAL_LOCAL_PATH = [
  [-29.6, 8.1, 23.2],
  [-25.2, 8.9, 19.2],
  [-20.2, 9.6, 15.1],
  [-15.2, 9.5, 11.2],
  [-11.6, 8.8, 8.8],
  [-10, 8, 8],
]

// 大樓幾乎離開畫面後才從上方俯衝進場；最後一點精確接上正式飛行。
export const DRONE_REVEAL_KEYS = [
  { t: 0.392, position: [-34.8, 17.2, 27.8] },
  { t: 0.395, position: [-32.7, 13.9, 26.1] },
  { t: 0.398, position: [-30.9, 10.5, 24.2] },
  { t: DRONE_ARRIVAL_RANGE[0], position: DRONE_ARRIVAL_LOCAL_PATH[0] },
]

export const DRONE_ARRIVAL_CURVE = new THREE.CatmullRomCurve3(
  DRONE_ARRIVAL_LOCAL_PATH.map((point) => new THREE.Vector3(...point)),
  false,
  'catmullrom',
  0.24,
)

const smoothstep = (edge0, edge1, value) => {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * 安全的第三人稱追飛鏡頭：
 * - 起點沿用第二幕離場 pose，接縫不跳。
 * - 中段依機體切線計算機尾後上方位置，畫面自然具有向前速度感。
 * - 尾段只向後上方拉開看著歸位，不穿越機體、也不回頭 180 度。
 */
export function createDroneArrivalShot({ fromPos, fromLook }) {
  const startPos = new THREE.Vector3(...fromPos)
  const startLook = new THREE.Vector3(...fromLook)
  const endPos = new THREE.Vector3(...DRONE_ARRIVAL_END_POSE.pos)
  const endLook = new THREE.Vector3(...DRONE_ARRIVAL_END_POSE.look)
  const dronePoint = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const chasePos = new THREE.Vector3()
  const chaseLook = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)

  return {
    getPose(t, pos, look) {
      DRONE_ARRIVAL_CURVE.getPointAt(t, dronePoint)
      DRONE_ARRIVAL_CURVE.getTangentAt(t, tangent).normalize()
      dronePoint.add(DRONE_CITY_OFFSET)

      // 6.4 單位的跟拍距離足以避開 1.2 倍機體與發光鏡頭，仍看得到機身下緣。
      chasePos.copy(dronePoint).addScaledVector(tangent, -6.4).addScaledVector(up, 1.45)
      chaseLook.copy(dronePoint).addScaledVector(tangent, 9).addScaledVector(up, 0.35)

      const attach = smoothstep(0, 0.12, t)
      pos.lerpVectors(startPos, chasePos, attach)
      look.lerpVectors(startLook, chaseLook, attach)

      // 接近編隊後逐漸升高拉遠，完整看見主角機補進空位；鏡頭始終留在其後方。
      const reveal = smoothstep(0.7, 1, t)
      pos.lerp(endPos, reveal)
      look.lerp(endLook, reveal)
    },
  }
}
