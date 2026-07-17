import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { glass, glassFacade, glassGridOverlay, litWindow, flat, standard, emissive, galvanizedSteel, box, island, palette, seededRandom } from '../flight/stage/materials.js'

/**
 * 場景 02：城市（Projects）——兩拍式（視覺參考 Marvel's Spider-Man PS5）：
 *  拍 1「天際線」：大樓林立、滿是細小發光窗（遠景 establishing）。
 *  拍 2「玻璃鏡面」：下滑突然拉超近到 hero 玻璃帷幕（THREE.Reflector），
 *    整面玻璃映射「對面的大型霓虹看板」——一塊霓虹字 = 一個作品（userData.project）。
 * 玻璃底色反射另由 scene.environment 提供；霓虹靠自發光。維持深夜。
 */

/** 看板彩蛋：少量共生體殘留與蛛網，只有貼近看板時才會發現。 */
function addSpiderManEasterEgg(parent) {
  // 共生體不是平面黑漆：濕潤、高光、由結節分出不規則細觸鬚，月光下會出現冷色輪廓。
  const symbioteMat = standard(0x050609, {
    roughness: 0.2,
    metalness: 0.08,
    envMapIntensity: 2.1,
  })
  const addTendril = (points, radius) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, 7, false), symbioteMat)
    parent.add(mesh)
  }
  const addFluidSlick = () => {
    // 有面積的薄液膜貼住背板，觸手由液膜邊緣長出；不是數條懸空線。
    const shape = new THREE.Shape()
    shape.moveTo(-3.24, 12.73)
    shape.bezierCurveTo(-2.98, 12.78, -2.62, 12.73, -2.36, 12.66)
    shape.bezierCurveTo(-2.5, 12.54, -2.7, 12.52, -2.78, 12.38)
    shape.bezierCurveTo(-2.88, 12.2, -2.85, 11.96, -3.02, 11.78)
    shape.bezierCurveTo(-3.16, 11.99, -3.08, 12.25, -3.19, 12.42)
    shape.bezierCurveTo(-3.28, 12.54, -3.3, 12.64, -3.24, 12.73)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.032,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.018,
      bevelThickness: 0.012,
      curveSegments: 8,
    })
    const slick = new THREE.Mesh(geo, symbioteMat)
    slick.position.z = 0.405 // 背板後表面 z=0.41，微幅包覆避免 z-fighting
    parent.add(slick)
  }
  for (const [x, y, sx, sy, rz] of [
    [-3.02, 12.69, 0.38, 0.055, -0.16], [-2.68, 12.72, 0.28, 0.045, 0.1], [-3.15, 12.55, 0.24, 0.05, -0.7],
  ]) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 9), symbioteMat)
    blob.scale.set(sx / 0.18, sy / 0.18, 0.1)
    blob.position.set(x, y, 0.105)
    blob.rotation.z = rz
    parent.add(blob)
  }
  addTendril([[-3.12, 12.67, 0.1], [-3.2, 12.48, 0.095], [-3.12, 12.25, 0.09]], 0.026)
  addTendril([[-2.88, 12.7, 0.1], [-2.58, 12.76, 0.095], [-2.34, 12.69, 0.09]], 0.02)
  addTendril([[-2.78, 12.65, 0.1], [-2.62, 12.5, 0.095], [-2.58, 12.34, 0.09]], 0.014)
  // 越過頂緣包到背板：從維修走道與背面也能看到共生體正在蔓延。
  addTendril([[-3.02, 12.7, 0.1], [-3.08, 12.78, 0.28], [-3.02, 12.68, 0.42]], 0.03)
  addTendril([[-2.74, 12.68, 0.11], [-2.35, 12.78, 0.28], [-1.92, 12.68, 0.42]], 0.022)
  addFluidSlick()
  addTendril([[-3.05, 12.34, 0.43], [-3.14, 12.02, 0.432], [-3.04, 11.55, 0.43]], 0.019)
  addTendril([[-2.76, 12.42, 0.43], [-2.5, 12.16, 0.432], [-2.42, 11.84, 0.43]], 0.014)
  addTendril([[-2.48, 12.61, 0.43], [-2.16, 12.7, 0.432], [-1.72, 12.54, 0.43]], 0.011)

  // 右上蛛網使用細圓管而非永遠自亮的白線，才能隨冷色月光呈現若隱若現的銀灰高光。
  const webMat = standard(0xaebdca, { roughness: 0.7, metalness: 0.05 })
  const webTube = (points) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z = 0.1]) => new THREE.Vector3(x, y, z)))
    parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.008, 5, false), webMat))
  }
  const corner = [3.13, 12.72]
  const ends = [[2.35, 12.72], [2.48, 12.35], [2.75, 12.08], [3.13, 11.98]]
  ends.forEach((end) => webTube([corner, end]))
  for (const k of [0.3, 0.55, 0.78]) {
    const arc = ends.map(([x, y]) => [corner[0] + (x - corner[0]) * k, corner[1] + (y - corner[1]) * k])
    webTube(arc)
  }
  // 部分絲線跨過頂框黏到背架，避免正面像貼紙、背面完全消失。
  webTube([[3.13, 12.72, 0.1], [3.16, 12.79, 0.31], [3.04, 12.66, 0.54], [2.76, 12.38, 0.56]])
  webTube([[2.72, 12.55, 0.1], [2.9, 12.77, 0.3], [2.68, 12.7, 0.54], [2.4, 12.5, 0.56]])
  webTube([[3.04, 12.66, 0.54], [2.68, 12.42, 0.55], [2.42, 12.12, 0.56]])
}

export function buildCity(ctx = {}) {
  const g = new THREE.Group()
  const B = island(g, 34, 26, 60, -2, -30)
  const rnd = seededRandom(7)

  /* 地面街景（Alvis 選案：人行道＋馬路，不是蓋滿樓）：
   * 柏油鋪滿島面；hero 與看板樓之間那條窄巷就是「馬路」，兩側人行道，
   * 車道虛線沿 x 向。 */
  box(B, 34, 0.06, 26, flat(0x181b22), 0, 0.03, 0) // 街廓地面
  box(B, 34, 0.025, 3.4, flat(0x101218), 0, 0.07, -1.7) // 兩排大樓中間的連續車道
  box(B, 34, 0.08, 1.2, flat(0x2b303c), 0, 0.05, -4.0) // 人行道（hero 側）
  box(B, 34, 0.08, 1.2, flat(0x2b303c), 0, 0.05, 0.55) // 人行道（看板樓側）
  for (let x = -15; x <= 15; x += 2.4) {
    box(B, 1.1, 0.02, 0.12, flat(0x9aa0ad), x, 0.08, -1.7) // 車道虛線
  }

  // 月亮：掛在城市上空，冷色月光映照大樓（DirectionalLight）＋bloom 光暈
  {
    // NASA LRO CGI Moon Kit：真實球面反照率＋LOLA 高度圖，不再程序化亂畫坑洞。
    const loader = new THREE.TextureLoader()
    const moonTex = loader.load('/textures/moon-color-nasa.jpg')
    const moonBump = loader.load('/textures/moon-height-nasa.jpg')
    moonTex.colorSpace = THREE.SRGBColorSpace
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 96, 64),
      standard(0xbfc1c1, {
        map: moonTex,
        bumpMap: moonBump,
        bumpScale: 0.055,
        roughness: 1,
        metalness: 0,
        emissive: 0x737b84,
        emissiveMap: moonTex,
        emissiveIntensity: 0.26,
      })
    )
    moon.position.set(-20, 28, -18)
    moon.rotation.y = Math.PI * 0.52
    moon.visible = false
    B.add(moon)
    // 貼著月面輪廓的 Fresnel 邊緣光：只亮球體外緣，不洗白中央的月海與坑洞。
    const moonRim = new THREE.Mesh(
      new THREE.SphereGeometry(2.46, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying float vRim;
          void main() {
            vec3 viewNormal = normalize(normalMatrix * normal);
            vec3 viewDir = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
            vRim = pow(1.0 - max(dot(viewNormal, viewDir), 0.0), 3.2);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vRim;
          void main() {
            gl_FragColor = vec4(vec3(0.50, 0.68, 0.86) * vRim, vRim * 0.32);
          }
        `,
      })
    )
    moon.add(moonRim)
    // 光暈用永遠朝向鏡頭的柔邊 sprite；不提高月面曝光，仍保留月海與坑洞細節。
    const hc = document.createElement('canvas')
    hc.width = hc.height = 128
    const hctx = hc.getContext('2d')
    const hg = hctx.createRadialGradient(64, 64, 42, 64, 64, 64)
    hg.addColorStop(0, 'rgba(190,211,231,0.16)')
    hg.addColorStop(0.55, 'rgba(132,164,196,0.07)')
    hg.addColorStop(1, 'rgba(92,137,184,0)')
    hctx.fillStyle = hg
    hctx.fillRect(0, 0, 128, 128)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(hc),
      color: 0xb5d3ee,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }))
    halo.scale.set(5.9, 5.9, 1)
    halo.position.copy(moon.position)
    halo.visible = false
    B.add(halo)
    g.userData.cityMoon = moon
    g.userData.cityMoonHalo = halo
    // Insomniac 式夜景不是把月亮本身炸亮，而是讓同一方向的冷色主光
    // 擦過屋頂與立面，留下清楚輪廓；低強度半球光只救回暗部資訊。
    const moonlight = new THREE.DirectionalLight(0xb2cbe2, 0.82)
    moonlight.position.copy(moon.position)
    moonlight.target.position.set(4, 5, -2)
    B.add(moonlight)
    B.add(moonlight.target)
    const moonFill = new THREE.HemisphereLight(0x6f94b8, 0x1d2d45, 0.68)
    B.add(moonFill)

    // 玻璃停點起才升起的低角度暖陽：先輕擦建築與看板，再銜接第三幕完整破曉。
    const sunrise = new THREE.DirectionalLight(0xffb878, 0)
    sunrise.position.set(-16, 9, 12)
    sunrise.target.position.set(0, 7, -5)
    B.add(sunrise)
    B.add(sunrise.target)
    g.userData.citySunrise = sunrise
  }

  // 共用窗燈材質/幾何：亮的是「一整格」，天花板燈上亮下暗透出玻璃（真實大樓夜景）
  const warmWin = litWindow(true)
  const coolWin = litWindow(false)
  const paneGeo = new THREE.PlaneGeometry(0.86, 0.74) // 略小於一格(1.0×0.9)，留出窗櫺
  const PW = 1.0 // 格寬（與 glassFacade repeat w/8 對齊）
  const PH = 0.9 // 格高（與 h/7.2 對齊）

  // 小樓：鏡面帷幕牆。正/背面與側面各依「自己那面的寬度」配格距——每一面格線才對齊
  const roofMat = glass(palette.glassCool)
  const tower = (x, z, w, d, h, litChance = 0.06) => {
    const cool = rnd() < 0.5
    const front = glassFacade(w, h, cool)
    const side = glassFacade(d, h, cool)
    // BoxGeometry 材質順序:px,nx,py(頂),ny(底),pz,nz
    box(B, w, h, d, [side, side, roofMat, roofMat, front, front], x, h / 2, z)
    // 亮燈的窗：四個立面都貼齊帷幕格（格中心）。鏡頭環繞城市時不會再出現
    // 正面有燈、轉到背面便像整棟停電的情況。
    const cols = Math.floor(w / PW)
    const rows = Math.floor(h / PH)
    const addLitPane = (px, py, pz, rotationY = 0, chance = litChance) => {
      if (rnd() > chance) return
      const q = new THREE.Mesh(paneGeo, rnd() < 0.68 ? warmWin : coolWin)
      q.position.set(px, py, pz)
      q.rotation.y = rotationY
      B.add(q)
    }
    for (let j = 0; j < rows; j++) {
      const y = (j + 0.5) * PH
      for (let i = 0; i < cols; i++) {
        const px = x - w / 2 + (i + 0.5) * PW
        addLitPane(px, y, z + d / 2 + 0.02)
        addLitPane(px, y, z - d / 2 - 0.02, Math.PI)
      }
    }
    const sideCols = Math.floor(d / PW)
    for (let j = 0; j < rows; j++) {
      const y = (j + 0.5) * PH
      for (let i = 0; i < sideCols; i++) {
        const pz = z - d / 2 + (i + 0.5) * PW
        addLitPane(x + w / 2 + 0.02, y, pz, Math.PI / 2, litChance * 1.15)
        addLitPane(x - w / 2 - 0.02, y, pz, -Math.PI / 2, litChance * 1.15)
      }
    }
  }

  /* 比例原則（Alvis 2026-07-16）：遠看必須是「大樓很密」的正常城市；
   * hero 只是其中一棟（稍高），拉近時它才自然放大填滿畫面——
   * 不可以一開始就杵一棟超大平板樓，超不自然。 */

  // hero 玻璃塔：樓群中的一棟正常大樓（稍高），正面(+z)掛 Reflector 玻璃帷幕
  const heroW = 4.2
  const heroH = 15
  const heroD = 3.5
  const heroZ = -6
  {
    const f = glassFacade(heroW, heroH, true)
    box(B, heroW, heroH, heroD, [f, f, roofMat, roofMat, f, f], 0, heroH / 2, heroZ)
  }
  // 鏡面鋪滿整面牆（尺寸=樓體，格線 repeat 才會與側面的行列對齊）
  const mirror = new Reflector(new THREE.PlaneGeometry(heroW, heroH), {
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x5b6675,
  })
  mirror.position.set(0, heroH * 0.5, heroZ + heroD / 2 + 0.05)
  // Reflector×EffectComposer 相容處理：Reflector 的 onBeforeRender 若在 composer
  // 的 pass 中觸發會弄髒 viewport（畫面被擠到角落）。改成「手動更新」：
  // 把原 hook 存到 userData.updateReflection（FlightStage 每 frame 在 composer.render
  // 前呼叫），原 hook 換成 no-op，composer pass 期間就不會再觸發。
  const reflectorRender = mirror.onBeforeRender
  mirror.userData.updateReflection = (renderer, scene, camera) => reflectorRender(renderer, scene, camera)
  mirror.onBeforeRender = () => {}
  B.add(mirror)
  // 窗櫺格 overlay：讓真實反射「一格一格」顯示，而不是一整面大鏡子（同樣鋪滿）
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(heroW, heroH),
    glassGridOverlay(heroW, heroH)
  )
  grid.position.set(0, heroH * 0.5, heroZ + heroD / 2 + 0.08)
  B.add(grid)

  // 對街改成較矮的屋頂看板樓：鋼架、維修走道、護欄與支柱都留出輪廓，
  // 看板不再像一塊貼在玻璃牆上的板子。面朝 -z，仍供 hero 玻璃反射。
  const signRoofY = 7.2
  tower(0, 2.4, 5.5, 4, signRoofY, 0.08)
  // 戶外看板背架多為鍍鋅鋼：銀灰、偏霧面，不是黑色烤漆。
  const frameMat = galvanizedSteel(0xa8adb1)
  const backMat = galvanizedSteel(0x858b90, { roughness: 0.62, metalness: 0.58 })
  const billboardTex = new THREE.TextureLoader().load('/textures/system-billboard.png')
  billboardTex.colorSpace = THREE.SRGBColorSpace
  billboardTex.anisotropy = 8
  // 主要觀看方式是 hero 玻璃反射；先水平鏡像，經 Reflector 再翻一次後文字才可讀。
  billboardTex.wrapS = THREE.RepeatWrapping
  billboardTex.repeat.x = -1
  billboardTex.offset.x = 1
  const boardMat = standard(0xffffff, {
    map: billboardTex,
    emissive: 0xffffff,
    emissiveMap: billboardTex,
    emissiveIntensity: 0.32,
    roughness: 0.38,
    metalness: 0.08,
  })
  box(B, 6.6, 5.2, 0.22, backMat, 0, 10.15, 0.3) // 鍍鋅鋼背板
  // 原圖 1402×1122（1.25:1），保留比例鋪在正面，不再疊三行霓虹文字。
  box(B, 6.1, 4.88, 0.04, boardMat, 0, 10.15, 0.16)
  for (const x of [-2.45, 0, 2.45]) {
    box(B, 0.12, 2.1, 0.12, frameMat, x, 8.05, 1.05) // 後方鋼柱
    const brace = box(B, 0.08, 2.2, 0.08, frameMat, x, 8.2, 0.72)
    brace.rotation.x = -0.34
  }
  box(B, 6.5, 0.1, 0.75, frameMat, 0, 7.55, 0.86) // 維修走道
  // 背板後表面在 z=0.41；護欄至少退到 0.58，避免共面造成閃爍(z-fighting)。
  for (const z of [0.58, 1.22]) {
    box(B, 6.5, 0.06, 0.06, frameMat, 0, 8.18, z)
    for (let x = -3.2; x <= 3.2; x += 0.8) box(B, 0.05, 0.65, 0.05, frameMat, x, 7.86, z)
  }
  addSpiderManEasterEgg(B)

  // 密集樓群：車道沿 x 軸貫穿，樓只分布在道路南北兩側；另外避開 hero 與看板樓。
  // 生成範圍擴到整座島，補掉原本右後方與邊角的大面積空洞。
  for (let i = 0; i < 72; i++) {
    const x = (rnd() - 0.5) * 31.5
    const z = -11.5 + rnd() * 22.5
    const w = 1.15 + rnd() * 1.75
    const d = 1.15 + rnd() * 1.75
    if (z - d / 2 < 0.1 && z + d / 2 > -3.5) continue // 馬路＋兩側人行道
    if (Math.abs(x) < 3.2 && z > -8.2 && z < -3.9) continue // hero
    if (Math.abs(x) < 3.6 && z > 0.1 && z < 4.8) continue // 看板樓
    const nearCamera = x > 4
    const h = 3.2 + rnd() * (nearCamera ? 7 : 10)
    tower(x, z, w, d, h, nearCamera ? 0.17 : 0.1)
  }

  return g
}

/** 城市可提前 build 預載，但在書桌 shot 結束前整組保持不可見，避免月球／樓群穿幫。 */
export function updateCity(group, t) {
  group.visible = t >= 0.16 && t <= 0.42
  // 桌面仍占畫面時絕不顯示月球；接近城市 establishing shot 才出現。
  if (group.userData.cityMoon) group.userData.cityMoon.visible = t >= 0.2 && t <= 0.4
  if (group.userData.cityMoonHalo) group.userData.cityMoonHalo.visible = t >= 0.2 && t <= 0.4
  if (group.userData.citySunrise) {
    group.userData.citySunrise.intensity = THREE.MathUtils.smoothstep(t, 0.3, 0.37) * 0.48
  }
}
