<script setup>
import { ref } from 'vue'
import { useScrollFlight } from './flight/useScrollFlight.js'
import { composeShots } from './flight/composeShots.js'
import { dollyIn, flyThrough, line } from './flight/shots.js'
import { easeInOutCubic, easeInOutSine, easeOutCubic } from './flight/easing.js'
import FlightStage from './flight/FlightStage.vue'
import FlightCaption from './flight/FlightCaption.vue'
import ProjectCard from './ui/ProjectCard.vue'
import { buildWorkbench } from './scenes/workbench.js'
import { buildCity } from './scenes/city.js'
import { buildMountains } from './scenes/mountains.js'
import { site } from './content/site-content.js'

/* ── 1. 驅動層 ─────────────────────────────────────────── */
const ctl = useScrollFlight({ damping: 0.08 })

/* 點擊城市地標樓選中的作品（FlightStage @select 丟出，ProjectCard 顯示）。
 * 城市場景的可見 t 區間 = flyThrough 段，卡片離開此區間自動淡出。 */
const activeProject = ref(null)
const CITY_RANGE = [0.34, 0.78]

/* ── 2 + 3. Shot 層 + 編排層 ───────────────────────────────
 * 三段刻意用三種不同運鏡示範，接縫座標寫成常數保證 frame-identical。
 * range 之間留了 gap（0.30–0.34、0.74–0.80）= 鏡頭 hold，給閱讀時間。 */
const SEAM_1 = { pos: [0, 2.7, 2.6], look: [0, 2.6, -0.5] }   // 桌前
const SEAM_2 = { pos: [88, 8, -50], look: [110, 12, -64] }    // 城市離場

const flight = composeShots([
  {
    // 原 repo 的招牌：dolly-in 直逼螢幕，收尾減速「停穩」
    shot: dollyIn({ from: [-20, 11, 30], to: SEAM_1.pos, target: SEAM_1.look }),
    range: [0.0, 0.3],
    easing: easeOutCubic,
  },
  {
    // 穿越城市走廊
    shot: flyThrough({
      path: [SEAM_1.pos, [12, 5, -4], [30, 7, -14], [48, 4, -24], [60, 1.4, -30], [70, 3.5, -38], SEAM_2.pos],
      look: [SEAM_1.look, [30, 4, -18], [60, 2, -30], [66, 3, -36], SEAM_2.look],
    }),
    range: [0.34, 0.74],
    easing: easeInOutSine,
  },
  {
    // 爬升到山峰，視線轉向月亮
    shot: line({ fromPos: SEAM_2.pos, toPos: [126, 20, -70], fromLook: SEAM_2.look, toLook: [150, 34, -100] }),
    range: [0.8, 1.0],
    easing: easeInOutCubic,
  },
])

/* ── 場景 registry（lazy 建構）────────────────────────── */
const scenes = [
  { id: 'workbench', range: [0.0, 0.4], build: () => buildWorkbench() },
  { id: 'city', range: [0.3, 0.78], build: (ctx) => buildCity(ctx) },
  { id: 'mountains', range: [0.7, 1.0], build: () => buildMountains() },
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
  bottom: 28px;
  transform: translateX(-50%);
  font-size: 11px;
  letter-spacing: 0.3em;
  color: var(--dim);
}
@media (max-width: 640px) {
  .rail { right: 12px; }
}
</style>
