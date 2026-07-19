import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { flight } from '../src/journey/flight.js'
import {
  DRONE_ARRIVAL_LOCAL_PATH,
  DRONE_CITY_ORIGIN,
  DRONE_REVEAL_KEYS,
  sampleDroneFlight,
} from '../src/scenes/droneArrival.js'

test('無人機 reveal 依控制點由下往上，並精確接上正式路徑', () => {
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()

  DRONE_REVEAL_KEYS.forEach((key, index) => {
    sampleDroneFlight(key.t, point, tangent)
    assert.ok(point.distanceTo(new THREE.Vector3(...key.position)) < 1e-8)
    if (index > 0) assert.ok(key.position[1] >= DRONE_REVEAL_KEYS[index - 1].position[1])
  })

  const seam = DRONE_REVEAL_KEYS.at(-1).position
  assert.deepEqual(seam, DRONE_ARRIVAL_LOCAL_PATH[0])
})

test('拉近完成後到歸位前，鏡頭維持半機身追隨距離', () => {
  const camera = new THREE.Vector3()
  const look = new THREE.Vector3()
  const drone = new THREE.Vector3()
  const tangent = new THREE.Vector3()

  for (let globalT = 0.41; globalT <= 0.48; globalT += 0.005) {
    flight.getPose(globalT, camera, look)
    sampleDroneFlight(globalT, drone, tangent)
    drone.add(DRONE_CITY_ORIGIN)
    const distance = camera.distanceTo(drone)
    assert.ok(distance >= 1.45 && distance <= 1.7, `t=${globalT.toFixed(3)}, distance=${distance}`)
  }
})
