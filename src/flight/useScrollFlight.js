import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 驅動層（Driver）：全站唯一的 progress 來源。
 * scroll 位置 → raw t (0~1) → damping 平滑後的 progress。
 * 所有 3D 與 UI 元件都只訂閱這個 progress，彼此完全解耦。
 *
 * @param {object} opts
 * @param {number} opts.damping  每 frame 追趕比例，越小越滑順（電影感），越大越跟手。
 *                               prefers-reduced-motion 時自動改為 1（無平滑）。
 */
export function useScrollFlight({ damping = 0.08 } = {}) {
  const progress = ref(0) // 平滑後，給鏡頭與 UI 用
  const raw = ref(0)      // 未平滑，需要精準對齊捲動位置時用
  let rafId = 0
  // 開發驗收入口：?t=.45 可直接定格指定場景；production 完全忽略。
  const debugT = import.meta.env.DEV && typeof window !== 'undefined'
    ? Number(new URLSearchParams(window.location.search).get('t'))
    : Number.NaN
  const hasDebugT = Number.isFinite(debugT)

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const k = reduced ? 1 : damping

  const read = () => {
    if (hasDebugT) {
      raw.value = Math.min(Math.max(debugT, 0), 1)
      progress.value = raw.value
      return
    }
    const max = document.documentElement.scrollHeight - window.innerHeight
    raw.value = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
  }

  const tick = () => {
    progress.value += (raw.value - progress.value) * k
    if (Math.abs(raw.value - progress.value) < 1e-5) progress.value = raw.value
    rafId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    tick()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', read)
    window.removeEventListener('resize', read)
    cancelAnimationFrame(rafId)
  })

  return { progress, raw }
}
