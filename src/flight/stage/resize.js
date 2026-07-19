/** Renderer、Composer 與 Camera 共用同一個 viewport resize lifecycle。 */
export function createStageResize({ camera, pipeline }) {
  const resize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    // updateStyle=true（renderer.setSize 預設）會寫 inline canvas size；這能避免
    // HMR 後 scoped style 未套上時，drawing buffer 尺寸被誤當 CSS 尺寸。
    pipeline.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  window.addEventListener('resize', resize)
  resize()

  return {
    resize,
    dispose() {
      window.removeEventListener('resize', resize)
    },
  }
}
