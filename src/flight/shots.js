import * as THREE from 'three'

/**
 * Shot 層：每種運鏡是一個工廠函數，回傳統一介面：
 *
 *   { getPose(localT, outPosition, outLookAt) }
 *
 * localT 是該 shot 自己的 0~1（由 composeShots 換算 + easing）。
 * 寫入傳入的 Vector3（out 參數），避免每 frame 產生新物件。
 *
 * 新增自訂 shot 只要遵守這個 contract，即可被 composeShots 編排。
 */

const v = (a) => new THREE.Vector3(...a)

/** Dolly-in（推軌拉近）：直線逼近，視線鎖定目標。原 scroll-world repo 的招牌運鏡。 */
export function dollyIn({ from, to, target }) {
  const A = v(from), B = v(to), T = v(target)
  return {
    getPose(t, pos, look) {
      pos.lerpVectors(A, B, t)
      look.copy(T)
    },
  }
}

/** Line（直線位移 + 視線轉移）：dollyIn 的泛化版，position 與 lookAt 各自 lerp。適合 crane 升降、離場等。 */
export function line({ fromPos, toPos, fromLook, toLook }) {
  const P0 = v(fromPos), P1 = v(toPos)
  const L0 = v(fromLook), L1 = v(toLook)
  return {
    getPose(t, pos, look) {
      pos.lerpVectors(P0, P1, t)
      look.lerpVectors(L0, L1, t)
    },
  }
}

/** Fly-through（穿越）：position 與 lookAt 各沿一條 CatmullRom 曲線前進。 */
export function flyThrough({ path, look, tension = 0.5 }) {
  const P = new THREE.CatmullRomCurve3(path.map(v), false, 'catmullrom', tension)
  const L = new THREE.CatmullRomCurve3(look.map(v), false, 'catmullrom', tension)
  return {
    getPose(t, pos, lk) {
      P.getPointAt(t, pos)
      L.getPointAt(t, lk)
    },
  }
}

/** Orbit（環繞）：繞著 center 畫弧，視線鎖定 target（預設即 center）。適合展示單一作品。 */
export function orbit({ center, radius, height = 0, fromDeg = 0, toDeg = 180, target }) {
  const C = v(center)
  const T = target ? v(target) : C.clone()
  const a0 = THREE.MathUtils.degToRad(fromDeg)
  const a1 = THREE.MathUtils.degToRad(toDeg)
  return {
    getPose(t, pos, look) {
      const a = a0 + (a1 - a0) * t
      pos.set(C.x + Math.cos(a) * radius, C.y + height, C.z + Math.sin(a) * radius)
      look.copy(T)
    },
  }
}

/** Pan（定點搖鏡）：position 不動，只轉視線。適合開場環顧或收尾凝視。 */
export function pan({ position, fromLook, toLook }) {
  const P = v(position), L0 = v(fromLook), L1 = v(toLook)
  return {
    getPose(t, pos, look) {
      pos.copy(P)
      look.lerpVectors(L0, L1, t)
    },
  }
}
