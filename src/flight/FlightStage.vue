<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { lightingPresets } from './stage/lights.js'
import { createSceneManager } from './stage/lazyScenes.js'
import { createFlightDebug } from './stage/debugPath.js'
import { createNightEnv } from './stage/environment.js'
import { createSky } from './stage/sky.js'
import { disposeMaterialCaches } from './stage/materials.js'
import { createProjectPicker } from './stage/projectPicker.js'
import { createRenderPipeline } from './stage/renderPipeline.js'
import { createStageResize } from './stage/resize.js'

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
let renderer, camera, scene, manager, cleanupLights, rafId, flightDebug, nightEnv, sky
let pipeline, resizeController, projectPicker
const lookTarget = new THREE.Vector3()
const morningSkyLight = new THREE.Color(0xbad2e8)
const morningGroundLight = new THREE.Color(0x465e73)
const morningSunLight = new THREE.Color(0xd2e6f5)
const dawnSkyLight = new THREE.Color(0xd8c6bc)
const dawnGroundLight = new THREE.Color(0x5f4640)
const dawnSunLight = new THREE.Color(0xffc68f)

onMounted(() => {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(props.fov, 1, 0.1, 400)
  pipeline = createRenderPipeline({
    canvas: canvas.value,
    scene,
    camera,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
  })
  renderer = pipeline.renderer

  cleanupLights = (lightingPresets[props.lighting] || lightingPresets.dusk)(scene)
  // 夜景環境貼圖：玻璃鏡面大樓的反射來源（scene.environment 自動套到所有 PBR 材質）
  nightEnv = createNightEnv(renderer)
  scene.environment = nightEnv.texture
  // 漸層天空穹頂（時間系統）：取代 preset 的死平單色背景
  sky = createSky()
  scene.add(sky.mesh)
  scene.background = null
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

  resizeController = createStageResize({ camera, pipeline })

  /* ── Raycaster 互動：地標樓 hover 高亮 + click 選取 ──────────
   * 只有城市在場（manager.live 有 city）且指標在畫面上時才 pick。
   * hover 是純 3D（改材質 emissive）留在舞台內；click 才把資料 emit 出去。
   * 每 frame 重算 pick，因為鏡頭在飛——指標不動，樓也會滑進滑出准心。 */
  projectPicker = createProjectPicker({
    canvas: canvas.value,
    camera,
    scene,
    isEnabled: () => manager.live.has('city'),
    onSelect: (project) => emit('select', project),
  })

  const loop = () => {
    const t = props.progress.value
    manager.update(t, props.context)
    sky.update(t, scene.fog)
    // 第二幕離場後完整保留一段桃金暖陽；第三幕後半才混回現有晨藍。
    const dawn = THREE.MathUtils.smoothstep(t, 0.3, 0.36)
    const morning = THREE.MathUtils.smoothstep(t, 0.38, 0.43)
    const hemi = scene.getObjectByName('journey-hemi')
    const sun = scene.getObjectByName('journey-sun')
    const stars = scene.getObjectByName('journey-stars')
    if (hemi) {
      hemi.intensity = THREE.MathUtils.lerp(0.88, 1.02, dawn)
      hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, 1.18, morning)
      hemi.color.set(0x789fc3).lerp(dawnSkyLight, dawn).lerp(morningSkyLight, morning)
      hemi.groundColor.set(0x1b2b43).lerp(dawnGroundLight, dawn).lerp(morningGroundLight, morning)
    }
    if (sun) {
      sun.intensity = THREE.MathUtils.lerp(0.5, 0.92, dawn)
      sun.intensity = THREE.MathUtils.lerp(sun.intensity, 1.05, morning)
      sun.color.set(0xa9c1dc).lerp(dawnSunLight, dawn).lerp(morningSunLight, morning)
    }
    if (stars) stars.material.opacity = 1 - THREE.MathUtils.smoothstep(t, 0.31, 0.45)
    props.flight.getPose(t, camera.position, lookTarget)
    // 天空穹頂必須跟著鏡頭移動；固定在世界原點時，飛到後續場景會讓地平線
    // 彎到畫面角落，暖光與雲帶因此看起來像一顆過曝光球。
    if (sky) sky.mesh.position.copy(camera.position)
    camera.lookAt(lookTarget)
    projectPicker.update()
    // Reflector 的反射貼圖在 composer 之外先手動更新（見 city.js 的 updateReflection
    // 註解）——Reflector 的原生 hook 若在 composer pass 內觸發會弄髒 viewport。
    scene.traverse((o) => {
      if (!o.userData.updateReflection) return
      // lazy margin 會提早掛載城市；若任一祖先為 invisible，就不要白做一次完整反射渲染。
      for (let p = o; p; p = p.parent) if (!p.visible) return
      o.userData.updateReflection(renderer, scene, camera)
    })
    pipeline.render()
    rafId = requestAnimationFrame(loop)
  }
  loop()

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    resizeController.dispose()
    projectPicker.dispose()
    if (flightDebug) {
      scene.remove(flightDebug.group)
      flightDebug.dispose()
    }
    manager.destroy()
    disposeMaterialCaches()
    cleanupLights?.()
    if (sky) {
      scene.remove(sky.mesh)
      sky.dispose()
    }
    scene.environment = null
    nightEnv?.dispose()
    pipeline.dispose()
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
