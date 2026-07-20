<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  forwardEligible: { type: Boolean, default: false },
  reverseEligible: { type: Boolean, default: false },
  phase: { type: String, default: 'idle' },
  missions: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
})

const emit = defineEmits(['open', 'reverse', 'select', 'back'])
const firstMission = ref(null)
const touchStartY = ref(null)
const touchMoved = ref(false)
const touchGestureHandled = ref(false)
const rays = Array.from({ length: 36 }, (_, index) => ({
  angle: `${index * 10}deg`,
  delay: `${-(index % 9) * 73}ms`,
  width: `${28 + (index % 6) * 7}vw`,
}))

const setFirstMission = (element, index) => {
  if (index === 0) firstMission.value = element
}

const stopInput = (event) => {
  event.preventDefault()
  event.stopImmediatePropagation()
}

const openFromInput = (event) => {
  stopInput(event)
  emit('open')
}

const reverseFromInput = (event) => {
  stopInput(event)
  emit('reverse')
}

const backFromInput = (event) => {
  stopInput(event)
  emit('back')
}

const isTransitionPhase = () => props.phase !== 'idle' && props.phase !== 'select'

const onWheel = (event) => {
  if (props.phase === 'select') {
    if (event.deltaY < 0) backFromInput(event)
    else stopInput(event)
    return
  }
  if (isTransitionPhase()) {
    stopInput(event)
    return
  }
  if (props.forwardEligible && event.deltaY > 0) openFromInput(event)
  if (props.reverseEligible && event.deltaY < 0) reverseFromInput(event)
}

const onTouchStart = (event) => {
  if (event.touches.length !== 1) return
  touchStartY.value = event.touches[0].clientY
  touchMoved.value = false
  touchGestureHandled.value = false
  // select 階段允許「點一下」穿到 DOM button 或 3D canvas；只有拖曳才阻擋換站。
  if (isTransitionPhase()) stopInput(event)
}

const onTouchMove = (event) => {
  if (touchStartY.value === null || event.touches.length !== 1) return
  const delta = touchStartY.value - event.touches[0].clientY
  if (Math.abs(delta) > 8) touchMoved.value = true
  if (isTransitionPhase()) {
    stopInput(event)
    return
  }
  if (props.phase === 'select') {
    if (!touchMoved.value) return
    if (!touchGestureHandled.value && delta < 0) {
      touchGestureHandled.value = true
      backFromInput(event)
    } else {
      stopInput(event)
    }
    return
  }
  if (touchGestureHandled.value || Math.abs(delta) < 24) return
  const direction = Math.sign(delta)
  if (props.forwardEligible && direction > 0) {
    touchGestureHandled.value = true
    openFromInput(event)
  }
  if (props.reverseEligible && direction < 0) {
    touchGestureHandled.value = true
    reverseFromInput(event)
  }
}

const onTouchEnd = (event) => {
  touchStartY.value = null
  if ((props.phase === 'select' && touchMoved.value) || isTransitionPhase()) {
    stopInput(event)
  }
  touchMoved.value = false
  touchGestureHandled.value = false
}

const onKeyDown = (event) => {
  const backward = event.key === 'ArrowUp'
    || event.key === 'PageUp'
    || (event.key === ' ' && event.shiftKey)

  if (props.phase === 'select' && (event.key === 'Escape' || backward)) {
    backFromInput(event)
    return
  }

  const isGateControl = event.target?.closest?.('.mission-gate button')
  if (props.phase !== 'idle') {
    if (isGateControl && (event.key === 'Enter' || event.key === ' ')) return
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(event.key)) stopInput(event)
    return
  }

  const forward = event.key === 'ArrowDown'
    || event.key === 'PageDown'
    || (event.key === ' ' && !event.shiftKey)
  if (props.forwardEligible && forward) openFromInput(event)
  if (props.reverseEligible && backward) reverseFromInput(event)
}

watch(() => props.phase, async (phase) => {
  if (phase !== 'select') return
  await nextTick()
  firstMission.value?.focus({ preventScroll: true })
})

onMounted(() => {
  window.addEventListener('wheel', onWheel, { passive: false, capture: true })
  window.addEventListener('touchstart', onTouchStart, { passive: false, capture: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
  window.addEventListener('touchend', onTouchEnd, { passive: false, capture: true })
  window.addEventListener('touchcancel', onTouchEnd, { passive: false, capture: true })
  window.addEventListener('keydown', onKeyDown, { capture: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', onWheel, { capture: true })
  window.removeEventListener('touchstart', onTouchStart, { capture: true })
  window.removeEventListener('touchmove', onTouchMove, { capture: true })
  window.removeEventListener('touchend', onTouchEnd, { capture: true })
  window.removeEventListener('touchcancel', onTouchEnd, { capture: true })
  window.removeEventListener('keydown', onKeyDown, { capture: true })
})
</script>

<template>
  <section
    v-if="phase !== 'idle'"
    class="mission-gate"
    :class="`phase-${phase}`"
    aria-live="polite"
    aria-label="選擇下一個任務"
  >
    <div v-if="phase === 'select'" class="mission-select">
      <p class="mission-kicker">03 / SYSTEM OVERVIEW</p>
      <h2>SELECT A MISSION</h2>
      <p class="mission-hint">選擇一個視角，進入 Delivery Control Center</p>
      <div class="mission-options" role="list">
        <button
          v-for="(mission, index) in missions"
          :key="mission.id"
          :ref="(element) => setFirstMission(element, index)"
          class="mission-option"
          type="button"
          role="listitem"
          @click="emit('select', mission)"
        >
          <span class="mission-code">{{ mission.code }}</span>
          <strong>{{ mission.label }}</strong>
          <span>{{ mission.description }}</span>
        </button>
      </div>
      <button class="mission-back" type="button" @click="emit('back')">← 返回全局視角</button>
    </div>

    <div v-else-if="phase === 'focus' || phase === 'reverse-focus'" class="mission-focus" aria-hidden="true">
      <div class="focus-panel">
        <span>{{ missions.find((mission) => mission.id === selectedId)?.code }}</span>
        <strong>{{ missions.find((mission) => mission.id === selectedId)?.label }}</strong>
      </div>
    </div>

    <div v-else-if="phase === 'portal' || phase === 'reverse-portal'" class="portal-tunnel" aria-hidden="true">
      <div class="portal-rays">
        <span
          v-for="(ray, index) in rays"
          :key="index"
          :style="{ '--ray-angle': ray.angle, '--ray-delay': ray.delay, '--ray-width': ray.width }"
        />
      </div>
      <div class="portal-core" />
      <p>{{ phase === 'reverse-portal' ? 'RETURNING TO SYSTEM OVERVIEW' : 'ROUTING TO CONTROL CENTER' }}</p>
    </div>

    <div v-else-if="phase === 'reveal' || phase === 'reverse-cover'" class="portal-curtain" aria-hidden="true" />
  </section>
</template>

<style scoped>
.mission-gate {
  position: fixed;
  inset: 0;
  z-index: 18;
  pointer-events: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.mission-select {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 9vh 8vw 7vh;
  background: linear-gradient(180deg, rgba(8, 20, 31, 0.12), rgba(5, 16, 25, 0.48));
  animation: reveal 420ms ease both;
}
.mission-kicker,
.mission-hint,
.portal-tunnel p {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.22em;
}
.mission-kicker {
  color: #7ff9ff;
  font-size: 11px;
}
.mission-select h2 {
  margin: 10px 0 0;
  color: #edfaff;
  font-size: clamp(28px, 4vw, 56px);
  letter-spacing: 0.08em;
  text-shadow: 0 0 28px rgba(85, 229, 241, 0.38);
}
.mission-hint {
  margin-top: 10px;
  color: #9cb9c8;
  font-size: 11px;
}
.mission-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(170px, 230px));
  gap: 18px;
  width: min(780px, 84vw);
  margin-top: auto;
}
.mission-option {
  min-height: 126px;
  padding: 18px;
  border: 1px solid rgba(102, 235, 244, 0.52);
  border-radius: 4px;
  background:
    linear-gradient(135deg, rgba(56, 186, 210, 0.18), rgba(7, 27, 41, 0.86)),
    rgba(6, 20, 31, 0.82);
  box-shadow: inset 0 0 24px rgba(63, 218, 232, 0.08), 0 0 22px rgba(45, 208, 222, 0.12);
  color: #dffbff;
  text-align: left;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}
.mission-option:hover,
.mission-option:focus-visible {
  outline: none;
  transform: translateY(-7px);
  border-color: #8ef9ff;
  box-shadow: inset 0 0 28px rgba(63, 218, 232, 0.18), 0 0 34px rgba(45, 208, 222, 0.3);
}
.mission-option span,
.mission-option strong {
  display: block;
}
.mission-code {
  color: #ffd787;
  font-size: 10px;
  letter-spacing: 0.18em;
}
.mission-option strong {
  margin-top: 10px;
  font-size: 19px;
  letter-spacing: 0.08em;
}
.mission-option span:last-child {
  margin-top: 8px;
  color: #9cb9c8;
  font-size: 11px;
  line-height: 1.55;
}
.mission-back {
  margin-top: 22px;
  border: 0;
  background: transparent;
  color: #a9bfcc;
  font: 11px/1.4 inherit;
  letter-spacing: 0.08em;
  cursor: pointer;
  pointer-events: auto;
}
.mission-back:hover,
.mission-back:focus-visible { color: #fff; }
.mission-focus,
.portal-tunnel,
.portal-curtain {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: rgba(4, 17, 27, 0.2);
}
.focus-panel {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  place-items: center;
  width: min(420px, 70vw);
  aspect-ratio: 1.72;
  border: 2px solid #83f8ff;
  background: radial-gradient(circle, rgba(105, 239, 247, 0.44), rgba(7, 31, 46, 0.96) 64%);
  box-shadow: 0 0 70px rgba(66, 225, 238, 0.72), inset 0 0 60px rgba(87, 239, 248, 0.35);
  color: #f2feff;
  transform: translate(-50%, -50%);
  animation: lock-panel 850ms cubic-bezier(0.2, 0.72, 0.18, 1) both;
}
.phase-reverse-focus .focus-panel {
  animation-direction: reverse;
}
.focus-panel span {
  position: absolute;
  top: 20px;
  left: 24px;
  color: #ffd787;
  font-size: 11px;
  letter-spacing: 0.18em;
}
.focus-panel strong {
  font-size: clamp(24px, 4vw, 48px);
  letter-spacing: 0.16em;
}
.portal-tunnel {
  display: grid;
  place-items: center;
  background: radial-gradient(circle at center, #c6fbff 0, #32b9d0 3%, #071725 15%, #020812 58%, #000 100%);
  animation: reveal 180ms ease both;
}
.phase-reverse-portal .portal-tunnel {
  animation-name: reveal-reverse;
}
.phase-reverse-portal .portal-rays span {
  animation-direction: reverse;
}
.phase-reverse-portal .portal-core {
  animation-direction: alternate-reverse;
}
.portal-curtain {
  background:
    radial-gradient(circle at center, rgba(99, 232, 244, 0.3), rgba(4, 18, 29, 0.94) 42%, #020812 100%),
    linear-gradient(135deg, #071725, #020812);
}
.phase-reveal .portal-curtain {
  animation: curtain-out 560ms ease-in-out both;
}
.phase-reverse-cover .portal-curtain {
  animation: curtain-in 440ms ease-in-out both;
}
.portal-rays,
.portal-rays span {
  position: absolute;
  left: 50%;
  top: 50%;
}
.portal-rays span {
  width: var(--ray-width);
  height: 2px;
  transform-origin: 0 50%;
  background: linear-gradient(90deg, transparent, rgba(128, 248, 255, 0.9));
  box-shadow: 0 0 8px rgba(81, 229, 244, 0.8);
  animation: ray-rush 620ms linear var(--ray-delay) infinite;
}
.portal-core {
  width: 7vmin;
  aspect-ratio: 1;
  border: 1px solid #d8feff;
  border-radius: 50%;
  background: #d8feff;
  box-shadow: 0 0 28px #b6fbff, 0 0 90px #46d8df;
  animation: core-pulse 520ms ease-in-out infinite alternate;
}
.portal-tunnel p {
  position: absolute;
  bottom: 9vh;
  color: rgba(217, 251, 255, 0.82);
  font-size: 10px;
}
@keyframes reveal { from { opacity: 0; } to { opacity: 1; } }
@keyframes reveal-reverse { from { opacity: 1; } to { opacity: 0.94; } }
@keyframes curtain-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes curtain-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes lock-panel {
  0% { opacity: 0; transform: translate(-50%, -35%) scale(0.22) rotateX(18deg); }
  34% { opacity: 1; }
  72% { transform: translate(-50%, -50%) scale(1) rotateX(0deg); }
  100% { transform: translate(-50%, -50%) scale(5.4); opacity: 0.88; }
}
@keyframes ray-rush {
  from { opacity: 0; transform: rotate(var(--ray-angle)) translateX(2vmin) scaleX(0.06); }
  18% { opacity: 0.9; }
  to { opacity: 0; transform: rotate(var(--ray-angle)) translateX(42vmin) scaleX(1); }
}
@keyframes core-pulse { to { transform: scale(1.25); } }
@media (max-width: 640px) {
  .mission-select { padding: 8vh 24px calc(30px + env(safe-area-inset-bottom)); }
  .mission-select h2 { font-size: clamp(25px, 9vw, 38px); }
  .mission-hint { max-width: 280px; text-align: center; line-height: 1.6; }
  .mission-options {
    grid-template-columns: 1fr;
    gap: 10px;
    width: min(100%, 360px);
  }
  .mission-option { min-height: 88px; padding: 13px 16px; }
  .mission-option strong { margin-top: 5px; font-size: 16px; }
  .mission-option span:last-child { margin-top: 4px; }
  .mission-back { margin-top: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .mission-select,
  .focus-panel,
  .portal-tunnel,
  .portal-curtain,
  .portal-rays span,
  .portal-core { animation: none !important; }
}
</style>
