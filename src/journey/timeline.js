/**
 * 全站敘事時間軸的唯一來源。
 *
 * 同一個 progress 區間可能同時影響 camera shot、scene load／visible 與 DOM caption；
 * 集中命名後，調整一幕時可以先看完整影響，不必在 App、content、scene 之間搜尋數字。
 */
const range = (start, end) => Object.freeze([start, end])
const scene = (load, visible = load) => Object.freeze({ load, visible })
const station = (id, progress, chapter, rearmDelay) => Object.freeze({
  id,
  progress,
  chapter,
  ...(rearmDelay === undefined ? {} : { rearmDelay }),
})
const stationTransition = (duration, keyframes, easing = 'linear') => Object.freeze({
  duration,
  easing,
  keyframes: Object.freeze(keyframes.map(([at, progress]) => Object.freeze({ at, progress }))),
})

export const DRONE_ARRIVAL_RANGE = range(0.4, 0.5)
export const DRONE_REVEAL_RANGE = range(0.368, DRONE_ARRIVAL_RANGE[0])
export const DRONE_FLIGHT_RANGE = range(DRONE_REVEAL_RANGE[0], DRONE_ARRIVAL_RANGE[1])

/**
 * 第一到第三幕的隱藏敘事中繼站。
 *
 * station.progress 是停靠構圖；transitions[n] 負責 stations[n] ↔ stations[n + 1]。
 * keyframes 將既有 shot 之間的閱讀 hold 壓縮到合理比例，避免固定時間播放時
 * 長時間不動、最後才突然趕路。反向播放會使用同一組 keyframes 倒放。
 */
export const journeyStations = Object.freeze({
  rearmDelay: 420,
  points: Object.freeze([
    station('hero-start', 0, 'about'),
    station('workbench-wide', 0.06, 'about'),
    station('workbench-detail', 0.14, 'about'),
    // 0.23–0.24 是同一個 skyline pose；停在 shot 起點 0.24 可避免下一段先 hold 再起步。
    station('city-overview', 0.24, 'projects'),
    station('city-billboard', 0.29, 'projects'),
    station('city-glass', 0.32, 'projects'),
    station('drone-cockpit', 0.42, 'drone-ops'),
    // 最終俯瞰至少停留一秒，讓第三幕標題可讀後才允許進入第四幕。
    station('drone-overview', 0.5, 'drone-ops', 1000),
  ]),
  transitions: Object.freeze([
    stationTransition(2200, [[0, 0], [1, 0.06]], 'easeInOutSine'),
    stationTransition(2400, [[0, 0.06], [1, 0.14]], 'easeInOutSine'),
    // 兩端的短 hold 用於字幕淡出與抵達 settle；實際跨城 line 約播放 3.5 秒。
    stationTransition(4300, [[0, 0.14], [0.1, 0.17], [0.92, 0.23], [1, 0.24]]),
    stationTransition(2800, [[0, 0.24], [1, 0.29]]),
    stationTransition(2200, [[0, 0.29], [1, 0.32]]),
    stationTransition(2800, [[0, 0.32], [0.15, 0.37], [0.55, 0.4], [1, 0.42]]),
    stationTransition(2400, [[0, 0.42], [1, 0.5]]),
  ]),
})

export const journeyTimeline = Object.freeze({
  shots: Object.freeze({
    workbenchIntro: range(0, 0.14),
    workbenchToCity: range(0.17, 0.23),
    cityFlyToBillboard: range(0.24, 0.29),
    cityBillboardToGlass: range(0.29, 0.32),
    cityDeparture: range(0.37, 0.4),
    droneArrival: DRONE_ARRIVAL_RANGE,
    droneToCommand: range(0.53, 0.56),
    commandScreen: range(0.58, 0.61),
    commandDesk: range(0.63, 0.66),
    commandToLab: range(0.68, 0.72),
    labStudio: range(0.74, 0.8),
    labToFinal: range(0.82, 0.87),
    finalScreen: range(0.89, 0.93),
    finalWide: range(0.95, 1),
  }),
  scenes: Object.freeze({
    workbench: scene(range(0, 0.19)),
    city: scene(range(0.15, 0.42), range(0.16, 0.42)),
    droneCity: scene(range(0.38, 0.59), range(DRONE_REVEAL_RANGE[0], 0.59)),
    commandRoom: scene(range(0.54, 0.73), range(0.55, 0.73)),
    creativeLab: scene(range(0.69, 0.88), range(0.7, 0.88)),
    finalDesk: scene(range(0.85, 1), range(0.86, 1)),
  }),
  captions: Object.freeze({
    hero: range(0, 0.06),
    about: range(0.08, 0.17),
    projects: range(0.32, 0.375),
    droneOps: range(0.5, 0.53),
    delivery: range(0.56, 0.67),
    aiLab: range(0.72, 0.84),
    contact: range(0.965, 1),
  }),
  ui: Object.freeze({
    projectCard: range(0.16, 0.38),
  }),
})
