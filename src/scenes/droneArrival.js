import * as THREE from 'three'

/**
 * 第二幕 → 第三幕的同一台主角無人機。
 * 鏡頭與機體共用同一組具名節點，避免兩邊各自調整後失去追隨關係。
 */
export const DRONE_ARRIVAL_RANGE = [0.4, 0.5]

// 第二幕離場、玻璃大樓即將退出畫面時，才讓機體從畫面下方升起；
// 終點與正式追隨路徑的起點完全相同，因此不會憑空出現或跳位。
export const DRONE_REVEAL_RANGE = [0.388, DRONE_ARRIVAL_RANGE[0]]

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
  [-27.5, 10.9, 23.5],
  [-21, 12.2, 19.5],
  [-15.2, 12.4, 14],
  [-11.8, 10.2, 10],
  [-10, 8, 8],
]

// 這一小段必須跟第二幕離場鏡頭同步取樣，不能用等弧長曲線；否則曲線會在
// 中途繞到鏡頭後方，造成無人機直到第三幕才突然出現。各點依序位於畫面
// 下方、下緣、下半部與中央，形成從樓群下方鑽上來的連續動作。
export const DRONE_REVEAL_KEYS = [
  { t: 0.388, position: [-53.79, 6.24, 38.95] },
  { t: 0.392, position: [-45.51, 7.81, 34.94] },
  { t: 0.396, position: [-35.14, 9.2, 28.68] },
  { t: DRONE_ARRIVAL_RANGE[0], position: DRONE_ARRIVAL_LOCAL_PATH[0] },
]

export const DRONE_ARRIVAL_CURVE = new THREE.CatmullRomCurve3(
  DRONE_ARRIVAL_LOCAL_PATH.map((point) => new THREE.Vector3(...point)),
  false,
  'centripetal',
)
