<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { lightingPresets } from './stage/lights.js'
import { createSceneManager } from './stage/lazyScenes.js'

/**
 * 舞台元件：唯一碰 Three.js renderer 的地方。
 * 職責：canvas / camera / 燈光 preset / lazy 場景管理 / render loop。
 * 它不知道任何 UI 的存在——UI 疊在上面各自訂閱 progress。
 */
const props = defineProps({
  /** composeShots() 的回傳值 */
  flight: { type: Object, required: true },
  /** lazyScenes registry */
  scenes: { type: Array, default: () => [] },
  /** useScrollFlight() 的 progress ref */
  progress: { type: Object, required: true },
  /** lightingPresets 的 key */
  lighting: { type: String, default: 'dusk' },
  /** 傳給每個場景 build(ctx) 的資料（真實內容從這進來） */
  context: { type: Object, default: () => ({}) },
  fov: { type: Number, default: 55 },
})

const canvas = ref(null)
let renderer, camera, scene, manager, cleanupLights, rafId
const lookTarget = new THREE.Vector3()

onMounted(() => {
  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(props.fov, 1, 0.1, 400)

  cleanupLights = (lightingPresets[props.lighting] || lightingPresets.dusk)(scene)
  manager = createSceneManager(scene, props.scenes)

  // 開發期 seam 檢查：接縫不連續會在 console 警告
  if (import.meta.env.DEV && props.flight.validateSeams) {
    for (const issue of props.flight.validateSeams()) {
      console.warn(
        `[flight] seam gap between shot ${issue.between[0]} → ${issue.between[1]}:`,
        `position ${issue.positionGap.toFixed(2)}, look ${issue.lookGap.toFixed(2)}`
      )
    }
  }

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  const loop = () => {
    const t = props.progress.value
    manager.update(t, props.context)
    props.flight.getPose(t, camera.position, lookTarget)
    camera.lookAt(lookTarget)
    renderer.render(scene, camera)
    rafId = requestAnimationFrame(loop)
  }
  loop()

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
    manager.destroy()
    cleanupLights?.()
    renderer.dispose()
  })
})
</script>

<template>
  <canvas ref="canvas" class="flight-stage" />
</template>

<style scoped>
.flight-stage {
  position: fixed;
  inset: 0;
  display: block;
}
</style>
