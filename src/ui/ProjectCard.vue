<script setup>
import { computed } from 'vue'

/**
 * 作品資訊卡（UI 層，疊在 FlightStage 外）。
 * 資料來源是 FlightStage 的 @select 事件（點地標樓丟出 project）。
 *
 * 可見度遵守慣例 6：綁 progress 區間 ∩ 有選中的 project——
 * 也就是「人在城市段」且「有點過一棟樓」才顯示，捲離城市自動淡出，
 * 捲回來若還選著同一棟就再淡入。欄位 description / stack / url 都是可選，
 * site-content 之後補上就自動出現（roadmap 第 3 項）。
 */
const props = defineProps({
  /** FlightStage @select 丟出的 project 資料（null = 未選取） */
  project: { type: Object, default: null },
  /** useScrollFlight() 的 progress ref */
  progress: { type: Object, required: true },
  /** 城市段的全域 t 區間 [a, b]，離開此區間卡片淡出 */
  range: { type: Array, required: true },
  fade: { type: Number, default: 0.15 },
})

const emit = defineEmits(['close'])

const inRange = computed(() => {
  const t = props.progress.value
  const [a, b] = props.range
  const m = props.fade * (b - a)
  if (t < a || t > b) return 0
  if (t < a + m) return (t - a) / m
  if (t > b - m) return (b - t) / m
  return 1
})

const opacity = computed(() => (props.project ? inRange.value : 0))
const stack = computed(() => props.project?.stack || [])
</script>

<template>
  <aside
    class="project-card"
    :style="{ opacity, visibility: opacity > 0.01 ? 'visible' : 'hidden' }"
  >
    <button class="close" aria-label="關閉" @click="emit('close')">×</button>
    <div v-if="project" class="body">
      <div class="eyebrow">Project</div>
      <h3>{{ project.name }}</h3>
      <p v-if="project.description" class="desc">{{ project.description }}</p>
      <ul v-if="stack.length" class="stack">
        <li v-for="s in stack" :key="s">{{ s }}</li>
      </ul>
      <a v-if="project.url" class="link" :href="project.url" target="_blank" rel="noopener">
        開啟 →
      </a>
    </div>
  </aside>
</template>

<style scoped>
.project-card {
  position: fixed;
  left: 6vw;
  bottom: 12vh;
  width: min(340px, 82vw);
  padding: 18px 20px;
  background: rgba(15, 23, 41, 0.82);
  border: 1px solid rgba(255, 215, 135, 0.25);
  border-radius: 10px;
  backdrop-filter: blur(6px);
  transition: opacity 0.25s ease;
  pointer-events: auto;
}
.close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: var(--dim);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.close:hover { color: var(--ink); }
.eyebrow {
  font-size: 10px;
  letter-spacing: 0.28em;
  color: var(--accent);
  text-transform: uppercase;
  margin-bottom: 8px;
}
h3 {
  font-weight: 600;
  font-size: 18px;
  line-height: 1.3;
}
.desc {
  margin-top: 10px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--dim);
}
.stack {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.stack li {
  font-size: 10.5px;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  border: 1px solid rgba(143, 163, 184, 0.3);
  border-radius: 999px;
  color: var(--dim);
}
.link {
  display: inline-block;
  margin-top: 14px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--accent);
  text-decoration: none;
}
.link:hover { text-decoration: underline; }
@media (max-width: 640px) {
  .project-card {
    left: max(4vw, env(safe-area-inset-left));
    bottom: calc(8vh + env(safe-area-inset-bottom));
  }
}
</style>
