<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useScrollFlight } from './flight/useScrollFlight.js'
import FlightStage from './flight/FlightStage.vue'
import FlightCaption from './flight/FlightCaption.vue'
import ProjectCard from './ui/ProjectCard.vue'
import MissionGate from './ui/MissionGate.vue'
import { buildWorkbench, updateWorkbench } from './scenes/workbench.js'
import { buildCity, updateCity } from './scenes/city.js'
import { buildDroneCity, updateDroneCity } from './scenes/droneCity.js'
import { buildCommandRoom, updateCommandRoom } from './scenes/commandRoom.js'
import { buildCreativeLab, updateCreativeLab } from './scenes/creativeLab.js'
import { buildFinalDesk, updateFinalDesk } from './scenes/finalDesk.js'
import { site } from './content/site-content.js'
import { journeyStations, journeyTimeline } from './journey/timeline.js'
import { flight } from './journey/flight.js'

/* ── 1. 驅動層 ─────────────────────────────────────────── */
/* FlightStage 的 select 同時承載城市 project 與第三幕 mission；App 依 kind 分流到
 * ProjectCard 或 Portal，並讓 Station driver 在任一互動接管期間阻擋換站。 */
const activeProject = ref(null)
const portalPhase = ref('idle')
const MISSION_COMPLETE_KEY = 'portfolio-mission-complete'
const MISSION_SELECTION_KEY = 'portfolio-mission-selection'
const storedMissionId = typeof sessionStorage !== 'undefined'
  ? sessionStorage.getItem(MISSION_SELECTION_KEY)
  : ''
const storedMission = site.missions.find((mission) => mission.id === storedMissionId) ?? null
const missionCompleted = ref(
  typeof sessionStorage !== 'undefined' && sessionStorage.getItem(MISSION_COMPLETE_KEY) === '1',
)
// 舊 session 可能只有 complete flag；保留一個有效入口，反向 Portal 才能倒放同一塊面板。
const selectedMission = ref(storedMission ?? (missionCompleted.value ? site.missions[0] : null))
const portalActive = computed(() => portalPhase.value !== 'idle')
const portalBusy = computed(() => portalActive.value && portalPhase.value !== 'select')
const ctl = useScrollFlight({
  damping: 0.08,
  stations: journeyStations,
  isInteractionBlocked: () => Boolean(activeProject.value) || portalActive.value,
})
// 六幕需要足夠的實體捲動距離讓觀眾停留觀看。640vh 扣掉一個 viewport 後，
// 每幕平均不到一個螢幕高度，觸控板的一次慣性滑動很容易直接跨幕。
const SCROLL_LENGTH_VH = 1100

const railOpen = ref(false)
const CITY_RANGE = journeyTimeline.ui.projectCard
const DRONE_OVERVIEW_PROGRESS = journeyStations.points.at(-1).progress
const PORTAL_DESTINATION = journeyTimeline.ui.missionPortal[1]
const PORTAL_REVERSE_LIMIT = journeyTimeline.ui.missionPortalReverse[1]
const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
let portalRafId = 0
const portalTimers = new Set()

const portalForwardEligible = computed(() => (
  !missionCompleted.value
  && portalPhase.value === 'idle'
  && ctl.activeStation.value?.id === 'drone-overview'
  && ctl.stationArmed.value
))
const portalReverseEligible = computed(() => (
  missionCompleted.value
  && portalPhase.value === 'idle'
  && !ctl.activeStation.value
  && ctl.progress.value > DRONE_OVERVIEW_PROGRESS + 1e-5
  && ctl.progress.value <= PORTAL_REVERSE_LIMIT
))

const stageContext = {
  content: site,
  isMissionSelectionActive: () => portalActive.value,
  selectedMissionId: () => selectedMission.value?.id ?? '',
}

const wait = (duration) => new Promise((resolve) => {
  const timer = window.setTimeout(() => {
    portalTimers.delete(timer)
    resolve()
  }, duration)
  portalTimers.add(timer)
})

const animateProgress = (to, duration) => new Promise((resolve) => {
  if (!duration) {
    ctl.jumpTo(to, { behavior: 'auto' })
    resolve()
    return
  }

  const from = ctl.progress.value
  const startedAt = performance.now()
  const tick = (now) => {
    const ratio = Math.min((now - startedAt) / duration, 1)
    const eased = ratio < 0.5 ? 4 * ratio ** 3 : 1 - ((-2 * ratio + 2) ** 3) / 2
    // .5 是最後一個 Station；第一 frame 跨出一個 epsilon 才會交回一般 progress driver。
    const value = Math.max(DRONE_OVERVIEW_PROGRESS + 1e-6, from + (to - from) * eased)
    ctl.jumpTo(value, { behavior: 'auto' })
    if (ratio >= 1) {
      portalRafId = 0
      resolve()
      return
    }
    portalRafId = requestAnimationFrame(tick)
  }
  portalRafId = requestAnimationFrame(tick)
})

function openMissionGate() {
  if (portalForwardEligible.value) portalPhase.value = 'select'
}

function resetMissionGate() {
  if (portalPhase.value !== 'select') return
  selectedMission.value = null
  portalPhase.value = 'idle'
}

async function selectMission(mission) {
  if (portalPhase.value !== 'select' || !mission) return
  selectedMission.value = mission
  portalPhase.value = 'focus'
  await wait(reducedMotion ? 0 : 850)
  portalPhase.value = 'portal'
  await animateProgress(PORTAL_DESTINATION, reducedMotion ? 0 : 1550)
  missionCompleted.value = true
  sessionStorage.setItem(MISSION_COMPLETE_KEY, '1')
  sessionStorage.setItem(MISSION_SELECTION_KEY, mission.id)
  portalPhase.value = 'reveal'
  await wait(reducedMotion ? 0 : 560)
  portalPhase.value = 'idle'
}

async function reverseMissionPortal() {
  if (!portalReverseEligible.value) return

  portalPhase.value = 'reverse-cover'
  await wait(reducedMotion ? 0 : 440)
  portalPhase.value = 'reverse-portal'
  await animateProgress(DRONE_OVERVIEW_PROGRESS + 1e-6, reducedMotion ? 0 : 1550)
  portalPhase.value = 'reverse-focus'
  await wait(reducedMotion ? 0 : 850)

  // Portal 倒放完才正式重進最終 Station；下一個向上 gesture 只負責關閉任務選擇。
  ctl.jumpTo(DRONE_OVERVIEW_PROGRESS, { behavior: 'auto' })
  missionCompleted.value = false
  sessionStorage.removeItem(MISSION_COMPLETE_KEY)
  portalPhase.value = 'select'
}

function handleStageSelect(selection) {
  if (selection?.kind === 'mission') {
    selectMission(selection)
    return
  }
  activeProject.value = selection
}

const navSections = computed(() => site.sections.slice(1))
const activeSectionId = computed(() => {
  if (ctl.activeStation.value) return ctl.activeStation.value.chapter

  const t = ctl.progress.value
  return navSections.value.reduce((closest, section) => {
    const center = (section.range[0] + section.range[1]) / 2
    return Math.abs(center - t) < Math.abs(closest.center - t) ? { id: section.id, center } : closest
  }, { id: navSections.value[0]?.id, center: Number.POSITIVE_INFINITY }).id
})

function jumpToSection(section) {
  if (portalBusy.value) return
  if (section.id === 'drone-ops' && portalReverseEligible.value) {
    railOpen.value = false
    reverseMissionPortal()
    return
  }
  resetMissionGate()
  const target = section.id === 'drone-ops' && !missionCompleted.value
    ? DRONE_OVERVIEW_PROGRESS
    : (section.range[0] + section.range[1]) / 2
  ctl.jumpTo(target)
  railOpen.value = false
}

/* ── 場景 registry（lazy 建構）────────────────────────── */
const scenes = [
  { id: 'workbench', range: journeyTimeline.scenes.workbench.load, build: () => buildWorkbench(), update: updateWorkbench },
  { id: 'city', range: journeyTimeline.scenes.city.load, build: (ctx) => buildCity(ctx), update: updateCity },
  { id: 'drone-city', range: journeyTimeline.scenes.droneCity.load, build: (ctx) => buildDroneCity(ctx), update: updateDroneCity },
  { id: 'command-room', range: journeyTimeline.scenes.commandRoom.load, build: () => buildCommandRoom(), update: updateCommandRoom },
  { id: 'creative-lab', range: journeyTimeline.scenes.creativeLab.load, build: () => buildCreativeLab(), update: updateCreativeLab },
  { id: 'final-desk', range: journeyTimeline.scenes.finalDesk.load, build: () => buildFinalDesk(), update: updateFinalDesk },
]

onBeforeUnmount(() => {
  if (portalRafId) cancelAnimationFrame(portalRafId)
  portalTimers.forEach((timer) => clearTimeout(timer))
  portalTimers.clear()
})
</script>

<template>
  <!-- 捲動空間：總長決定整段飛行的「膠卷長度」，越長節奏越慢 -->
  <div :style="{ height: `${SCROLL_LENGTH_VH}vh` }"></div>

  <!-- 3D 舞台 -->
  <FlightStage
    :flight="flight"
    :scenes="scenes"
    :progress="ctl.progress"
    :context="stageContext"
    lighting="dusk"
    @select="handleStageSelect"
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
    :instant-in="s.id === 'projects' || s.id === 'drone-ops'"
    :suppressed="s.id === 'drone-ops' && portalActive"
    :style="s.position"
  >
    <div class="eyebrow">{{ s.eyebrow }}</div>
    <h2>{{ s.title }}</h2>
    <p :style="s.bodyColor ? { color: s.bodyColor } : undefined">{{ s.body }}</p>
    <a v-if="s.link" class="caption-link" :href="s.link.url" target="_blank" rel="noopener noreferrer">
      {{ s.link.label }} ↗
    </a>
  </FlightCaption>

  <MissionGate
    :forward-eligible="portalForwardEligible"
    :reverse-eligible="portalReverseEligible"
    :phase="portalPhase"
    :missions="site.missions"
    :selected-id="selectedMission?.id"
    @open="openMissionGate"
    @reverse="reverseMissionPortal"
    @select="selectMission"
    @back="resetMissionGate"
  />

  <!-- 飛行進度軌：直接綁 progress 的另一個 UI 範例 -->
  <nav class="rail" :class="{ open: railOpen, locked: portalBusy }" aria-label="場景導覽">
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
.rail.locked {
  opacity: 0.35;
  pointer-events: none;
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
