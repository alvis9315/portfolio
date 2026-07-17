<script setup>
import { computed, ref } from 'vue'
import { useScrollFlight } from './flight/useScrollFlight.js'
import { composeShots } from './flight/composeShots.js'
import { dollyIn, flyThrough, line } from './flight/shots.js'
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
// 六幕需要足夠的實體捲動距離讓觀眾停留觀看。640vh 扣掉一個 viewport 後，
// 每幕平均不到一個螢幕高度，觸控板的一次慣性滑動很容易直接跨幕。
const SCROLL_LENGTH_VH = 1100

/* 點擊城市地標樓選中的作品（FlightStage @select 丟出，ProjectCard 顯示）。
 * 城市場景的可見 t 區間 = flyThrough 段，卡片離開此區間自動淡出。 */
const activeProject = ref(null)
const railOpen = ref(false)
const CITY_RANGE = [0.16, 0.38]

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

/* ── 2 + 3. Shot 層 + 編排層 ───────────────────────────────
 * 城市維持原本「天際線 → 玻璃反射」方向，只延長靠近路徑並從看板右側自然掠過；
 * 彩蛋保留在場景中，但不為它額外轉向或安排獨立特寫。 */
const SEAM_1 = { pos: [0, 2.7, 2.6], look: [0, 2.6, -0.5] }        // 桌前
const CITY_SKYLINE = { pos: [90, 19, -4], look: [57, 4, -32] }     // 拍 1：東北高空俯瞰，大樓林立的廣角遠景
const CITY_GLASS = { pos: [60.4, 6.8, -32.3], look: [60, 7.5, -34.2] } // 拍 2：窄巷內貼玻璃帷幕（反射對街看板）
const SEAM_2 = { pos: [88, 8, -50], look: [110, 12, -64] }         // 城市離場
const DRONE_VIEW = { pos: [137, 22, -60], look: [122, 4, -78] }
const COMMAND_VIEW = { pos: [169, 10, -93], look: [157, 4, -111] }
const COMMAND_SCREEN = { pos: [160, 6.2, -102], look: [158.8, 4.8, -120.1] }
const COMMAND_DESK = { pos: [164, 4.8, -105], look: [157.8, 1.9, -110] }
const LAB_DATA = { pos: [185, 7.2, -134], look: [182, 4.2, -148] }
const LAB_STUDIO = { pos: [205, 6.4, -134], look: [202.6, 3.2, -145.5] }
const FINAL_DETAIL = { pos: [229.5, 4.1, -172.5], look: [230.3, 2.25, -178] }
const FINAL_SCREEN = { pos: [232, 4.6, -173.2], look: [232, 3.1, -178.8] }
// 收尾回到桌面中軸正視；先前 x=242 的右側斜視會讓整張桌子與螢幕看起來歪斜。
const FINAL_WIDE = { pos: [232, 9.5, -164], look: [232, 2.5, -178] }

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
    // 維持高位掠過看板右側，先讓頂部彩蛋留在畫面內；接近窄巷後才平順下降到玻璃。
    shot: flyThrough({
      path: [CITY_SKYLINE.pos, [78, 17, -12], [68, 14, -21], [64.8, 11.8, -26], [64, 9.6, -29.5], [62.5, 7.8, -31.6], CITY_GLASS.pos],
      look: [CITY_SKYLINE.look, [68, 10.5, -23], [62, 11, -28], [60.5, 10.8, -29.5], [60.3, 9.2, -31.5], [60.2, 8, -33.4], CITY_GLASS.look],
      tension: 0.32,
    }),
    range: [0.24, 0.32],
    easing: easeInOutSine,
  },
  {
    // 玻璃反射短暫停穩後離場。
    shot: line({ fromPos: CITY_GLASS.pos, toPos: SEAM_2.pos, fromLook: CITY_GLASS.look, toLook: SEAM_2.look }),
    range: [0.345, 0.37],
    easing: easeInOutSine,
  },
  {
    shot: line({ fromPos: SEAM_2.pos, toPos: DRONE_VIEW.pos, fromLook: SEAM_2.look, toLook: DRONE_VIEW.look }),
    range: [0.37, 0.43], easing: easeInOutSine,
  },
  {
    shot: line({ fromPos: DRONE_VIEW.pos, toPos: COMMAND_VIEW.pos, fromLook: DRONE_VIEW.look, toLook: COMMAND_VIEW.look }),
    range: [0.51, 0.56], easing: easeInOutCubic,
  },
  {
    // 戰情室不只停在遠景：推近監控牆，再落到中央指揮桌。
    shot: line({ fromPos: COMMAND_VIEW.pos, toPos: COMMAND_SCREEN.pos, fromLook: COMMAND_VIEW.look, toLook: COMMAND_SCREEN.look }),
    range: [0.58, 0.61], easing: easeOutCubic,
  },
  {
    shot: line({ fromPos: COMMAND_SCREEN.pos, toPos: COMMAND_DESK.pos, fromLook: COMMAND_SCREEN.look, toLook: COMMAND_DESK.look }),
    range: [0.63, 0.66], easing: easeInOutSine,
  },
  {
    // 沿資料方向飛進 AI Lab 左側，而不是直接換成下一張遠景。
    shot: flyThrough({
      path: [COMMAND_DESK.pos, [171, 7, -118], [179, 8, -126], LAB_DATA.pos],
      look: [COMMAND_DESK.look, [170, 4, -124], [179, 4, -136], LAB_DATA.look],
    }),
    range: [0.68, 0.72], easing: easeInOutCubic,
  },
  {
    // 從 RAG 文件流橫移到 FigureShot 攝影棚與猛毒剪影。
    shot: line({ fromPos: LAB_DATA.pos, toPos: LAB_STUDIO.pos, fromLook: LAB_DATA.look, toLook: LAB_STUDIO.look }),
    range: [0.74, 0.8], easing: easeInOutSine,
  },
  {
    shot: flyThrough({
      path: [LAB_STUDIO.pos, [211, 8, -151], [220, 7, -162], FINAL_DETAIL.pos],
      look: [LAB_STUDIO.look, [205, 3, -151], [220, 3, -169], FINAL_DETAIL.look],
    }),
    range: [0.82, 0.87], easing: easeInOutCubic,
  },
  {
    // 先沿桌上歷程物件推進，再靠近姓名卡。
    shot: line({ fromPos: FINAL_DETAIL.pos, toPos: FINAL_SCREEN.pos, fromLook: FINAL_DETAIL.look, toLook: FINAL_SCREEN.look }),
    range: [0.89, 0.93], easing: easeOutCubic,
  },
  {
    // 回到升級桌面後安靜拉遠，讓物件依旅程順序亮起。
    shot: line({ fromPos: FINAL_SCREEN.pos, toPos: FINAL_WIDE.pos, fromLook: FINAL_SCREEN.look, toLook: FINAL_WIDE.look }),
    range: [0.95, 1.0], easing: easeOutCubic,
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
