import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { flight, journeyViews } from '../src/journey/flight.js'
import { journeyTimeline } from '../src/journey/timeline.js'

const poseAt = (t) => {
  const position = new THREE.Vector3()
  const look = new THREE.Vector3()
  flight.getPose(t, position, look)
  return { position, look }
}

test('正式 flight 的所有 shot seam 都連續', () => {
  assert.deepEqual(flight.validateSeams(), [])
})

test('shot 之間的空檔維持上一個終點，不產生隱性運鏡', () => {
  for (let index = 0; index < flight.segments.length - 1; index++) {
    const currentEnd = flight.segments[index].range[1]
    const nextStart = flight.segments[index + 1].range[0]
    if (nextStart <= currentEnd) continue

    const endPose = poseAt(currentEnd)
    const holdPose = poseAt((currentEnd + nextStart) / 2)
    assert.ok(endPose.position.distanceTo(holdPose.position) < 1e-9)
    assert.ok(endPose.look.distanceTo(holdPose.look) < 1e-9)
  }
})

test('第三幕定點、標題與進入第四幕的 hold 使用同一時間邊界', () => {
  const arrivalEnd = journeyTimeline.shots.droneArrival[1]
  const titleRange = journeyTimeline.captions.droneOps
  const fourthSceneStart = journeyTimeline.shots.droneToCommand[0]
  const arrivalPose = poseAt(arrivalEnd)

  assert.ok(arrivalPose.position.distanceTo(new THREE.Vector3(...journeyViews.drone.pos)) < 1e-9)
  assert.ok(arrivalPose.look.distanceTo(new THREE.Vector3(...journeyViews.drone.look)) < 1e-9)
  assert.equal(titleRange[0], arrivalEnd)
  assert.equal(titleRange[1], fourthSceneStart)
  assert.ok(fourthSceneStart > arrivalEnd)
})
