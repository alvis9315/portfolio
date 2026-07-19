import { composeShots } from '../flight/composeShots.js'
import { dollyIn, flyThrough, line } from '../flight/shots.js'
import { easeInOutCubic, easeInOutSine, easeOutCubic } from '../flight/easing.js'
import { droneFirstPersonShot } from '../scenes/droneArrival.js'
import { journeyTimeline } from './timeline.js'

/**
 * 六幕正式鏡頭編排。保持純資料模組，讓 App 與自動測試使用完全相同的 flight。
 */
export const journeyViews = Object.freeze({
  workbench: Object.freeze({ pos: [0, 2.7, 2.6], look: [0, 2.6, -0.5] }),
  citySkyline: Object.freeze({ pos: [90, 19, -4], look: [57, 4, -32] }),
  // 原始 city fly-through 在 t=.29 的精確 pose；拆段後仍維持附圖 2 構圖不變。
  cityBillboard: Object.freeze({
    pos: [66.59227029033701, 13.256981523359482, -22.829533344969896],
    look: [63.39016257681727, 11.01399357205337, -26.832792880591757],
  }),
  cityGlass: Object.freeze({ pos: [60.4, 6.8, -32.3], look: [60, 7.5, -34.2] }),
  cityDeparture: Object.freeze({ pos: [88, 8, -50], look: [110, 12, -64] }),
  drone: Object.freeze({ pos: [137, 22, -60], look: [122, 4, -78] }),
  command: Object.freeze({ pos: [169, 10, -93], look: [157, 4, -111] }),
  commandScreen: Object.freeze({ pos: [160, 6.2, -102], look: [158.8, 4.8, -120.1] }),
  commandDesk: Object.freeze({ pos: [164, 4.8, -105], look: [157.8, 1.9, -110] }),
  labData: Object.freeze({ pos: [185, 7.2, -134], look: [182, 4.2, -148] }),
  labStudio: Object.freeze({ pos: [205, 6.4, -134], look: [202.6, 3.2, -145.5] }),
  finalDetail: Object.freeze({ pos: [229.5, 4.1, -172.5], look: [230.3, 2.25, -178] }),
  finalScreen: Object.freeze({ pos: [232, 4.6, -173.2], look: [232, 3.1, -178.8] }),
  // 收尾回到桌面中軸正視；右側斜視會讓整張桌子與螢幕看起來歪斜。
  finalWide: Object.freeze({ pos: [232, 9.5, -164], look: [232, 2.5, -178] }),
})

const V = journeyViews

export const flight = composeShots([
  {
    shot: dollyIn({ from: [-20, 11, 30], to: V.workbench.pos, target: V.workbench.look }),
    range: journeyTimeline.shots.workbenchIntro,
    easing: easeOutCubic,
  },
  {
    shot: line({ fromPos: V.workbench.pos, toPos: V.citySkyline.pos, fromLook: V.workbench.look, toLook: V.citySkyline.look }),
    range: journeyTimeline.shots.workbenchToCity,
    easing: easeInOutSine,
  },
  {
    shot: flyThrough({
      path: [V.citySkyline.pos, [82, 18, -9.5], [74, 16, -16.5], V.cityBillboard.pos],
      // 目標保持在鏡頭前方並維持約 -20° 俯角，移除舊路徑 t≈.28 的 -32.6° 下頓。
      look: [V.citySkyline.look, [60, 6.5, -29.5], [61.5, 9, -28.5], V.cityBillboard.look],
      tension: 0.32,
    }),
    range: journeyTimeline.shots.cityFlyToBillboard,
    easing: easeInOutSine,
  },
  {
    shot: flyThrough({
      path: [V.cityBillboard.pos, [65, 11.8, -26], [64, 9.6, -29.5], [62.5, 7.8, -31.6], V.cityGlass.pos],
      look: [V.cityBillboard.look, [61.2, 10.7, -29], [60.3, 9.2, -31.5], [60.2, 8, -33.4], V.cityGlass.look],
      tension: 0.32,
    }),
    range: journeyTimeline.shots.cityBillboardToGlass,
    easing: easeInOutSine,
  },
  {
    shot: line({ fromPos: V.cityGlass.pos, toPos: V.cityDeparture.pos, fromLook: V.cityGlass.look, toLook: V.cityDeparture.look }),
    range: journeyTimeline.shots.cityDeparture,
    easing: easeInOutSine,
  },
  {
    shot: droneFirstPersonShot({
      fromPos: V.cityDeparture.pos,
      fromLook: V.cityDeparture.look,
      toPos: V.drone.pos,
      toLook: V.drone.look,
    }),
    range: journeyTimeline.shots.droneArrival,
  },
  {
    shot: line({ fromPos: V.drone.pos, toPos: V.command.pos, fromLook: V.drone.look, toLook: V.command.look }),
    range: journeyTimeline.shots.droneToCommand,
    easing: easeInOutCubic,
  },
  {
    shot: line({ fromPos: V.command.pos, toPos: V.commandScreen.pos, fromLook: V.command.look, toLook: V.commandScreen.look }),
    range: journeyTimeline.shots.commandScreen,
    easing: easeOutCubic,
  },
  {
    shot: line({ fromPos: V.commandScreen.pos, toPos: V.commandDesk.pos, fromLook: V.commandScreen.look, toLook: V.commandDesk.look }),
    range: journeyTimeline.shots.commandDesk,
    easing: easeInOutSine,
  },
  {
    shot: flyThrough({
      path: [V.commandDesk.pos, [171, 7, -118], [179, 8, -126], V.labData.pos],
      look: [V.commandDesk.look, [170, 4, -124], [179, 4, -136], V.labData.look],
    }),
    range: journeyTimeline.shots.commandToLab,
    easing: easeInOutCubic,
  },
  {
    shot: line({ fromPos: V.labData.pos, toPos: V.labStudio.pos, fromLook: V.labData.look, toLook: V.labStudio.look }),
    range: journeyTimeline.shots.labStudio,
    easing: easeInOutSine,
  },
  {
    shot: flyThrough({
      path: [V.labStudio.pos, [211, 8, -151], [220, 7, -162], V.finalDetail.pos],
      look: [V.labStudio.look, [205, 3, -151], [220, 3, -169], V.finalDetail.look],
    }),
    range: journeyTimeline.shots.labToFinal,
    easing: easeInOutCubic,
  },
  {
    shot: line({ fromPos: V.finalDetail.pos, toPos: V.finalScreen.pos, fromLook: V.finalDetail.look, toLook: V.finalScreen.look }),
    range: journeyTimeline.shots.finalScreen,
    easing: easeOutCubic,
  },
  {
    shot: line({ fromPos: V.finalScreen.pos, toPos: V.finalWide.pos, fromLook: V.finalScreen.look, toLook: V.finalWide.look }),
    range: journeyTimeline.shots.finalWide,
    easing: easeOutCubic,
  },
])
