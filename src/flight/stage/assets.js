import * as THREE from 'three'
import { registerStageTexture, releaseStageTexture } from './resourceRegistry.js'

const resolvePublicAsset = (path) => {
  if (/^(?:https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  const baseUrl = import.meta.env?.BASE_URL || '/'
  return `${baseUrl}${path.replace(/^\/+/, '')}`
}

/** Stage-level 外部資產 cache；同一 URL 只載入一次，Stage 卸載時統一釋放。 */
export function createAssetRegistry() {
  const records = new Map()
  const loadingManager = new THREE.LoadingManager()
  const textureLoader = new THREE.TextureLoader(loadingManager)

  function loadTexture(path) {
    const url = resolvePublicAsset(path)
    if (records.has(url)) return records.get(url).resource

    const record = { type: 'texture', url, status: 'loading', error: null, resource: null }
    const texture = textureLoader.load(
      url,
      () => { record.status = 'ready' },
      undefined,
      (error) => {
        record.status = 'error'
        record.error = error
        console.error(`[assets] failed to load texture: ${url}`, error)
      },
    )
    record.resource = registerStageTexture(texture)
    records.set(url, record)
    return texture
  }

  /** 未來 GLTF／HDR loader 可沿用同一份 record 狀態與 ownership。 */
  function getState(path) {
    const record = records.get(resolvePublicAsset(path))
    return record ? { status: record.status, error: record.error, url: record.url } : null
  }

  function dispose() {
    records.forEach((record) => {
      if (record.type === 'texture') releaseStageTexture(record.resource)
    })
    records.clear()
  }

  return { loadTexture, getState, loadingManager, dispose }
}
