import * as THREE from 'three'

/**
 * 漸層天空穹頂 + 時間系統：背景不再是死平的單色。
 * 大球內面畫「天頂 → 地平線 → 地面」三段漸層（shader），並由 progress 驅動
 * 「深夜 → 破曉」的顏色插值；fog 顏色同步地平線色（氛圍鐵律：fog = 背景）。
 *
 * 時間曲線：第 1–4 幕深夜，第 5 幕開始回暖，第 6 幕抵達破曉。
 * 敘事：從摸黑起步，走到黎明。
 */

const NIGHT = {
  // 灰階深 navy：保留深夜層次，但降低飽和度，讓 oak／charcoal／黑色設備能待在同一空間。
  top: new THREE.Color(0x050916),
  horizon: new THREE.Color(0x14243d),
  bottom: new THREE.Color(0x080d18),
}
const DAWN = {
  // 冷藍破曉：暖意由第六幕的方向光提供，天空本身不整片變成濁橘褐。
  top: new THREE.Color(0x182b48),
  horizon: new THREE.Color(0x526f8b),
  bottom: new THREE.Color(0x1b2333),
}

export function createSky() {
  const uniforms = {
    topColor: { value: NIGHT.top.clone() },
    horizonColor: { value: NIGHT.horizon.clone() },
    bottomColor: { value: NIGHT.bottom.clone() },
    bendTime: { value: 0 },
    bendOpacity: { value: 0.55 },
    bendColor1: { value: new THREE.Color(0x00151f) },
    bendColor2: { value: new THREE.Color(0x2969ae) },
    bendColor3: { value: new THREE.Color(0x4b6c8b) },
  }
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec2 vUv;
      void main() {
        vPos = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      varying vec2 vUv;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 bendColor1;
      uniform vec3 bendColor2;
      uniform vec3 bendColor3;
      uniform float bendTime;
      uniform float bendOpacity;
      void main() {
        float h = normalize(vPos).y;
        // smoothstep 雙段混合：地平線平滑無接縫（pow 版在 h=0 會出現一條線）
        vec3 c = mix(bottomColor, horizonColor, smoothstep(-0.45, -0.02, h));
        c = mix(c, topColor, smoothstep(0.03, 0.55, h));

        // KnowledgeColorBends 的天空整合版：一個 renderer、一個天空 pass。
        // rotation=100°, speed=.25, scale=1, frequency=1.8, warp=1, bandWidth=2.5。
        vec2 p = vUv * 2.0 - 1.0;
        p = vec2(p.x * -0.173648 - p.y * 0.984808,
                 p.x *  0.984808 + p.y * -0.173648);
        vec2 q = vec2(p.x * 1.777778, p.y);
        q /= 0.5 + 0.2 * dot(q, q);
        float bendT = bendTime * 0.25;
        q += 0.2 * cos(bendT) - 7.56;

        vec3 bends = vec3(0.0);
        float cover = 0.0;
        vec2 s = q;
        for (int i = 0; i < 3; i++) {
          s -= 0.01;
          vec2 r = sin(1.5 * (s.yx * 1.8) + 2.0 * cos(s * 1.8));
          vec2 warped = s + (r - s);
          float m = length(warped + sin(5.0 * warped.y * 1.8 - 3.0 * bendT + float(i)) / 4.0);
          float w = 1.0 - exp(-2.5 / exp(2.5 * m));
          vec3 bandColor = i == 0 ? bendColor1 : (i == 1 ? bendColor2 : bendColor3);
          bends += bandColor * w;
          cover = max(cover, w);
        }
        bends = clamp(bends * 0.75, 0.0, 1.0);
        float bendNoise = fract(sin(dot(gl_FragCoord.xy + vec2(bendTime), vec2(12.9898, 78.233))) * 43758.5453);
        bends = clamp(bends + (bendNoise - 0.5) * 0.01, 0.0, 1.0);
        c = mix(c, bends, bendOpacity * cover);

        // 微量抖動消除色帶——量要極小,0.012 會整片髒顆粒感
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        gl_FragColor = vec4(c + (n - 0.5) * 0.0015, 1.0);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), mat)
  mesh.frustumCulled = false

  /** 每 frame 呼叫：t 驅動夜→曉插值，fog 顏色跟地平線色、fog 範圍隨旅程放晴。 */
  function update(t, fog) {
    const k = THREE.MathUtils.clamp((t - 0.7) / 0.3, 0, 1)
    uniforms.topColor.value.copy(NIGHT.top).lerp(DAWN.top, k)
    uniforms.horizonColor.value.copy(NIGHT.horizon).lerp(DAWN.horizon, k)
    uniforms.bottomColor.value.copy(NIGHT.bottom).lerp(DAWN.bottom, k)
    uniforms.bendTime.value = performance.now() * 0.001
    uniforms.bendOpacity.value = 0.55 * (1 - THREE.MathUtils.smoothstep(t, 0.1, 0.17))
    if (fog) {
      fog.color.copy(uniforms.horizonColor.value)
      // 第一幕近霧藏住城市；離開書桌後放晴，後續場景各自用 visible 區間隔離。
      const clear = THREE.MathUtils.clamp((t - 0.16) / 0.08, 0, 1)
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
