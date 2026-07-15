<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { lightingPresets } from './stage/lights.js'
import { createSceneManager } from './stage/lazyScenes.js'
import { createFlightDebug } from './stage/debugPath.js'
import { palette } from './stage/materials.js'

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

/** 點到地標樓時把 project 資料丟出去；點空白處丟 null（取消選取）。UI 卡片疊在舞台外接這個事件。 */
const emit = defineEmits(['select'])

const canvas = ref(null)
let renderer, camera, scene, manager, cleanupLights, rafId, flightDebug
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

  // 開發期 ?debug：把 flight / look 路徑畫進場景，調座標時肉眼對照
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('debug')) {
    flightDebug = createFlightDebug(props.flight)
    scene.add(flightDebug.group)
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

  /* ── Raycaster 互動：地標樓 hover 高亮 + click 選取 ──────────
   * 只有城市在場（manager.live 有 city）且指標在畫面上時才 pick。
   * hover 是純 3D（改材質 emissive）留在舞台內；click 才把資料 emit 出去。
   * 每 frame 重算 pick，因為鏡頭在飛——指標不動，樓也會滑進滑出准心。 */
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let hasPointer = false
  let hovered = null
  let hoveredEmissive = 0

  const pickProjectMesh = () => {
    raycaster.setFromCamera(pointer, camera)
    for (const hit of raycaster.intersectObjects(scene.children, true)) {
      for (let o = hit.object; o; o = o.parent) {
        if (o.userData?.project) return o // 命中最近的、且屬於某 project 的樓（窗戶/燈沒有 project 會被略過）
      }
    }
    return null
  }

  const setHover = (mesh) => {
    if (mesh === hovered) return
    if (hovered) hovered.material.emissive.setHex(hoveredEmissive) // 還原前一棟
    hovered = mesh
    if (hovered) {
      hoveredEmissive = hovered.material.emissive.getHex()
      hovered.material.emissive.setHex(palette.screenGlow)
    }
    canvas.value.style.cursor = hovered ? 'pointer' : ''
  }

  const onPointerMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    hasPointer = true
  }
  const onPointerLeave = () => { hasPointer = false }
  const onClick = () => {
    const mesh = manager.live.has('city') ? pickProjectMesh() : null
    emit('select', mesh ? mesh.userData.project : null)
  }
  canvas.value.addEventListener('pointermove', onPointerMove)
  canvas.value.addEventListener('pointerleave', onPointerLeave)
  canvas.value.addEventListener('click', onClick)

  const loop = () => {
    const t = props.progress.value
    manager.update(t, props.context)
    props.flight.getPose(t, camera.position, lookTarget)
    camera.lookAt(lookTarget)
    setHover(hasPointer && manager.live.has('city') ? pickProjectMesh() : null)
    renderer.render(scene, camera)
    rafId = requestAnimationFrame(loop)
  }
  loop()

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
    canvas.value?.removeEventListener('pointermove', onPointerMove)
    canvas.value?.removeEventListener('pointerleave', onPointerLeave)
    canvas.value?.removeEventListener('click', onClick)
    if (flightDebug) {
      scene.remove(flightDebug.group)
      flightDebug.dispose()
    }
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
