<script setup>
import { computed } from 'vue'

/**
 * UI 整合層的示範元件：綁定一段 progress 區間，區間內淡入、離開淡出。
 * 這就是「跟其他 UI 元件自由配」的 pattern——
 * 任何元件（Tailwind 卡片、nav、CTA…）都能用同樣三行 computed 接上 progress。
 */
const props = defineProps({
  /** useScrollFlight() 的 progress ref */
  progress: { type: Object, required: true },
  /** 可見的全域 t 區間 [a, b] */
  range: { type: Array, required: true },
  /** 淡入淡出佔區間的比例 */
  fade: { type: Number, default: 0.22 },
})

const opacity = computed(() => {
  const t = props.progress.value
  const [a, b] = props.range
  const m = props.fade * (b - a)
  if (t < a || t > b) return 0
  if (t < a + m) return (t - a) / m
  if (t > b - m) return (b - t) / m
  return 1
})
</script>

<template>
  <section
    class="flight-caption"
    :style="{ opacity, visibility: opacity > 0.01 ? 'visible' : 'hidden' }"
  >
    <slot :opacity="opacity" />
  </section>
</template>

<style scoped>
.flight-caption {
  position: fixed;
  max-width: min(420px, 80vw);
  pointer-events: none;
}
.flight-caption :deep(a),
.flight-caption :deep(button) {
  pointer-events: auto; /* 區間內的互動元素仍可點擊 */
}
</style>
