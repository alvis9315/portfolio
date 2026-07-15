import * as THREE from 'three'
import { linear, clamp01 } from './easing.js'

/**
 * 編排層：把多個 shot 串成一條連續飛行。
 *
 * segments: [{ shot, range: [a, b], easing? }]
 *  - range 是全域 t 的區間；區間之間允許留空隙（gap）——
 *    gap 期間鏡頭停在上一個 shot 的結尾（hold），正好給使用者閱讀文字。
 *
 * Seam rule（抄自 scroll-world repo 的核心智慧）：
 *  相鄰兩個 shot，前者 t=1 的 pose 必須等於後者 t=0 的 pose，
 *  否則鏡頭會「跳」。validateSeams() 在開發期自動檢查。
 */
export function composeShots(segments) {
  const segs = [...segments].sort((x, y) => x.range[0] - y.range[0])

  function getPose(t, pos, look) {
    t = clamp01(t)
    let s = segs[0]
    for (const g of segs) if (t >= g.range[0]) s = g
    const [a, b] = s.range
    const local = clamp01((t - a) / Math.max(b - a, 1e-6))
    s.shot.getPose((s.easing || linear)(local), pos, look)
  }

  function validateSeams(eps = 0.05) {
    const p1 = new THREE.Vector3(), l1 = new THREE.Vector3()
    const p2 = new THREE.Vector3(), l2 = new THREE.Vector3()
    const issues = []
    for (let i = 0; i < segs.length - 1; i++) {
      segs[i].shot.getPose(1, p1, l1)
      segs[i + 1].shot.getPose(0, p2, l2)
      const positionGap = p1.distanceTo(p2)
      const lookGap = l1.distanceTo(l2)
      if (positionGap > eps || lookGap > eps) {
        issues.push({ between: [i, i + 1], positionGap, lookGap })
      }
    }
    return issues
  }

  return { getPose, validateSeams, segments: segs }
}
