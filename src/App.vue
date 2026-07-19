<script setup>
import { computed, ref } from 'vue'
import { useScrollFlight } from './flight/useScrollFlight.js'
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
import { journeyTimeline } from './journey/timeline.js'
import { flight } from './journey/flight.js'

/* ── 1. 驅動層 ─────────────────────────────────────────── */
const ctl = useScrollFlight({ damping: 0.08 })
// 六幕需要足夠的實體捲動距離讓觀眾停留觀看。640vh 扣掉一個 viewport 後，
// 每幕平均不到一個螢幕高度，觸控板的一次慣性滑動很容易直接跨幕。
const SCROLL_LENGTH_VH = 1100

/* 點擊城市地標樓選中的作品（FlightStage @select 丟出，ProjectCard 顯示）。
 * 城市場景的可見 t 區間 = flyThrough 段，卡片離開此區間自動淡出。 */
const activeProject = ref(null)
const railOpen = ref(false)
const CITY_RANGE = journeyTimeline.ui.projectCard

const navSections = computed(() => site.sections.slice(1))
const activeSectionId = computed(() => {
  const t = ctl.progress.value
  return navSections.value.reduce((closest, section) => {
    const center = (section.range[0] + section.range[1]) / 2
    return Math.abs(center - t) < Math.abs(closest.center - t) ? { id: section.id, center } : closest
  }, { id: navSections.value[0]?.id, center: Number.POSITIVE_INFINITY }).id
})

function jumpToSection(section) {
  const target = (section.range[0] + section.range[1]) / 2
  const max = document.documentElement.scrollHeight - window.innerHeight
  window.scrollTo({ top: max * target, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  railOpen.value = false
}

/* ── 場景 registry（lazy 建構）────────────────────────── */
const scenes = [
  { id: 'workbench', range: journeyTimeline.scenes.workbench.load, build: () => buildWorkbench(), update: updateWorkbench },
  { id: 'city', range: journeyTimeline.scenes.city.load, build: (ctx) => buildCity(ctx), update: updateCity },
  { id: 'drone-city', range: journeyTimeline.scenes.droneCity.load, build: () => buildDroneCity(), update: updateDroneCity },
  { id: 'command-room', range: journeyTimeline.scenes.commandRoom.load, build: () => buildCommandRoom(), update: updateCommandRoom },
  { id: 'creative-lab', range: journeyTimeline.scenes.creativeLab.load, build: () => buildCreativeLab(), update: updateCreativeLab },
  { id: 'final-desk', range: journeyTimeline.scenes.finalDesk.load, build: () => buildFinalDesk(), update: updateFinalDesk },
]
</script>

<template>
  <!-- 捲動空間：總長決定整段飛行的「膠卷長度」，越長節奏越慢 -->
  <div :style="{ height: `${SCROLL_LENGTH_VH}vh` }"></div>

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
  <nav class="rail" :class="{ open: railOpen }" aria-label="場景導覽">
    <button class="rail-toggle" type="button" :aria-expanded="railOpen" aria-label="展開場景導覽" @click="railOpen = !railOpen">{{ railOpen ? '×' : '≡' }}</button>
    <button v-for="(s, index) in navSections" :key="s.id" class="stop"
      :class="{ active: activeSectionId === s.id }"
      :style="{ top: ((s.range[0] + s.range[1]) / 2) * 100 + '%' }"
      type="button" :aria-label="`前往 ${s.eyebrow}`" @click="jumpToSection(s)">
      <span class="scene-label">{{ String(index + 1).padStart(2, '0') }} · {{ s.eyebrow.replace(/^\d+\s*[—-]\s*/, '') }}</span>
    </button>
    <div class="craft" :style="{ top: ctl.progress.value * 100 + '%' }" />
  </nav>

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
  z-index: 20;
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
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(232, 238, 245, 0.35);
  cursor: pointer;
  transition: width 180ms ease, height 180ms ease, background 180ms ease;
}
.stop::after {
  content: '';
  position: absolute;
  inset: -10px;
}
.stop:hover,
.stop:focus-visible,
.stop.active {
  width: 9px;
  height: 9px;
  background: var(--accent);
}
.scene-label {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translate(8px, -50%);
  width: max-content;
  max-width: 260px;
  padding: 7px 10px;
  border: 1px solid rgba(232, 238, 245, 0.16);
  border-radius: 5px;
  background: rgba(8, 14, 25, 0.86);
  color: var(--ink);
  font: 600 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.1em;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 160ms ease, transform 160ms ease, visibility 160ms;
  backdrop-filter: blur(6px);
}
.stop:hover .scene-label,
.stop:focus-visible .scene-label,
.stop.active .scene-label {
  opacity: 1;
  visibility: visible;
  transform: translate(0, -50%);
}
.rail-toggle {
  display: none;
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
  .rail { right: 14px; height: 34vh; }
  .rail-toggle {
    display: grid;
    place-items: center;
    position: absolute;
    top: -42px;
    left: 50%;
    width: 28px;
    height: 28px;
    transform: translateX(-50%);
    border: 1px solid rgba(232, 238, 245, 0.2);
    border-radius: 50%;
    background: rgba(8, 14, 25, 0.72);
    color: var(--ink);
    font: 15px/1 ui-monospace, monospace;
  }
  .stop.active .scene-label {
    opacity: 0;
    visibility: hidden;
  }
  .rail.open .scene-label,
  .rail.open .stop.active .scene-label {
    opacity: 1;
    visibility: visible;
    transform: translate(0, -50%);
  }
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
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}
</style>
