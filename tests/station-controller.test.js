import test from 'node:test'
import assert from 'node:assert/strict'
import { createStationController, sampleStationTransition } from '../src/flight/stationController.js'
import { journeyStations } from '../src/journey/timeline.js'

const createController = (options = {}) => {
  const values = []
  const controller = createStationController({
    stations: journeyStations.points,
    transitions: journeyStations.transitions,
    rearmDelay: journeyStations.rearmDelay,
    onProgress: (value) => values.push(value),
    ...options,
  })
  return { controller, values }
}

test('Station 進站後等待 input idle 才 armed', () => {
  const { controller, values } = createController()
  let state = controller.enter(0, 1000)

  assert.equal(values.at(-1), 0.23)
  assert.equal(state.station.id, 'city-overview')
  assert.equal(state.armed, false)

  state = controller.update(1000 + journeyStations.rearmDelay - 1)
  assert.equal(state.armed, false)
  state = controller.update(1000 + journeyStations.rearmDelay)
  assert.equal(state.armed, true)
})

test('一次 gesture 固定播放到下一站，播放中丟棄額外觸發', () => {
  const { controller, values } = createController()
  controller.enter(0, 0)
  controller.update(journeyStations.rearmDelay)

  assert.equal(controller.trigger(1, 500), true)
  assert.equal(controller.trigger(1, 501), false)

  const transition = journeyStations.transitions[0]
  const middle = controller.update(500 + transition.duration / 2)
  assert.equal(middle.animating, true)
  assert.equal(values.at(-1), sampleStationTransition(transition, 0.5, 1))

  const arrived = controller.update(500 + transition.duration)
  assert.equal(arrived.arrived, true)
  assert.equal(arrived.station.id, 'city-billboard')
  assert.equal(arrived.armed, false)
  assert.equal(values.at(-1), 0.29)
})

test('滾輪慣性輸入會延後下一站 re-arm', () => {
  const { controller } = createController()
  const transition = journeyStations.transitions[0]
  const arrivalAt = 500 + transition.duration
  controller.enter(0, 0)
  controller.update(journeyStations.rearmDelay)
  controller.trigger(1, 500)

  let state = controller.update(arrivalAt)
  assert.equal(state.arrived, true)
  assert.equal(state.armed, false)

  controller.noteInput(arrivalAt + 200)
  state = controller.update(arrivalAt + journeyStations.rearmDelay)
  assert.equal(state.armed, false)
  state = controller.update(arrivalAt + 200 + journeyStations.rearmDelay)
  assert.equal(state.armed, true)
})

test('向上 gesture 使用同一路徑反向播放並回到上一站', () => {
  const { controller, values } = createController()
  const transition = journeyStations.transitions[2]
  controller.enter(3, 0)
  controller.update(journeyStations.rearmDelay)

  assert.equal(controller.trigger(-1, 500), true)
  controller.update(500 + transition.duration * 0.25)
  assert.equal(values.at(-1), sampleStationTransition(transition, 0.25, -1))

  const arrived = controller.update(500 + transition.duration)
  assert.equal(arrived.station.id, 'city-glass')
  assert.equal(values.at(-1), 0.32)
})

test('首尾 Station 只允許向區間外退出', () => {
  const { controller } = createController()
  controller.enter(0, 0)
  assert.equal(controller.canExit(-1), true)
  assert.equal(controller.canExit(1), false)

  controller.enter(journeyStations.points.length - 1, 0)
  assert.equal(controller.canExit(1), true)
  assert.equal(controller.canExit(-1), false)
})

test('prefers-reduced-motion 模式在下一次 update 直接抵達', () => {
  const { controller } = createController({ reducedMotion: true })
  controller.enter(0, 0)
  controller.update(journeyStations.rearmDelay)
  controller.trigger(1, 500)

  const state = controller.update(500)
  assert.equal(state.arrived, true)
  assert.equal(state.station.id, 'city-billboard')
})

test('第三幕最終站至少停留一秒才重新 armed', () => {
  const { controller } = createController()
  const finalIndex = journeyStations.points.length - 1
  controller.enter(finalIndex, 100)

  assert.equal(controller.update(1099).armed, false)
  assert.equal(controller.update(1100).armed, true)
})
