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
  horizon: new THREE.Color(0x819bb2),
  bottom: new THREE.Color(0x415b76),
}
const WARM_DAWN = {
  // 第二幕離場到第三幕前半：完整桃金清晨，之後再銜接既有晨藍。
  top: new THREE.Color(0x987b76),
  horizon: new THREE.Color(0xb68d6d),
  bottom: new THREE.Color(0x745047),
}
const MIXED_DAWN = {
  // 第三幕收尾：藍色天頂已回來，低空仍保留日出暖黃，作為暖晨與晨藍的橋段。
  top: new THREE.Color(0x668fb8),
  horizon: new THREE.Color(0x9f897a),
  bottom: new THREE.Color(0x625c68),
}
const MORNING = {
  // 暖陽結束後改為中性淺灰藍，不殘留桃黃／褐色染色。
  top: new THREE.Color(0x789bbd),
  horizon: new THREE.Color(0x8fa8bc),
  bottom: new THREE.Color(0x687f94),
}
// 保持在 Bloom threshold 以下，最終幕回歸乾淨科技藍灰，不形成白色曝光幕。
const FINAL_SKY = new THREE.Color(0x7894aa)

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
    dawnWarmth: { value: 0 },
    finalSolid: { value: 0 },
    finalColor: { value: FINAL_SKY.clone() },
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
      uniform float dawnWarmth;
      uniform float finalSolid;
      uniform vec3 finalColor;
      void main() {
        float h = normalize(vPos).y;
        // smoothstep 雙段混合：地平線平滑無接縫（pow 版在 h=0 會出現一條線）
        // 兩段範圍刻意重疊，讓俯視鏡頭中的藍／灰紫／暖黃沒有水平分界線。
        vec3 c = mix(bottomColor, horizonColor, smoothstep(-0.65, 0.15, h));
        // 第三幕採俯視鏡頭，天頂色必須在較低仰角就進場，否則整面背景只會讀成地平線暖色。
        c = mix(c, topColor, smoothstep(-0.2, 0.5, h));

        // 不直接把整片 horizonColor 插成橘色；暖光只是一條沿地平線展開的薄帶。
        // 這可避免夜藍與橘色在過渡中混成大面積灰粉／濁褐色。
        float warmBand = 1.0 - smoothstep(0.015, 0.18, abs(h));
        // 天空本身不應跨過全域 Bloom threshold；暖色留給城市日出光映在材質上。
        c = mix(c, vec3(0.58, 0.31, 0.14), warmBand * dawnWarmth * 0.5);

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
        // 第六幕連天空抖動、暖帶與舊漸層都收掉，輸出真正純色。
        c = mix(c + (n - 0.5) * 0.0015, finalColor, finalSolid);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), mat)
  mesh.frustumCulled = false

  /** 每 frame 呼叫：t 驅動夜→曉插值，fog 顏色跟地平線色、fog 範圍隨旅程放晴。 */
  function update(t, fog) {
    // 玻璃停點先收到暖光；離場後到第三幕前半維持完整暖陽，後半才混回晨藍。
    const dawn = THREE.MathUtils.smoothstep(t, 0.3, 0.36)
    const morning = THREE.MathUtils.smoothstep(t, 0.38, 0.43)
    const warmDawn = THREE.MathUtils.smoothstep(t, 0.32, 0.36)
      * (1 - THREE.MathUtils.smoothstep(t, 0.36, 0.41))
    const mixedDawn = THREE.MathUtils.smoothstep(t, 0.36, 0.39)
      * (1 - THREE.MathUtils.smoothstep(t, 0.39, 0.43))
    uniforms.topColor.value.copy(NIGHT.top).lerp(DAWN.top, dawn).lerp(MORNING.top, morning)
    uniforms.horizonColor.value.copy(NIGHT.horizon).lerp(DAWN.horizon, dawn).lerp(MORNING.horizon, morning)
    uniforms.bottomColor.value.copy(NIGHT.bottom).lerp(DAWN.bottom, dawn).lerp(MORNING.bottom, morning)
    uniforms.topColor.value.lerp(WARM_DAWN.top, warmDawn)
    uniforms.horizonColor.value.lerp(WARM_DAWN.horizon, warmDawn)
    uniforms.bottomColor.value.lerp(WARM_DAWN.bottom, warmDawn)
    uniforms.topColor.value.lerp(MIXED_DAWN.top, mixedDawn)
    uniforms.horizonColor.value.lerp(MIXED_DAWN.horizon, mixedDawn)
    uniforms.bottomColor.value.lerp(MIXED_DAWN.bottom, mixedDawn)
    // 最終幕收斂成單色清晨，避免球形天空 bottom band 在左下角形成假轉場。
    const flatten = THREE.MathUtils.smoothstep(t, 0.82, 0.85)
    uniforms.topColor.value.lerp(FINAL_SKY, flatten)
    uniforms.horizonColor.value.lerp(FINAL_SKY, flatten)
    uniforms.bottomColor.value.lerp(FINAL_SKY, flatten)
    uniforms.bendTime.value = performance.now() * 0.001
    uniforms.bendOpacity.value = 0.55 * (1 - THREE.MathUtils.smoothstep(t, 0.1, 0.17))
    // 接近第三幕定點時暖陽已明顯退到低空，準備轉入藍天晨色。
    uniforms.dawnWarmth.value = dawn * (1 - THREE.MathUtils.smoothstep(t, 0.36, 0.43))
    uniforms.finalSolid.value = flatten
    if (fog) {
      fog.color.copy(uniforms.horizonColor.value)
      // 第一幕近霧藏住城市；無人機幕開始後快速放晴，不讓樓群罩上一層灰霧。
      const clear = THREE.MathUtils.clamp((t - 0.16) / 0.08, 0, 1)
      const morningClear = THREE.MathUtils.smoothstep(t, 0.36, 0.45)
      fog.near = THREE.MathUtils.lerp(30 - 6 * clear, 52, morningClear)
      fog.far = THREE.MathUtils.lerp(55 + 60 * clear, 210, morningClear)
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
