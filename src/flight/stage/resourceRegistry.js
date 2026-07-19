// Stage 生命週期內共用、不可在單一 lazy scene 卸載時釋放的 Texture。
const stageTextures = new Set()

export function registerStageTexture(texture) {
  stageTextures.add(texture)
  return texture
}

export function isStageTexture(texture) {
  return stageTextures.has(texture)
}

export function releaseStageTexture(texture) {
  if (!stageTextures.delete(texture)) return
  texture.dispose()
}
