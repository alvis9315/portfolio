import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createStationController } from './stationController.js'

const clamp01 = (value) => Math.min(Math.max(value, 0), 1)

/**
 * 驅動層（Driver）：全站唯一的 progress 來源。
 *
 * 一般區間：scroll 位置 → raw t → damping 後的 progress。
 * Cinematic Station 區間：一次明確 gesture → 固定時間自動播放 → 抵達後等待
 * wheel/touch inertia idle 再重新 armed。播放期間 progress 仍是全站唯一時間來源。
 *
 * @param {object} opts
 * @param {number} opts.damping 一般 scroll 區間每 frame 的追趕比例。
 * @param {object|null} opts.stations { points, transitions, rearmDelay }。
 * @param {() => boolean} opts.isInteractionBlocked 作品卡等互動開啟時阻擋換站。
 */
export function useScrollFlight({
  damping = 0.08,
  stations = null,
  isInteractionBlocked = () => false,
} = {}) {
  const progress = ref(0)
  const raw = ref(0)
  const activeStation = ref(null)
  const stationAnimating = ref(false)
  const stationArmed = ref(false)

  let rafId = 0
  let stationMode = false
  let lastPageProgress = 0
  let didInitialRead = false
  let programmaticUntil = 0
  let pendingJumpStationIndex = -1
  let touchStartY = null
  let touchGestureHandled = false

  // 開發驗收入口：?t=.45 可直接定格指定場景；production 完全忽略。
  const debugParams = import.meta.env.DEV && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null
  // Number(null) 會得到 0；必須先確認參數存在，否則一般瀏覽會永遠被鎖在第一幕。
  const debugT = debugParams?.has('t') ? Number(debugParams.get('t')) : Number.NaN
  const hasDebugT = Number.isFinite(debugT)

  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const k = reduced ? 1 : damping
  const stationPoints = stations?.points ?? []
  const firstStationProgress = stationPoints[0]?.progress ?? Number.POSITIVE_INFINITY
  const lastStationProgress = stationPoints.at(-1)?.progress ?? Number.NEGATIVE_INFINITY

  const setCinematicProgress = (value) => {
    raw.value = value
    progress.value = value
  }

  const stationController = stations
    ? createStationController({
        stations: stationPoints,
        transitions: stations.transitions,
        rearmDelay: stations.rearmDelay,
        reducedMotion: reduced,
        onProgress: setCinematicProgress,
      })
    : null

  const getMaxScroll = () => Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
  const getPageProgress = () => {
    const max = getMaxScroll()
    return max > 0 ? clamp01(window.scrollY / max) : 0
  }

  const syncStationRefs = (state = stationController?.getState()) => {
    activeStation.value = state?.station ?? null
    stationAnimating.value = state?.animating ?? false
    stationArmed.value = state?.armed ?? false
  }

  const syncScrollPosition = (value) => {
    const max = getMaxScroll()
    lastPageProgress = value
    window.scrollTo({ top: max * value, behavior: 'auto' })
  }

  const nearestStationIndex = (value) => stationPoints.reduce((closest, item, index) => (
    Math.abs(item.progress - value) < Math.abs(stationPoints[closest].progress - value)
      ? index
      : closest
  ), 0)

  const enterStation = (index, now = performance.now(), syncScroll = true) => {
    if (!stationController) return
    stationMode = true
    pendingJumpStationIndex = -1
    const state = stationController.enter(index, now)
    syncStationRefs(state)
    if (syncScroll) syncScrollPosition(stationPoints[index].progress)
  }

  const leaveStation = () => {
    if (!stationController) return
    stationMode = false
    pendingJumpStationIndex = -1
    syncStationRefs(stationController.leave())
  }

  const nudgeOutsideStationRange = (direction) => {
    const boundary = direction < 0 ? firstStationProgress : lastStationProgress
    const target = clamp01(boundary + direction * 0.012)
    leaveStation()
    programmaticUntil = performance.now() + 120
    setCinematicProgress(target)
    syncScrollPosition(target)
  }

  const read = () => {
    if (hasDebugT) {
      setCinematicProgress(clamp01(debugT))
      return
    }

    const pageProgress = getPageProgress()
    const now = performance.now()

    if (stationMode) {
      lastPageProgress = activeStation.value?.progress ?? lastPageProgress
      return
    }

    if (!didInitialRead) {
      didInitialRead = true
      lastPageProgress = pageProgress
      if (stationController && pageProgress >= firstStationProgress && pageProgress <= lastStationProgress) {
        enterStation(nearestStationIndex(pageProgress), now)
        return
      }
      raw.value = pageProgress
      return
    }

    if (now < programmaticUntil) {
      raw.value = pageProgress
      lastPageProgress = pageProgress
      return
    }

    if (stationController) {
      const crossedFirstGoingDown = lastPageProgress < firstStationProgress
        && pageProgress >= firstStationProgress
      const crossedLastGoingUp = lastPageProgress > lastStationProgress
        && pageProgress <= lastStationProgress

      if (crossedFirstGoingDown) {
        enterStation(0, now)
        return
      }
      if (crossedLastGoingUp) {
        enterStation(stationPoints.length - 1, now)
        return
      }
    }

    raw.value = pageProgress
    lastPageProgress = pageProgress
  }

  const onResize = () => {
    if (stationMode && activeStation.value) {
      syncScrollPosition(activeStation.value.progress)
      return
    }
    read()
  }

  const handleStationDirection = (direction, event, { nudgeAtBoundary = false } = {}) => {
    if (!stationMode || !stationController || !direction) return false

    const now = performance.now()
    stationController.noteInput(now)
    const state = stationController.getState()

    if (state.animating || !state.armed || isInteractionBlocked()) {
      event?.preventDefault()
      return true
    }

    if (stationController.canExit(direction)) {
      // t=0 已是頁面頂端，向上沒有可離開的範圍；留在起始 Station。
      if (direction < 0 && firstStationProgress === 0) {
        event?.preventDefault()
        return true
      }
      if (nudgeAtBoundary) {
        event?.preventDefault()
        nudgeOutsideStationRange(direction)
        return true
      }
      leaveStation()
      return false
    }

    event?.preventDefault()
    stationController.trigger(direction, now)
    syncStationRefs()
    return true
  }

  const onWheel = (event) => {
    if (!stationMode) return
    handleStationDirection(Math.sign(event.deltaY), event)
  }

  const onTouchStart = (event) => {
    if (!stationMode || event.touches.length !== 1) return
    touchStartY = event.touches[0].clientY
    touchGestureHandled = false
    stationController?.noteInput(performance.now())
  }

  const onTouchMove = (event) => {
    if (!stationMode || touchStartY === null || event.touches.length !== 1) return

    stationController?.noteInput(performance.now())
    event.preventDefault()
    if (touchGestureHandled) return

    const delta = touchStartY - event.touches[0].clientY
    if (Math.abs(delta) < 24) return

    touchGestureHandled = true
    handleStationDirection(Math.sign(delta), event, { nudgeAtBoundary: true })
  }

  const onTouchEnd = () => {
    touchStartY = null
    touchGestureHandled = false
  }

  const isTypingTarget = (target) => {
    const tag = target?.tagName
    return target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)
  }

  const onKeyDown = (event) => {
    if (!stationMode || isTypingTarget(event.target)) return

    let direction = 0
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) direction = 1
    if (event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) direction = -1
    if (!direction) return

    handleStationDirection(direction, event, { nudgeAtBoundary: true })
  }

  const jumpTo = (value, { behavior = reduced ? 'auto' : 'smooth' } = {}) => {
    const target = clamp01(value)
    leaveStation()

    let scrollTarget = target
    if (stationController && target >= firstStationProgress && target <= lastStationProgress) {
      pendingJumpStationIndex = nearestStationIndex(target)
      scrollTarget = stationPoints[pendingJumpStationIndex].progress
    }

    const now = performance.now()
    programmaticUntil = now + (behavior === 'smooth' ? 800 : 0)
    raw.value = scrollTarget
    if (behavior === 'auto') progress.value = scrollTarget
    lastPageProgress = scrollTarget
    window.scrollTo({ top: getMaxScroll() * scrollTarget, behavior })

    if (pendingJumpStationIndex >= 0 && behavior === 'auto') {
      enterStation(pendingJumpStationIndex, now, false)
    }
  }

  const tick = () => {
    const now = performance.now()

    if (stationMode && stationController) {
      const state = stationController.update(now)
      syncStationRefs(state)
      if (state.arrived) syncScrollPosition(state.station.progress)
    } else if (pendingJumpStationIndex >= 0 && now >= programmaticUntil) {
      enterStation(pendingJumpStationIndex, now)
    } else {
      progress.value += (raw.value - progress.value) * k
      if (Math.abs(raw.value - progress.value) < 1e-5) progress.value = raw.value
    }

    rafId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    tick()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', read)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', onTouchEnd)
    window.removeEventListener('keydown', onKeyDown)
    cancelAnimationFrame(rafId)
  })

  return {
    progress,
    raw,
    activeStation,
    stationAnimating,
    stationArmed,
    jumpTo,
  }
}
