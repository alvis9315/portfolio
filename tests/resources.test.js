import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { disposeGroup } from '../src/flight/stage/materials.js'
import { registerStageTexture, releaseStageTexture } from '../src/flight/stage/resourceRegistry.js'
import { createStagePerformanceProfile } from '../src/flight/stage/performance.js'
import { createPageVisibility } from '../src/flight/stage/visibility.js'

test('disposeGroup 釋放 scene-owned geometry、material 與 texture', () => {
  const group = new THREE.Group()
  const texture = new THREE.DataTexture()
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial({ map: texture })
  const disposed = { texture: 0, geometry: 0, material: 0 }
  texture.addEventListener('dispose', () => disposed.texture++)
  geometry.addEventListener('dispose', () => disposed.geometry++)
  material.addEventListener('dispose', () => disposed.material++)
  group.add(new THREE.Mesh(geometry, material))

  disposeGroup(group)
  assert.deepEqual(disposed, { texture: 1, geometry: 1, material: 1 })
})

test('lazy scene 不處理 Stage-owned texture，Stage 最後只釋放一次', () => {
  const group = new THREE.Group()
  const texture = registerStageTexture(new THREE.DataTexture())
  const material = new THREE.MeshBasicMaterial({ map: texture })
  let textureDisposals = 0
  texture.addEventListener('dispose', () => textureDisposals++)
  group.add(new THREE.Mesh(new THREE.BoxGeometry(), material))

  disposeGroup(group)
  assert.equal(textureDisposals, 0)
  releaseStageTexture(texture)
  releaseStageTexture(texture)
  assert.equal(textureDisposals, 1)
})

test('手機 profile 降低像素成本，桌面參數維持原值', () => {
  const desktop = createStagePerformanceProfile({ width: 1440, pixelRatio: 3, coarsePointer: false })
  const mobile = createStagePerformanceProfile({ width: 390, pixelRatio: 3, coarsePointer: true })

  assert.equal(desktop.pixelRatio, 2)
  assert.equal(desktop.reflectorSize, 1024)
  assert.equal(desktop.bloom.strength, 0.9)
  assert.equal(mobile.pixelRatio, 1.35)
  assert.equal(mobile.reflectorSize, 512)
  assert.ok(mobile.bloom.strength < desktop.bloom.strength)
})

test('visibility lifecycle 可 pause/resume 且會移除 listener', () => {
  const listeners = new Map()
  const target = {
    hidden: false,
    addEventListener(type, listener) { listeners.set(type, listener) },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type)
    },
  }
  let pauses = 0
  let resumes = 0
  const lifecycle = createPageVisibility({
    target,
    onHidden: () => pauses++,
    onVisible: () => resumes++,
  })

  target.hidden = true
  listeners.get('visibilitychange')()
  target.hidden = false
  listeners.get('visibilitychange')()
  lifecycle.dispose()

  assert.equal(pauses, 1)
  assert.equal(resumes, 1)
  assert.equal(listeners.size, 0)
})
