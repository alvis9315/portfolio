/**
 * 全站敘事時間軸的唯一來源。
 *
 * 同一個 progress 區間可能同時影響 camera shot、scene load／visible 與 DOM caption；
 * 集中命名後，調整一幕時可以先看完整影響，不必在 App、content、scene 之間搜尋數字。
 */
const range = (start, end) => Object.freeze([start, end])
const scene = (load, visible = load) => Object.freeze({ load, visible })

export const DRONE_ARRIVAL_RANGE = range(0.4, 0.5)
export const DRONE_REVEAL_RANGE = range(0.368, DRONE_ARRIVAL_RANGE[0])
export const DRONE_FLIGHT_RANGE = range(DRONE_REVEAL_RANGE[0], DRONE_ARRIVAL_RANGE[1])

export const journeyTimeline = Object.freeze({
  shots: Object.freeze({
    workbenchIntro: range(0, 0.14),
    workbenchToCity: range(0.17, 0.23),
    cityFlyThrough: range(0.24, 0.32),
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
    hero: range(0, 0.075),
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
