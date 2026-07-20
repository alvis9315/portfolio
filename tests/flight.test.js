import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { flight, journeyViews } from '../src/journey/flight.js'
import { journeyStations, journeyTimeline } from '../src/journey/timeline.js'
import { site } from '../src/content/site-content.js'

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

test('第一到第三幕中繼站維持已確認的八個截圖構圖與章節歸屬', () => {
  assert.deepEqual(
    journeyStations.points.map(({ id, progress, chapter }) => ({ id, progress, chapter })),
    [
      { id: 'hero-start', progress: 0, chapter: 'about' },
      { id: 'workbench-wide', progress: 0.06, chapter: 'about' },
      { id: 'workbench-detail', progress: 0.14, chapter: 'about' },
      { id: 'city-overview', progress: 0.24, chapter: 'projects' },
      { id: 'city-billboard', progress: 0.29, chapter: 'projects' },
      { id: 'city-glass', progress: 0.32, chapter: 'projects' },
      { id: 'drone-cockpit', progress: 0.42, chapter: 'drone-ops' },
      { id: 'drone-overview', progress: 0.5, chapter: 'drone-ops' },
    ],
  )
  assert.equal(journeyStations.transitions.length, journeyStations.points.length - 1)
})

test('Workbench wide 站完全隱藏 Hero，detail 站仍位於 About 顯示區間', () => {
  const wide = journeyStations.points.find(({ id }) => id === 'workbench-wide')
  const detail = journeyStations.points.find(({ id }) => id === 'workbench-detail')

  assert.equal(journeyTimeline.captions.hero[1], wide.progress)
  assert.ok(detail.progress >= journeyTimeline.captions.about[0])
  assert.ok(detail.progress <= journeyTimeline.captions.about[1])
})

test('城市全景到看板的俯角平順，且看板停點構圖不變', () => {
  const pitches = []
  for (let t = 0.24; t <= 0.290001; t += 0.0025) {
    const { position, look } = poseAt(t)
    const horizontal = Math.hypot(look.x - position.x, look.z - position.z)
    pitches.push(THREE.MathUtils.radToDeg(Math.atan2(look.y - position.y, horizontal)))
  }

  assert.ok(Math.max(...pitches) - Math.min(...pitches) < 5)
  const billboardPose = poseAt(0.29)
  assert.ok(billboardPose.position.distanceTo(new THREE.Vector3(...journeyViews.cityBillboard.pos)) < 1e-9)
  assert.ok(billboardPose.look.distanceTo(new THREE.Vector3(...journeyViews.cityBillboard.look)) < 1e-9)
})

test('任務 Portal 從第三幕最終站出發，落在第四幕監控牆鏡位', () => {
  const [portalStart, portalEnd] = journeyTimeline.ui.missionPortal
  const [commandStart, commandEnd] = journeyTimeline.shots.commandScreen

  assert.equal(portalStart, journeyStations.points.at(-1).progress)
  assert.ok(portalEnd >= commandStart && portalEnd <= commandEnd)
  assert.deepEqual(site.missions.map(({ id }) => id), ['analyze', 'build', 'deliver'])
})
