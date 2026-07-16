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
import { buildCity } from './scenes/city.js'
import { buildMountains } from './scenes/mountains.js'
import { site } from './content/site-content.js'

/* ── 1. 驅動層 ─────────────────────────────────────────── */
const ctl = useScrollFlight({ damping: 0.08 })

/* 點擊城市地標樓選中的作品（FlightStage @select 丟出，ProjectCard 顯示）。
 * 城市場景的可見 t 區間 = flyThrough 段，卡片離開此區間自動淡出。 */
const activeProject = ref(null)
const CITY_RANGE = [0.34, 0.8]

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

const flight = composeShots([
  {
    // 招牌 dolly-in 直逼螢幕，收尾減速「停穩」（螢幕也在這段漸亮）
    shot: dollyIn({ from: [-20, 11, 30], to: SEAM_1.pos, target: SEAM_1.look }),
    range: [0.0, 0.3],
    easing: easeOutCubic,
  },
  {
    // 書桌 → 城市天際線：直線滑移（純 lerp 最順，無樣條 overshoot）
    shot: line({ fromPos: SEAM_1.pos, toPos: CITY_SKYLINE.pos, fromLook: SEAM_1.look, toLook: CITY_SKYLINE.look }),
    range: [0.34, 0.5],
    easing: easeInOutSine,
  },
  {
    // 拍 1 hold 後「突然拉超近」貼玻璃帷幕（range 短 = 體感快）
    shot: line({ fromPos: CITY_SKYLINE.pos, toPos: CITY_GLASS.pos, fromLook: CITY_SKYLINE.look, toLook: CITY_GLASS.look }),
    range: [0.56, 0.63],
    easing: easeInOutCubic,
  },
  {
    // 拍 2 hold 後離場：滑向城市邊緣 SEAM_2
    shot: line({ fromPos: CITY_GLASS.pos, toPos: SEAM_2.pos, fromLook: CITY_GLASS.look, toLook: SEAM_2.look }),
    range: [0.72, 0.8],
    easing: easeInOutSine,
  },
  {
    // 爬升到山峰，視線轉向月亮
    shot: line({ fromPos: SEAM_2.pos, toPos: [126, 20, -70], fromLook: SEAM_2.look, toLook: [150, 34, -100] }),
    range: [0.84, 1.0],
    easing: easeInOutCubic,
  },
])

/* ── 場景 registry（lazy 建構）────────────────────────── */
const scenes = [
  { id: 'workbench', range: [0.0, 0.4], build: () => buildWorkbench(), update: updateWorkbench },
  { id: 'city', range: [0.3, 0.82], build: (ctx) => buildCity(ctx) },
  { id: 'mountains', range: [0.72, 1.0], build: () => buildMountains() },
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
}
</style>
