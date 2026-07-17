import * as THREE from 'three'

/**
 * 第二幕 → 第三幕的同一台主角無人機。
 * 鏡頭與機體共用同一組具名節點，避免兩邊各自調整後失去追隨關係。
 */
export const DRONE_ARRIVAL_RANGE = [0.4, 0.5]

export const DRONE_ARRIVAL_CAMERA_PATH = [
  [88, 8, -50],
  [91, 8.8, -52],
  [98, 10.2, -56],
  [106, 12, -61],
  [118, 16, -63],
  [137, 22, -60],
]

export const DRONE_ARRIVAL_LOOK_PATH = [
  [110, 12, -64],
  [94, 9.4, -54.2],
  [101, 10.7, -58],
  [109, 11.5, -64],
  [116, 7, -72],
  [122, 4, -78],
]

// drone-city 浮島的 local space。終點就是原本左下角固定無人機的位置。
export const DRONE_ARRIVAL_LOCAL_PATH = [
  [-31.16, 10.02, 26.19],
  [-28, 10.9, 23.8],
  [-21, 12.2, 20],
  [-13, 13, 14],
  [-9, 10.5, 10],
  [-10, 8, 8],
]

export const DRONE_ARRIVAL_CURVE = new THREE.CatmullRomCurve3(
  DRONE_ARRIVAL_LOCAL_PATH.map((point) => new THREE.Vector3(...point)),
  false,
  'catmullrom',
  0.28,
)
