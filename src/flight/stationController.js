const clamp01 = (value) => Math.min(Math.max(value, 0), 1)

function sampleKeyframes(keyframes, ratio) {
  const t = clamp01(ratio)
  const last = keyframes[keyframes.length - 1]

  if (t <= keyframes[0].at) return keyframes[0].progress
  if (t >= last.at) return last.progress

  for (let index = 1; index < keyframes.length; index += 1) {
    const to = keyframes[index]
    if (t > to.at) continue

    const from = keyframes[index - 1]
    const local = (t - from.at) / (to.at - from.at)
    return from.progress + (to.progress - from.progress) * local
  }

  return last.progress
}

const transitionEasings = Object.freeze({
  linear: (value) => value,
  easeInOutSine: (value) => -(Math.cos(Math.PI * value) - 1) / 2,
})

export function sampleStationTransition(transition, ratio, direction = 1) {
  const easing = transitionEasings[transition.easing ?? 'linear']
  const easedRatio = easing(clamp01(ratio))
  return sampleKeyframes(transition.keyframes, direction > 0 ? easedRatio : 1 - easedRatio)
}

function validateConfig(stations, transitions) {
  if (!Array.isArray(stations) || stations.length < 2) {
    throw new Error('[stations] at least two station points are required')
  }
  if (!Array.isArray(transitions) || transitions.length !== stations.length - 1) {
    throw new Error('[stations] transitions must connect every adjacent station')
  }

  stations.forEach((item, index) => {
    if (!Number.isFinite(item.progress)) throw new Error(`[stations] invalid progress at index ${index}`)
    if (index > 0 && item.progress <= stations[index - 1].progress) {
      throw new Error('[stations] station progress must be strictly increasing')
    }
  })

  transitions.forEach((transition, index) => {
    if (!Number.isFinite(transition.duration) || transition.duration < 0) {
      throw new Error(`[stations] invalid transition duration at index ${index}`)
    }
    if (!Array.isArray(transition.keyframes) || transition.keyframes.length < 2) {
      throw new Error(`[stations] transition ${index} needs at least two keyframes`)
    }
    if (!transitionEasings[transition.easing ?? 'linear']) {
      throw new Error(`[stations] unknown easing in transition ${index}`)
    }
    transition.keyframes.forEach((keyframe, keyframeIndex) => {
      if (!Number.isFinite(keyframe.at) || !Number.isFinite(keyframe.progress)) {
        throw new Error(`[stations] invalid keyframe in transition ${index}`)
      }
      if (keyframeIndex > 0 && keyframe.at <= transition.keyframes[keyframeIndex - 1].at) {
        throw new Error(`[stations] keyframe time must increase in transition ${index}`)
      }
    })

    const first = transition.keyframes[0]
    const last = transition.keyframes.at(-1)
    if (first.at !== 0 || last.at !== 1) {
      throw new Error(`[stations] transition ${index} keyframes must span 0 to 1`)
    }
    if (first.progress !== stations[index].progress || last.progress !== stations[index + 1].progress) {
      throw new Error(`[stations] transition ${index} must start and end at its stations`)
    }
  })
}

/**
 * 純狀態機：一次 gesture 只觸發一段固定時間動畫。
 * DOM input、scroll position 與 Vue refs 由 useScrollFlight 負責，這裡只處理
 * station index、正反向播放、輸入 idle 後 re-arm 與 progress 取樣。
 */
export function createStationController({
  stations,
  transitions,
  onProgress = () => {},
  rearmDelay = 420,
  reducedMotion = false,
} = {}) {
  validateConfig(stations, transitions)

  let stationIndex = -1
  let animation = null
  let armed = false
  let lastInputAt = Number.NEGATIVE_INFINITY

  const currentRearmDelay = () => stations[stationIndex]?.rearmDelay ?? rearmDelay

  const snapshot = (arrived = false) => ({
    active: stationIndex >= 0,
    index: stationIndex,
    station: stationIndex >= 0 ? stations[stationIndex] : null,
    armed,
    animating: animation !== null,
    arrived,
  })

  const enter = (index, now = 0) => {
    if (!Number.isInteger(index) || index < 0 || index >= stations.length) {
      throw new Error(`[stations] station index out of range: ${index}`)
    }
    stationIndex = index
    animation = null
    armed = false
    lastInputAt = now
    onProgress(stations[index].progress)
    return snapshot()
  }

  const leave = () => {
    stationIndex = -1
    animation = null
    armed = false
    return snapshot()
  }

  const noteInput = (now) => {
    lastInputAt = now
  }

  const canExit = (direction) => (
    stationIndex >= 0 && (
      (direction < 0 && stationIndex === 0)
      || (direction > 0 && stationIndex === stations.length - 1)
    )
  )

  const trigger = (direction, now) => {
    const step = direction > 0 ? 1 : direction < 0 ? -1 : 0
    if (!step || stationIndex < 0 || !armed || animation || canExit(step)) return false

    const destinationIndex = stationIndex + step
    animation = {
      direction: step,
      destinationIndex,
      startedAt: now,
      transition: transitions[step > 0 ? stationIndex : destinationIndex],
    }
    armed = false
    lastInputAt = now
    return true
  }

  const update = (now) => {
    let arrived = false

    if (animation) {
      const duration = reducedMotion ? 0 : animation.transition.duration
      const ratio = duration === 0 ? 1 : clamp01((now - animation.startedAt) / duration)
      onProgress(sampleStationTransition(animation.transition, ratio, animation.direction))

      if (ratio >= 1) {
        stationIndex = animation.destinationIndex
        animation = null
        // 抵達本身也是一次新的停靠邊界；即使滑鼠只送出單一 wheel event，
        // 仍保留一小段 dwell，避免抵達同一 frame 就重新接受下一次輸入。
        lastInputAt = now
        onProgress(stations[stationIndex].progress)
        arrived = true
      }
    }

    if (stationIndex >= 0 && !animation && !armed && now - lastInputAt >= currentRearmDelay()) {
      armed = true
    }

    return snapshot(arrived)
  }

  return {
    enter,
    leave,
    noteInput,
    canExit,
    trigger,
    update,
    getState: snapshot,
  }
}
