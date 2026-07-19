import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createSceneManager } from '../src/flight/stage/lazyScenes.js'

test('SceneManager 只建構一次、傳遞 frame，離開範圍後只 dispose 一次', () => {
  const scene = new THREE.Scene()
  const group = new THREE.Group()
  const context = { marker: 'ctx' }
  const frame = { progress: 0.5, elapsed: 2, delta: 0.016 }
  let builds = 0
  let disposals = 0
  const updates = []
  const manager = createSceneManager(scene, [{
    id: 'sample',
    range: [0.4, 0.6],
    build(receivedContext) {
      builds++
      assert.equal(receivedContext, context)
      return group
    },
    update(receivedGroup, t, receivedContext, receivedFrame) {
      updates.push({ receivedGroup, t, receivedContext, receivedFrame })
    },
    dispose(receivedGroup) {
      disposals++
      assert.equal(receivedGroup, group)
    },
  }], { margin: 0 })

  manager.update(0.5, context, frame)
  manager.update(0.55, context, frame)
  assert.equal(builds, 1)
  assert.equal(updates.length, 2)
  assert.equal(updates[0].receivedGroup, group)
  assert.equal(updates[0].receivedContext, context)
  assert.equal(updates[0].receivedFrame, frame)

  manager.update(0.7, context, frame)
  manager.update(0.8, context, frame)
  assert.equal(disposals, 1)
  assert.equal(manager.live.size, 0)

  manager.destroy()
  assert.equal(disposals, 1)
})

test('SceneManager destroy 清理仍在場上的場景', () => {
  const scene = new THREE.Scene()
  let disposals = 0
  const manager = createSceneManager(scene, [{
    id: 'sample',
    range: [0, 1],
    build: () => new THREE.Group(),
    dispose: () => disposals++,
  }], { margin: 0 })

  manager.update(0.5)
  manager.destroy()
  manager.destroy()
  assert.equal(disposals, 1)
  assert.equal(scene.children.length, 0)
})
