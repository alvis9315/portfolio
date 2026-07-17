import * as THREE from 'three'

/**
 * 漸層天空穹頂 + 時間系統：背景不再是死平的單色。
 * 大球內面畫「天頂 → 地平線 → 地面」三段漸層（shader），並由 progress 驅動
 * 「深夜 → 金色破曉 → 清晨」的顏色插值；fog 顏色同步地平線色（氛圍鐵律：fog = 背景）。
 *
 * 時間曲線：第二幕大樓開始出現暖黃地平線，第三至五幕持續天亮，第六幕抵達早晨。
 */

const NIGHT = {
  // 遊戲化深夜：仍是 navy 夜色，但抬高中間調，讓不同螢幕都讀得到城市輪廓。
  top: new THREE.Color(0x081329),
  horizon: new THREE.Color(0x213c61),
  bottom: new THREE.Color(0x0c182b),
}
const DAWN = {
  // 第三幕停點：清晨藍與桃金暖光交界，暖色只留在低地平線。
  top: new THREE.Color(0x668fb8),
  horizon: new THREE.Color(0x9eb8ce),
  bottom: new THREE.Color(0x415b76),
}
const MORNING = {
  // 第四至六幕回到清透藍灰，承接室內場景而不突然變成正午純白。
  top: new THREE.Color(0x78a1c5),
  horizon: new THREE.Color(0xc3d2dc),
  bottom: new THREE.Color(0x71899d),
}
const FINAL_SKY = new THREE.Color(0x9bafc0)

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
    cloudAmount: { value: 0 },
    dawnWarmth: { value: 0 },
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
      uniform float cloudAmount;
      uniform float dawnWarmth;
      void main() {
        float h = normalize(vPos).y;
        // smoothstep 雙段混合：地平線平滑無接縫（pow 版在 h=0 會出現一條線）
        vec3 c = mix(bottomColor, horizonColor, smoothstep(-0.45, -0.02, h));
        c = mix(c, topColor, smoothstep(0.03, 0.55, h));

        // 不直接把整片 horizonColor 插成橘色；暖光只是一條沿地平線展開的薄帶。
        // 這可避免夜藍與橘色在過渡中混成大面積灰粉／濁褐色。
        float warmBand = 1.0 - smoothstep(0.015, 0.24, abs(h));
        c = mix(c, vec3(1.0, 0.63, 0.39), warmBand * dawnWarmth * 0.58);

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

        // 破曉後才浮現的低成本雲帶；只用方向向量，沒有球面 UV 接縫。
        // 暖色地平線仍看得見，雲層只負責建立「晨光正在進入藍天」的深度。
        vec3 dir = normalize(vPos);
        float cloudField = sin(dir.x * 13.0 + dir.z * 5.0)
          + 0.55 * sin(dir.x * 25.0 - dir.z * 11.0 + 1.7)
          + 0.3 * sin(dir.x * 47.0 + dir.z * 19.0 - 0.8);
        float cloudMask = smoothstep(0.05, 0.9, cloudField)
          * smoothstep(-0.08, 0.16, dir.y)
          * (1.0 - smoothstep(0.42, 0.72, dir.y));
        vec3 cloudColor = mix(vec3(0.56, 0.55, 0.58), vec3(0.68, 0.73, 0.78), smoothstep(0.0, 0.5, dir.y));
        c = mix(c, cloudColor, cloudMask * cloudAmount * 0.24);

        // 微量抖動消除色帶——量要極小,0.012 會整片髒顆粒感
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        gl_FragColor = vec4(c + (n - 0.5) * 0.0015, 1.0);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), mat)
  mesh.frustumCulled = false

  /** 每 frame 呼叫：t 驅動夜→曉插值，fog 顏色跟地平線色、fog 範圍隨旅程放晴。 */
  function update(t, fog) {
    // 玻璃停點仍是完整深夜；第二幕離場(.345)才破曉，第三幕停點(.43)抵達晨藍／暖光交界。
    const dawn = THREE.MathUtils.smoothstep(t, 0.345, 0.43)
    const morning = THREE.MathUtils.smoothstep(t, 0.43, 0.72)
    uniforms.topColor.value.copy(NIGHT.top).lerp(DAWN.top, dawn).lerp(MORNING.top, morning)
    uniforms.horizonColor.value.copy(NIGHT.horizon).lerp(DAWN.horizon, dawn).lerp(MORNING.horizon, morning)
    uniforms.bottomColor.value.copy(NIGHT.bottom).lerp(DAWN.bottom, dawn).lerp(MORNING.bottom, morning)
    // 最終幕收斂成單色清晨，避免球形天空 bottom band 在左下角形成假轉場。
    const flatten = THREE.MathUtils.smoothstep(t, 0.9, 0.98)
    uniforms.topColor.value.lerp(FINAL_SKY, flatten)
    uniforms.horizonColor.value.lerp(FINAL_SKY, flatten)
    uniforms.bottomColor.value.lerp(FINAL_SKY, flatten)
    uniforms.bendTime.value = performance.now() * 0.001
    uniforms.bendOpacity.value = 0.55 * (1 - THREE.MathUtils.smoothstep(t, 0.1, 0.17))
    uniforms.cloudAmount.value = THREE.MathUtils.smoothstep(t, 0.36, 0.45)
    uniforms.dawnWarmth.value = dawn * (1 - THREE.MathUtils.smoothstep(t, 0.48, 0.72) * 0.62)
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
