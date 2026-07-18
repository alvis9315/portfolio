import * as THREE from 'three'

/**
 * 第二幕 → 第三幕的同一台主角無人機。
 * 鏡頭與機體共用同一組具名節點，避免兩邊各自調整後失去追隨關係。
 */
export const DRONE_ARRIVAL_RANGE = [0.4, 0.5]

// 第二幕離場、玻璃大樓即將退出畫面時，才讓機體從畫面下方升起；
// 終點與正式追隨路徑的起點完全相同，因此不會憑空出現或跳位。
export const DRONE_REVEAL_RANGE = [0.368, DRONE_ARRIVAL_RANGE[0]]

// drone-city 浮島的 local space。終點就是原本左下角固定無人機的位置。
export const DRONE_ARRIVAL_LOCAL_PATH = [
  [-31.16, 10.02, 26.19],
  [-27.5, 9.8, 23.5],
  [-21, 9.4, 19.5],
  [-15.2, 8.9, 14],
  [-11.8, 8.4, 10],
  [-10, 8, 8],
]

// 這一小段必須跟第二幕離場鏡頭同步取樣，不能用等弧長曲線；否則曲線會在
// 中途繞到鏡頭後方，造成無人機直到第三幕才突然出現。各點依序位於畫面
// 下方、下緣、下半部與中央，形成從樓群下方鑽上來的連續動作。
export const DRONE_REVEAL_KEYS = [
  // 依第二幕原鏡頭的視錐重算：第一點在畫面下方，之後由下往上進場。
  // 交界點與鏡頭保持約 3.4 單位，延續附圖 1 的近距離機身大小。
  { t: 0.368, position: [-49.8, 4.8, 32.7] },
  { t: 0.374, position: [-44, 6.15, 32] },
  { t: 0.382, position: [-39, 8, 30] },
  { t: 0.391, position: [-34.5, 9.4, 27.8] },
  { t: DRONE_ARRIVAL_RANGE[0], position: DRONE_ARRIVAL_LOCAL_PATH[0] },
]

export const DRONE_FLIGHT_RANGE = [DRONE_REVEAL_RANGE[0], DRONE_ARRIVAL_RANGE[1]]
export const DRONE_CITY_ORIGIN = new THREE.Vector3(122, -1.5, -78)

// 每個控制點都綁定真實 global progress，特別是 0.40 必須精確落在
// 「由下往上出現完成」的交界點。若只把全部座標丟給 getPointAt，
// 曲線會依總弧長重新分配時間，令機體過了 0.40 仍繼續往上繞。
const DRONE_FLIGHT_KEYS = [
  ...DRONE_REVEAL_KEYS.map(({ t, position }) => ({ t, point: new THREE.Vector3(...position) })),
  ...DRONE_ARRIVAL_LOCAL_PATH.slice(1).map((position, index, points) => ({
    t: THREE.MathUtils.lerp(
      DRONE_ARRIVAL_RANGE[0],
      DRONE_ARRIVAL_RANGE[1],
      (index + 1) / points.length,
    ),
    point: new THREE.Vector3(...position),
  })),
]

// Hermite tangent 用相鄰 progress 計算：不在每個點 smoothstep 到零速，
// 只讓高度在 0.40 結束上升，以及整台機在編隊終點自然減速。
const DRONE_FLIGHT_TANGENTS = DRONE_FLIGHT_KEYS.map((key, index, keys) => {
  if (index === 0 || index === keys.length - 1) return new THREE.Vector3()
  const previous = keys[index - 1]
  const next = keys[index + 1]
  return new THREE.Vector3()
    .subVectors(next.point, previous.point)
    .divideScalar(next.t - previous.t)
})
const arrivalSeamIndex = DRONE_REVEAL_KEYS.length - 1
DRONE_FLIGHT_TANGENTS[arrivalSeamIndex].y = 0

/** 供機體與鏡頭共用的唯一取樣器；outPoint 是 drone-city island local space。 */
export function sampleDroneFlight(globalT, outPoint, outTangent) {
  const [start, end] = DRONE_FLIGHT_RANGE
  const raw = THREE.MathUtils.clamp((globalT - start) / (end - start), 0, 1)
  const t = THREE.MathUtils.lerp(start, end, raw)
  let keyIndex = DRONE_FLIGHT_KEYS.length - 2
  for (let index = 0; index < DRONE_FLIGHT_KEYS.length - 1; index++) {
    if (t <= DRONE_FLIGHT_KEYS[index + 1].t) {
      keyIndex = index
      break
    }
  }

  const from = DRONE_FLIGHT_KEYS[keyIndex]
  const to = DRONE_FLIGHT_KEYS[keyIndex + 1]
  const fromTangent = DRONE_FLIGHT_TANGENTS[keyIndex]
  const toTangent = DRONE_FLIGHT_TANGENTS[keyIndex + 1]
  const duration = to.t - from.t
  const u = THREE.MathUtils.clamp((t - from.t) / duration, 0, 1)
  const u2 = u * u
  const u3 = u2 * u

  outPoint.set(0, 0, 0)
    .addScaledVector(from.point, 2 * u3 - 3 * u2 + 1)
    .addScaledVector(fromTangent, (u3 - 2 * u2 + u) * duration)
    .addScaledVector(to.point, -2 * u3 + 3 * u2)
    .addScaledVector(toTangent, (u3 - u2) * duration)

  outTangent.set(0, 0, 0)
    .addScaledVector(from.point, 6 * u2 - 6 * u)
    .addScaledVector(fromTangent, (3 * u2 - 4 * u + 1) * duration)
    .addScaledVector(to.point, -6 * u2 + 6 * u)
    .addScaledVector(toTangent, (3 * u2 - 2 * u) * duration)
    .normalize()
  return raw
}

const smoothstep = (a, b, value) => {
  const t = THREE.MathUtils.clamp((value - a) / Math.max(b - a, 1e-6), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * 第二幕離場 → 第三幕的機載第一人稱鏡頭。
 * 鏡頭不是另一條獨立 spline，而是鎖在同一台無人機的後上方並沿切線看前方；
 * 先由第二幕外部鏡位看機體升起，再貼到機身後上方；實際機體持續佔住
 * 畫面下半部，而不是藏進鏡頭。全程不再切到額外的外部鏡位，抵達末段
 * 才直接接回第三幕既有定點。
 */
export function droneFirstPersonShot({ fromPos, fromLook, toPos, toLook }) {
  const startPos = new THREE.Vector3(...fromPos)
  const startLook = new THREE.Vector3(...fromLook)
  const endPos = new THREE.Vector3(...toPos)
  const endLook = new THREE.Vector3(...toLook)
  const localPoint = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const droneWorld = new THREE.Vector3()
  const cockpitPos = new THREE.Vector3()
  const cockpitLook = new THREE.Vector3()
  const seamPoint = new THREE.Vector3()
  const seamTangent = new THREE.Vector3()
  const seamDroneWorld = new THREE.Vector3()
  const followPos = new THREE.Vector3()
  const followLook = new THREE.Vector3()
  const startCameraOffset = new THREE.Vector3()
  const startLookOffset = new THREE.Vector3()

  sampleDroneFlight(DRONE_ARRIVAL_RANGE[0], seamPoint, seamTangent)
  seamDroneWorld.copy(seamPoint).add(DRONE_CITY_ORIGIN)
  startCameraOffset.copy(startPos).sub(seamDroneWorld)
  startLookOffset.copy(startLook).sub(seamDroneWorld)

  return {
    getPose(localT, pos, look) {
      const globalT = THREE.MathUtils.lerp(DRONE_ARRIVAL_RANGE[0], DRONE_ARRIVAL_RANGE[1], localT)
      sampleDroneFlight(globalT, localPoint, tangent)
      droneWorld.copy(localPoint).add(DRONE_CITY_ORIGIN)

      // Over-the-body 主觀鏡位：鏡頭在機身後上方，真正的主角機體會佔住
      // 畫面下半部。保留 1.35 單位距離避開 near plane，也不另外複製 HUD 假機身。
      cockpitPos.copy(droneWorld).addScaledVector(tangent, -1.35)
      cockpitPos.y += 0.66
      cockpitLook.copy(cockpitPos).addScaledVector(tangent, 10)
      cockpitLook.y -= 0.08

      // 先從既有第二幕 seam 接入主觀機位；這只發生一次，不在路徑節點反覆煞車。
      // Seam 起便讓既有側邊鏡位與無人機一起前進，再逐漸縮短相對距離進入主觀視角。
      // 若直接從固定 startPos 追趕移動中的 cockpitPos，畫面會先像被拉遠再突然追上。
      followPos.copy(droneWorld).add(startCameraOffset)
      followLook.copy(droneWorld).add(startLookOffset)
      const attach = smoothstep(0, 0.1, localT)
      pos.lerpVectors(followPos, cockpitPos, attach)
      look.lerpVectors(followLook, cockpitLook, attach)

      // 拉近後一路維持半機身主觀，不再先拉遠或繞回外部鏡位。
      // 最後一小段直接接回既有第三幕構圖，localT=1 仍與後續 seam 完全相同。
      const reveal = smoothstep(0.84, 1, localT)
      pos.lerp(endPos, reveal)
      look.lerp(endLook, reveal)
    },
  }
}
