import * as THREE from 'three'

/**
 * 夜景環境貼圖：給玻璃鏡面大樓（glass 材質）反射用。
 * 沒有 scene.environment 的話，高 metalness 的玻璃面會是死黑一片。
 *
 * 做法：canvas 畫一張夜空漸層（天頂深藍 → 地平線微亮城市輝光 → 地面近黑），
 * 再灑一些暖點當遠處窗燈的反射，PMREM 處理成可 IBL 的環境貼圖。
 *
 * @param renderer  需要 renderer 來跑 PMREMGenerator
 * @returns { texture, dispose }
 */
export function createNightEnv(renderer) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, size)
  grad.addColorStop(0.0, '#1a2544') // 天頂
  grad.addColorStop(0.4, '#324a72') // 上空
  grad.addColorStop(0.5, '#6d7ba0') // 上地平線
  grad.addColorStop(0.57, '#b98a5e') // 城市輝光帶（暖橙，光害感）
  grad.addColorStop(0.68, '#3a3348')
  grad.addColorStop(1.0, '#0c1018') // 地面
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // 月亮在 IBL 中只提供寬廣柔光；真實月球由 city.js 繪製。
  // 先前 0.95 的白色尖峰會在玻璃上反成過曝光球，與窗燈無關。
  const sun = ctx.createRadialGradient(size * 0.72, size * 0.4, 0, size * 0.72, size * 0.4, size * 0.2)
  sun.addColorStop(0, 'rgba(177,202,226,0.24)')
  sun.addColorStop(0.42, 'rgba(139,170,201,0.12)')
  sun.addColorStop(1, 'rgba(112,145,180,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, size, size)

  // 地平線附近灑暖點/冷點，玻璃反射會有城市燈火的感覺
  for (let i = 0; i < 80; i++) {
    const warm = Math.random() < 0.7
    ctx.fillStyle = warm
      ? `rgba(255,215,135,${0.1 + Math.random() * 0.2})`
      : `rgba(188,214,234,${0.08 + Math.random() * 0.16})`
    const y = size * 0.5 + (Math.random() - 0.3) * size * 0.22
    ctx.beginPath()
    ctx.arc(Math.random() * size, y, 1 + Math.random() * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace

  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromEquirectangular(tex).texture

  tex.dispose()
  pmrem.dispose()

  return { texture: env, dispose: () => env.dispose() }
}
