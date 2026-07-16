<script setup>
import { ref } from 'vue'
import { useScrollFlight } from './flight/useScrollFlight.js'
import { composeShots } from './flight/composeShots.js'
import { dollyIn, line } from './flight/shots.js'
import { easeInOutCubic, easeInOutSine, easeOutCubic } from './flight/easing.js'
import FlightStage from './flight/FlightStage.vue'
import FlightCaption from './flight/FlightCaption.vue'
import ProjectCard from './ui/ProjectCard.vue'
import { buildWorkbench, updateWorkbench } from './scenes/workbench.js'
import { buildCity, updateCity } from './scenes/city.js'
import { buildDroneCity, updateDroneCity } from './scenes/droneCity.js'
import { buildCommandRoom, updateCommandRoom } from './scenes/commandRoom.js'
import { buildCreativeLab, updateCreativeLab } from './scenes/creativeLab.js'
import { buildFinalDesk, updateFinalDesk } from './scenes/finalDesk.js'
import { site } from './content/site-content.js'

/* ── 1. 驅動層 ─────────────────────────────────────────── */
const ctl = useScrollFlight({ damping: 0.08 })

/* 點擊城市地標樓選中的作品（FlightStage @select 丟出，ProjectCard 顯示）。
 * 城市場景的可見 t 區間 = flyThrough 段，卡片離開此區間自動淡出。 */
const activeProject = ref(null)
const CITY_RANGE = [0.16, 0.38]

/* ── 2 + 3. Shot 層 + 編排層 ───────────────────────────────
 * 城市是「兩拍式」（參考 Spider-Man PS5）：
 *   拍 1 CITY_SKYLINE：大樓林立的遠景 hold（0.50–0.56）
 *   拍 2 CITY_GLASS：突然拉超近貼 hero 玻璃帷幕，整面玻璃映射對面
 *     大型霓虹看板（作品）——hold（0.63–0.72）給閱讀/點選。
 * 其餘 gap = 鏡頭 hold。接縫全部走常數（seam rule）。 */
const SEAM_1 = { pos: [0, 2.7, 2.6], look: [0, 2.6, -0.5] }        // 桌前
const CITY_SKYLINE = { pos: [90, 19, -4], look: [57, 4, -32] }     // 拍 1：東北高空俯瞰，大樓林立的廣角遠景
const CITY_GLASS = { pos: [60.4, 6.8, -32.3], look: [60, 7.5, -34.2] } // 拍 2：窄巷內貼玻璃帷幕（反射對街看板）
const SEAM_2 = { pos: [88, 8, -50], look: [110, 12, -64] }         // 城市離場
const DRONE_VIEW = { pos: [137, 22, -60], look: [122, 4, -78] }
const COMMAND_VIEW = { pos: [169, 10, -93], look: [157, 4, -111] }
const LAB_VIEW = { pos: [206, 11, -125], look: [194, 4, -144] }
const FINAL_CLOSE = { pos: [236, 7, -169], look: [232, 2.4, -178] }
const FINAL_WIDE = { pos: [242, 10.5, -164], look: FINAL_CLOSE.look }

const flight = composeShots([
  {
    // 招牌 dolly-in 直逼螢幕，收尾減速「停穩」（螢幕也在這段漸亮）
    shot: dollyIn({ from: [-20, 11, 30], to: SEAM_1.pos, target: SEAM_1.look }),
    range: [0.0, 0.14],
    easing: easeOutCubic,
  },
  {
    // 書桌 → 城市天際線：直線滑移（純 lerp 最順，無樣條 overshoot）
    shot: line({ fromPos: SEAM_1.pos, toPos: CITY_SKYLINE.pos, fromLook: SEAM_1.look, toLook: CITY_SKYLINE.look }),
    range: [0.17, 0.23],
    easing: easeInOutSine,
  },
  {
    // 拍 1 hold 後「突然拉超近」貼玻璃帷幕（range 短 = 體感快）
    shot: line({ fromPos: CITY_SKYLINE.pos, toPos: CITY_GLASS.pos, fromLook: CITY_SKYLINE.look, toLook: CITY_GLASS.look }),
    range: [0.25, 0.28],
    easing: easeInOutCubic,
  },
  {
    // 拍 2 hold 後離場：滑向城市邊緣 SEAM_2
    shot: line({ fromPos: CITY_GLASS.pos, toPos: SEAM_2.pos, fromLook: CITY_GLASS.look, toLook: SEAM_2.look }),
    range: [0.31, 0.35],
    easing: easeInOutSine,
  },
  {
    shot: line({ fromPos: SEAM_2.pos, toPos: DRONE_VIEW.pos, fromLook: SEAM_2.look, toLook: DRONE_VIEW.look }),
    range: [0.37, 0.43], easing: easeInOutSine,
  },
  {
    shot: line({ fromPos: DRONE_VIEW.pos, toPos: COMMAND_VIEW.pos, fromLook: DRONE_VIEW.look, toLook: COMMAND_VIEW.look }),
    range: [0.51, 0.57], easing: easeInOutCubic,
  },
  {
    shot: line({ fromPos: COMMAND_VIEW.pos, toPos: LAB_VIEW.pos, fromLook: COMMAND_VIEW.look, toLook: LAB_VIEW.look }),
    range: [0.66, 0.72], easing: easeInOutSine,
  },
  {
    shot: line({ fromPos: LAB_VIEW.pos, toPos: FINAL_CLOSE.pos, fromLook: LAB_VIEW.look, toLook: FINAL_CLOSE.look }),
    range: [0.83, 0.9], easing: easeInOutCubic,
  },
  {
    // 回到升級桌面後安靜拉遠，讓物件依旅程順序亮起。
    shot: line({ fromPos: FINAL_CLOSE.pos, toPos: FINAL_WIDE.pos, fromLook: FINAL_CLOSE.look, toLook: FINAL_WIDE.look }),
    range: [0.9, 1.0], easing: easeOutCubic,
  },
])

/* ── 場景 registry（lazy 建構）────────────────────────── */
const scenes = [
  { id: 'workbench', range: [0.0, 0.19], build: () => buildWorkbench(), update: updateWorkbench },
  { id: 'city', range: [0.15, 0.39], build: (ctx) => buildCity(ctx), update: updateCity },
  { id: 'drone-city', range: [0.36, 0.59], build: () => buildDroneCity(), update: updateDroneCity },
  { id: 'command-room', range: [0.54, 0.73], build: () => buildCommandRoom(), update: updateCommandRoom },
  { id: 'creative-lab', range: [0.69, 0.88], build: () => buildCreativeLab(), update: updateCreativeLab },
  { id: 'final-desk', range: [0.85, 1.0], build: () => buildFinalDesk(), update: updateFinalDesk },
]
</script>

<template>
  <!-- 捲動空間：總長決定整段飛行的「膠卷長度」，越長節奏越慢 -->
  <div style="height: 640vh"></div>

  <!-- 3D 舞台 -->
  <FlightStage
    :flight="flight"
    :scenes="scenes"
    :progress="ctl.progress"
    :context="{ content: site }"
    lighting="dusk"
    @select="activeProject = $event"
  />

  <!-- 作品卡：UI 層，疊在舞台外，吃 @select 事件 + 綁 progress 區間 -->
  <ProjectCard
    :project="activeProject"
    :progress="ctl.progress"
    :range="CITY_RANGE"
    @close="activeProject = null"
  />

  <!-- ── 4. UI 層：data-driven，全部吃 site-content ── -->
  <FlightCaption
    v-for="s in site.sections"
    :key="s.id"
    :progress="ctl.progress"
    :range="s.range"
    :style="s.position"
  >
    <div class="eyebrow">{{ s.eyebrow }}</div>
    <h2>{{ s.title }}</h2>
    <p>{{ s.body }}</p>
    <a v-if="s.link" class="caption-link" :href="s.link.url" target="_blank" rel="noopener noreferrer">
      {{ s.link.label }} ↗
    </a>
  </FlightCaption>

  <!-- 飛行進度軌：直接綁 progress 的另一個 UI 範例 -->
  <div class="rail">
    <div v-for="s in site.sections.slice(1)" :key="s.id" class="stop"
      :style="{ top: ((s.range[0] + s.range[1]) / 2) * 100 + '%' }" />
    <div class="craft" :style="{ top: ctl.progress.value * 100 + '%' }" />
  </div>

  <div class="hint" :style="{ opacity: Math.max(0, 1 - ctl.progress.value / 0.03) }">SCROLL ↓</div>
</template>

<style scoped>
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.28em;
  color: var(--accent);
  text-transform: uppercase;
  margin-bottom: 10px;
}
h2 {
  font-weight: 600;
  line-height: 1.25;
  font-size: clamp(22px, 4vw, 38px);
}
p {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.9;
  color: var(--dim);
}
.caption-link {
  display: inline-block;
  margin-top: 14px;
  color: var(--accent);
  font: 600 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.08em;
  text-decoration: none;
}
.caption-link:hover { text-decoration: underline; }
.rail {
  position: fixed;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  height: 38vh;
  width: 1px;
  background: rgba(232, 238, 245, 0.18);
}
.stop {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(232, 238, 245, 0.35);
}
.craft {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: 7px;
  height: 7px;
  background: var(--accent);
}
.hint {
  position: fixed;
  left: 50%;
  bottom: calc(28px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  font-size: 11px;
  letter-spacing: 0.3em;
  color: var(--dim);
}
@media (max-width: 640px) {
  .rail { right: 12px; }
  :global(.flight-caption) {
    left: 24px !important;
    right: 32px !important;
    width: auto;
    max-width: none;
    text-align: left !important;
  }
  h2 {
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  p {
    max-width: 100%;
  }
}
</style>
