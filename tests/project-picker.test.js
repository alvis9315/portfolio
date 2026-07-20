import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createProjectPicker } from '../src/flight/stage/projectPicker.js'

test('第三幕藍光面板只在 gate 開啟時可由 Raycaster 選取', () => {
  const listeners = new Map()
  const canvas = {
    style: {},
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type) => listeners.delete(type),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  }
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
  camera.position.set(0, 0, 5)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)

  const scene = new THREE.Scene()
  const mission = { id: 'analyze', kind: 'mission' }
  let enabled = true
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x66eeff }),
  )
  panel.userData.mission = mission
  panel.userData.isSelectable = () => enabled
  scene.add(panel)
  scene.updateMatrixWorld(true)

  const selected = []
  const picker = createProjectPicker({
    canvas,
    camera,
    scene,
    isEnabled: () => true,
    onSelect: (value) => selected.push(value),
  })
  listeners.get('pointermove')({ clientX: 50, clientY: 50 })
  picker.update()
  listeners.get('click')()
  assert.equal(selected.at(-1), mission)

  enabled = false
  picker.update()
  listeners.get('click')()
  assert.equal(selected.at(-1), null)

  picker.dispose()
  assert.equal(listeners.size, 0)
  panel.geometry.dispose()
  panel.material.dispose()
})
