import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { Text } from 'troika-three-text'
import { glass, glassFacade, glassGridOverlay, litWindow, flat, box, island, palette, seededRandom } from '../flight/stage/materials.js'

/**
 * 場景 02：城市（Projects）——兩拍式（視覺參考 Marvel's Spider-Man PS5）：
 *  拍 1「天際線」：大樓林立、滿是細小發光窗（遠景 establishing）。
 *  拍 2「玻璃鏡面」：下滑突然拉超近到 hero 玻璃帷幕（THREE.Reflector），
 *    整面玻璃映射「對面的大型霓虹看板」——一塊霓虹字 = 一個作品（userData.project）。
 * 玻璃底色反射另由 scene.environment 提供；霓虹靠自發光。維持深夜。
 */

const NEON = [0x18e0ff, 0xff43c4, 0xffd166, 0x7cff6b]

/**
 * 霓虹招牌：troika-three-text SDF 文字（任何距離都銳利，outlineBlur 做霓虹光暈）。
 * 招牌的「主要觀看方式」是玻璃反射：scale.x = -1 預先鏡像，反射再翻一次字就正了
 * （直視招牌本體是反的，可接受）。字型預設從 CDN 載 Roboto——TODO 之後自架字型檔。
 */
function neonSign(name, hex) {
  const t = new Text()
  t.text = name
  t.fontSize = 0.62 // 看板寬 6.2，最長專案名要塞得下
  t.color = hex
  t.anchorX = 'center'
  t.anchorY = 'middle'
  t.outlineBlur = 0.14 // 霓虹光暈
  t.outlineColor = hex
  t.outlineOpacity = 0.85
  t.material.side = THREE.DoubleSide
  t.rotation.y = Math.PI // 面向 -z（朝玻璃）
  t.scale.x = -1 // 預先鏡像（見上）
  t.sync()
  return t
}

export function buildCity(ctx = {}) {
  const projects = ctx.content?.projects || []
  const g = new THREE.Group()
  const B = island(g, 34, 26, 60, -2, -30)
  const rnd = seededRandom(7)

  /* 地面街景（Alvis 選案：人行道＋馬路，不是蓋滿樓）：
   * 柏油鋪滿島面；hero 與看板樓之間那條窄巷就是「馬路」，兩側人行道，
   * 車道虛線沿 x 向。 */
  box(B, 34, 0.06, 26, flat(0x14161c), 0, 0.03, 0) // 柏油
  box(B, 34, 0.08, 1.2, flat(0x2b303c), 0, 0.05, -4.0) // 人行道（hero 側）
  box(B, 34, 0.08, 1.2, flat(0x2b303c), 0, 0.05, 0.55) // 人行道（看板樓側）
  for (let x = -15; x <= 15; x += 2.4) {
    box(B, 1.1, 0.02, 0.12, flat(0x9aa0ad), x, 0.08, -1.7) // 車道虛線
  }

  // 月亮：掛在城市上空，冷色月光映照大樓（DirectionalLight）＋bloom 光暈
  {
    const mc = document.createElement('canvas')
    mc.width = 128
    mc.height = 128
    const mctx = mc.getContext('2d')
    mctx.fillStyle = '#eae6da'
    mctx.beginPath()
    mctx.arc(64, 64, 63, 0, Math.PI * 2)
    mctx.fill()
    for (let i = 0; i < 9; i++) { // 月海斑塊，遠看有「真月亮」的質感
      mctx.fillStyle = `rgba(176,172,160,${0.25 + Math.random() * 0.3})`
      mctx.beginPath()
      mctx.arc(20 + Math.random() * 88, 20 + Math.random() * 88, 5 + Math.random() * 13, 0, Math.PI * 2)
      mctx.fill()
    }
    const moonTex = new THREE.CanvasTexture(mc)
    moonTex.colorSpace = THREE.SRGBColorSpace
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 24, 18),
      new THREE.MeshBasicMaterial({ map: moonTex })
    )
    moon.position.set(-20, 28, -18)
    B.add(moon)
    const moonlight = new THREE.DirectionalLight(0xcfe0f2, 0.6) // 月光灑在樓面
    moonlight.position.copy(moon.position)
    moonlight.target.position.set(4, 5, -2)
    B.add(moonlight)
    B.add(moonlight.target)
  }

  // 共用窗燈材質/幾何：亮的是「一整格」，天花板燈上亮下暗透出玻璃（真實大樓夜景）
  const warmWin = litWindow(true)
  const coolWin = litWindow(false)
  const paneGeo = new THREE.PlaneGeometry(0.86, 0.74) // 略小於一格(1.0×0.9)，留出窗櫺
  const PW = 1.0 // 格寬（與 glassFacade repeat w/8 對齊）
  const PH = 0.9 // 格高（與 h/7.2 對齊）

  // 小樓：鏡面帷幕牆。正/背面與側面各依「自己那面的寬度」配格距——每一面格線才對齊
  const roofMat = glass(palette.glassCool)
  const tower = (x, z, w, d, h) => {
    const cool = rnd() < 0.5
    const front = glassFacade(w, h, cool)
    const side = glassFacade(d, h, cool)
    // BoxGeometry 材質順序:px,nx,py(頂),ny(底),pz,nz
    box(B, w, h, d, [side, side, roofMat, roofMat, front, front], x, h / 2, z)
    // 亮燈的窗：貼齊帷幕格（格中心），亮的是一整格
    const cols = Math.floor(w / PW)
    const rows = Math.floor(h / PH)
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (rnd() > 0.06) continue
        const q = new THREE.Mesh(paneGeo, rnd() < 0.7 ? warmWin : coolWin)
        q.position.set(x - w / 2 + (i + 0.5) * PW, (j + 0.5) * PH, z + d / 2 + 0.02)
        B.add(q)
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
  // 鏡面鋪滿整面牆（缺一角會露出底下材質造成上下色差）
  const mirror = new Reflector(new THREE.PlaneGeometry(heroW * 0.99, heroH * 0.99), {
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
    new THREE.PlaneGeometry(heroW * 0.99, heroH * 0.99),
    glassGridOverlay(heroW * 0.99, heroH * 0.99)
  )
  grid.position.set(0, heroH * 0.5, heroZ + heroD / 2 + 0.08)
  B.add(grid)

  // 對街看板樓：窄巷（街寬 ~4.2）對面的一棟正常樓，看板掛樓面朝 -z（朝玻璃）。
  // 樓加高、看板與三行字整體上移——反射視角（鏡頭在低處往上看）三行才全都露出。
  tower(0, 2.4, 5.5, 4, 14)
  box(B, 6.6, 5.2, 0.3, glass(palette.glassWarm), 0, 10.4, 0.3) // 看板板體
  projects.forEach((p, i) => {
    const sign = neonSign(p.name, NEON[i % NEON.length])
    sign.position.set(0, 11.9 - i * 1.5, 0.12)
    sign.userData.project = p
    B.add(sign)
  })

  // 密集樓群：填滿整座島，只留 hero–看板之間的窄巷走廊
  for (let i = 0; i < 44; i++) {
    const x = (rnd() - 0.5) * 32
    const z = -11 + rnd() * 16
    if (Math.abs(x) < 3.8 && z > -9 && z < 5.5) continue // hero + 窄巷 + 看板樓走廊
    tower(x, z, 1.2 + rnd() * 1.8, 1.2 + rnd() * 1.8, 3 + rnd() * (x > 5 ? 5 : 9))
  }

  return g
}
