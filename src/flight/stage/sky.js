import * as THREE from 'three'

/**
 * 漸層天空穹頂 + 時間系統：背景不再是死平的單色。
 * 大球內面畫「天頂 → 地平線 → 地面」三段漸層（shader），並由 progress 驅動
 * 「深夜 → 破曉」的顏色插值；fog 顏色同步地平線色（氛圍鐵律：fog = 背景）。
 *
 * 時間曲線（暫定，場景 5/6 就緒後再校）：t < 0.6 深夜，0.6 → 1.0 漸亮到破曉。
 * 敘事：從摸黑起步，走到黎明。
 */

const NIGHT = {
  top: new THREE.Color(0x0a1124),
  horizon: new THREE.Color(0x1c2c4a),
  bottom: new THREE.Color(0x090d16),
}
const DAWN = {
  top: new THREE.Color(0x2b3a66),
  horizon: new THREE.Color(0xd98a5a),
  bottom: new THREE.Color(0x1c1a2e),
}

export function createSky() {
  const uniforms = {
    topColor: { value: NIGHT.top.clone() },
    horizonColor: { value: NIGHT.horizon.clone() },
    bottomColor: { value: NIGHT.bottom.clone() },
  }
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      void main() {
        float h = normalize(vPos).y;
        // smoothstep 雙段混合：地平線平滑無接縫（pow 版在 h=0 會出現一條線）
        vec3 c = mix(bottomColor, horizonColor, smoothstep(-0.45, -0.02, h));
        c = mix(c, topColor, smoothstep(0.03, 0.55, h));
        // 微量抖動消除大面積漸層的色帶(banding)
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        gl_FragColor = vec4(c + (n - 0.5) * 0.012, 1.0);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), mat)
  mesh.frustumCulled = false

  /** 每 frame 呼叫：t 驅動夜→曉插值，fog 顏色跟地平線色、fog 範圍隨旅程放晴。 */
  function update(t, fog) {
    const k = THREE.MathUtils.clamp((t - 0.6) / 0.4, 0, 1)
    uniforms.topColor.value.copy(NIGHT.top).lerp(DAWN.top, k)
    uniforms.horizonColor.value.copy(NIGHT.horizon).lerp(DAWN.horizon, k)
    uniforms.bottomColor.value.copy(NIGHT.bottom).lerp(DAWN.bottom, k)
    if (fog) {
      fog.color.copy(uniforms.horizonColor.value)
      // 第一幕近霧（far 55 藏住城市不早洩），離開書桌後（t>0.34）放晴讓城市遠景清楚
      const clear = THREE.MathUtils.clamp((t - 0.34) / 0.12, 0, 1)
      fog.near = 30 - 6 * clear
      fog.far = 55 + 60 * clear
    }
  }

  return {
    mesh,
    update,
    dispose: () => {
      mesh.geometry.dispose()
      mat.dispose()
    },
  }
}
