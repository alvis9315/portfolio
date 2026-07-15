import { disposeGroup } from './materials.js'

/**
 * 場景 lazy 建構層：場景不是一開始全部建好，而是
 * 「progress 接近某場景的區間時才 build，遠離後 dispose 釋放記憶體」。
 *
 * registry 條目介面：
 *   {
 *     id: string,
 *     range: [a, b],          // 這個場景在飛行中「出鏡」的全域 t 區間
 *     build(ctx) => Group,     // 純函數：建好回傳 Group（不要自己 add 進 scene）
 *     dispose?(group)          // 可選；預設遍歷釋放 geometry / material
 *   }
 *
 * ctx 由 FlightStage 傳入（目前含 { content }），場景要吃真實資料就從這拿。
 *
 * margin 是預載提前量：0.12 表示 t 進入 range 前 12% 就開始建，
 * 避免鏡頭飛到了場景才 pop 出來。damping 越大（鏡頭越跟手）margin 要越大。
 */
export function createSceneManager(scene, registry, { margin = 0.12 } = {}) {
  const live = new Map()

  function update(t, ctx = {}) {
    for (const entry of registry) {
      const [a, b] = entry.range
      const near = t >= a - margin && t <= b + margin
      const mounted = live.has(entry.id)
      if (near && !mounted) {
        const group = entry.build(ctx)
        scene.add(group)
        live.set(entry.id, group)
      } else if (!near && mounted) {
        const group = live.get(entry.id)
        scene.remove(group)
        ;(entry.dispose || disposeGroup)(group)
        live.delete(entry.id)
      }
    }
  }

  function destroy() {
    for (const [id, group] of live) {
      scene.remove(group)
      const entry = registry.find((e) => e.id === id)
      ;(entry?.dispose || disposeGroup)(group)
    }
    live.clear()
  }

  return { update, destroy, live }
}
