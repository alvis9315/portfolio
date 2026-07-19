import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

/** 唯一的 WebGLRenderer + post-processing ownership。 */
export function createRenderPipeline({ canvas, scene, camera, pixelRatio, bloom }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(pixelRatio)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      bloom?.strength ?? 0.9,
      bloom?.radius ?? 0.55,
      bloom?.threshold ?? 0.6
    )
  )

  return {
    renderer,
    setSize(width, height) {
      renderer.setSize(width, height)
      composer.setSize(width, height)
    },
    render() {
      composer.render()
    },
    dispose() {
      // EffectComposer.dispose() 不會代替各 pass 釋放自己的 render targets。
      composer.passes.forEach((pass) => pass.dispose?.())
      composer.dispose()
      renderer.dispose()
    },
  }
}
