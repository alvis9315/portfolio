import * as THREE from 'three'
import { flat, focus, standard, monitorScreen, box, island, palette } from '../flight/stage/materials.js'

/**
 * 場景 01：工作桌（About / 開場）。
 * 刻意「乾淨」——只有電腦、鍵盤、滑鼠、檯燈與人體工學椅，代表故事尚未展開；
 * 第 6 幕「升級後的桌面」會多出一堆代表經歷的物件成對比。
 *
 * 螢幕開場全暗，鏡頭拉近才漸亮（updateWorkbench 隨 progress 驅動）——
 * 敘事：你靠近這張桌子，故事的螢幕才亮起。
 */

export function buildWorkbench() {
  const g = new THREE.Group()
  const floorW = 8.5
  const floorD = 6.5
  const A = island(g, floorW, floorD, 0, 0, 0, {
    top: palette.workbenchFloor,
    mid: palette.workbenchFloorMid,
    deep: palette.workbenchFloorDeep,
  })
  // 第一幕獨立空間的柔和補光：只微幅抬高暗部，不改桌椅與地板既有色相。
  const roomFill = new THREE.HemisphereLight(0xe1e5e8, 0x4a342c, 0.22)
  A.add(roomFill)
  // 暖灰木地板板縫：只包住工作區，不再像一座過大的展示台。
  const floorSeam = flat(0x5f3b30)
  for (let z = -2.9; z <= 2.9; z += 0.72) box(A, floorW - 0.16, 0.008, 0.014, floorSeam, 0, 0.008, z)
  for (let row = 0, z = -2.54; z < 2.9; row++, z += 0.72) {
    const offset = row % 2 ? 1.8 : 0
    for (let x = -3.6 + offset; x < 4.1; x += 3.6) box(A, 0.014, 0.009, 0.72, floorSeam, x, 0.009, z)
  }

  // 桌與椅共用同一個 PBR 布面色與材質 preset；同色碼配不同 shader 仍會看成不同色。
  const furnitureCream = standard(palette.wood, { roughness: 0.96, metalness: 0 })
  box(A, 4.6, 0.25, 2.2, furnitureCream, 0, 1.6, 0)
  for (const [x, z] of [[-2, 0.8], [2, 0.8], [-2, -0.8], [2, -0.8]]) {
    box(A, 0.25, 1.6, 0.25, furnitureCream, x, 0.8, z)
  }

  // 螢幕：開場暗屏（材質存進 userData，由 updateWorkbench 漸亮）
  box(A, 2.4, 1.5, 0.12, focus(palette.device), 0, 2.7, -0.5)
  const screenMat = monitorScreen()
  // 現代窄邊框：四周只留約 0.05 世界單位，不再是厚重黑框。
  box(A, 2.3, 1.38, 0.02, screenMat, 0, 2.7, -0.43)
  // 支架藏在面板背後，頂端只接到下框；先前 depth 太深，穿過面板形成中間凸塊。
  box(A, 0.18, 0.54, 0.12, focus(palette.device), 0, 1.99, -0.58)
  box(A, 0.86, 0.06, 0.46, focus(palette.device), 0, 1.78, -0.45)
  g.userData.screenMat = screenMat
  const screenLight = new THREE.PointLight(palette.screenBlue, 0, 2.6, 2)
  screenLight.position.set(0, 2.55, -0.05)
  A.add(screenLight)
  g.userData.screenLight = screenLight

  // 鍵盤：底板 + 一格格鍵帽（極深灰，不要濁綠）
  box(A, 1.6, 0.06, 0.62, focus(palette.device), 0, 1.78, 0.6)
  const keyMat = flat(palette.keycap)
  for (let r = 0; r < 4; r++) {
    if (r === 3) {
      box(A, 0.7, 0.05, 0.11, keyMat, 0, 1.82, 0.44 + r * 0.12) // 空白鍵
      continue
    }
    for (let c = 0; c < 11; c++) {
      box(A, 0.1, 0.05, 0.1, keyMat, -0.64 + c * 0.128, 1.82, 0.44 + r * 0.12)
    }
  }

  // 鍵盤左側的薄型鋁合金筆電：窄邊框、黑色 chiclet 鍵盤、大觸控板、雙轉軸與側邊接口。
  const laptop = new THREE.Group()
  const laptopMetal = focus(0x25282e, { roughness: 0.34, metalness: 0.62 })
  const laptopDark = focus(0x17181b, { roughness: 0.58, metalness: 0.1 })
  box(laptop, 1.22, 0.032, 0.78, laptopMetal, 0, 0.016, 0)
  box(laptop, 1.1, 0.009, 0.56, laptopDark, 0, 0.038, -0.05)
  const laptopKey = flat(0x202226)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 10; c++) {
      box(laptop, 0.075, 0.011, 0.066, laptopKey, -0.42 + c * 0.094, 0.049, -0.24 + r * 0.082)
    }
  }
  box(laptop, 0.48, 0.006, 0.22, flat(0x343840), 0, 0.048, 0.24)
  // 現代隱藏式長轉軸：上蓋以底邊為 pivot，直接連進機身，不再外露兩顆圓柱零件。
  const lid = new THREE.Group()
  lid.position.set(0, 0.045, -0.365)
  lid.rotation.x = -0.11
  box(lid, 1.22, 0.74, 0.024, laptopMetal, 0, 0.37, 0)
  const laptopScreen = standard(0x0b1118, { emissive: 0x0d2742, emissiveIntensity: 0.14, roughness: 0.36 })
  box(lid, 1.12, 0.64, 0.012, laptopScreen, 0, 0.37, 0.019)
  laptop.add(lid)
  box(laptop, 0.92, 0.026, 0.035, laptopDark, 0, 0.052, -0.365)
  // 左側兩個 USB-C 與右側耳機孔，用凹黑小件建立真實側面比例。
  for (const z of [-0.18, 0.02]) box(laptop, 0.012, 0.012, 0.09, laptopDark, -0.617, 0.022, z)
  const audioPort = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 10), laptopDark)
  audioPort.rotation.z = Math.PI / 2
  audioPort.position.set(0.617, 0.022, 0.08)
  laptop.add(audioPort)
  laptop.position.set(-1.48, 1.755, 0.58)
  laptop.rotation.y = Math.PI / 4 // 正面朝向椅子，而不是與桌緣平行
  laptop.scale.setScalar(0.74)
  A.add(laptop)

  // 滑鼠：深灰低背外殼，底部略埋入桌面形成自然半圓輪廓。
  const mouse = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 10),
    focus(palette.device, { roughness: 0.62, metalness: 0.08 })
  )
  mouse.scale.set(0.78, 0.34, 1.15)
  mouse.position.set(1.18, 1.76, 0.63)
  A.add(mouse)
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.055, 10),
    focus(0x343941, { roughness: 0.75 })
  )
  wheel.rotation.x = Math.PI / 2
  wheel.position.set(1.18, 1.815, 0.57)
  A.add(wheel)

  // 立燈：面對螢幕時在「螢幕左後方」的地板上（-x、-z），比桌面高很多，
  // 暖黃光從後左上方灑落桌面（Alvis 2026-07-16 定位）
  const lx = -3.2
  const lz = -2.2
  box(A, 0.64, 0.08, 0.64, focus(palette.steel), lx, 0.04, lz) // 底座（地板）
  box(A, 0.08, 4.2, 0.08, focus(palette.steel), lx, 2.14, lz) // 立柱（高過桌面 2.5+）
  // 燈罩：IKEA HEKTAR 式圓鐘罩。用向量把「罩口」直接對準桌面目標——
  // 手調角度會歪（之前兩版都被嫌），對準了光才真的照得出來。
  const AIM_AT = new THREE.Vector3(0, 1.9, -0.3) // 桌面/螢幕一帶
  const shadePos = new THREE.Vector3(lx + 0.4, 4.12, lz + 0.3)
  const aim = AIM_AT.clone().sub(shadePos).normalize()
  const shadeApex = shadePos.clone().addScaledVector(aim, -0.31)
  const armStart = new THREE.Vector3(lx, 4.25, lz)
  const armDir = shadeApex.clone().sub(armStart)
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, armDir.length(), 10),
    focus(palette.steel)
  )
  arm.position.copy(armStart).add(shadeApex).multiplyScalar(0.5)
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armDir.clone().normalize())
  A.add(arm)
  const shadeGeo = new THREE.ConeGeometry(0.46, 0.62, 20, 1, true)
  const shade = new THREE.Mesh(shadeGeo, focus(palette.steel))
  shade.position.copy(shadePos)
  shade.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), aim) // 罩口(-y)轉向目標
  A.add(shade)
  // 內反光罩：獨立 BackSide 材質，從罩口看得到暖灰金屬內壁，但不會整罩爆白。
  const innerShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.43, 0.58, 20, 1, true),
    focus(0x70685b, { side: THREE.BackSide, roughness: 0.78, metalness: 0.08 })
  )
  innerShade.position.copy(shadePos).addScaledVector(aim, 0.012)
  innerShade.quaternion.copy(shade.quaternion)
  A.add(innerShade)
  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.085, 0.14, 12),
    focus(0x24262b, { roughness: 0.7, metalness: 0.35 })
  )
  socket.position.copy(shadePos).addScaledVector(aim, -0.2)
  socket.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), aim)
  A.add(socket)
  // 不建立可見燈泡幾何；光源藏在罩內，避免透明排序或極端角度再次露出刺眼光球。
  const hiddenLightPos = shadePos.clone().addScaledVector(aim, -0.07)
  const diffuser = new THREE.Mesh(
    new THREE.CircleGeometry(0.405, 28),
    standard(0xf0e4d2, {
      emissive: 0xb88752,
      emissiveIntensity: 0.1,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
    })
  )
  diffuser.position.copy(shadePos).addScaledVector(aim, 0.305)
  diffuser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), aim)
  A.add(diffuser)
  const spot = new THREE.SpotLight(palette.warmGlow, 9, 14, 0.52, 0.82, 1.55)
  spot.position.copy(hiddenLightPos)
  spot.target.position.copy(AIM_AT)
  A.add(spot)
  A.add(spot.target)
  const lampLight = new THREE.PointLight(palette.warmGlow, 0.7, 5.5, 2)
  lampLight.position.copy(hiddenLightPos)
  A.add(lampLight)

  // 人體工學椅：奶油灰布面＋深咖啡支架，承接參考圖的暖灰胡桃木系統。
  const chair = new THREE.Group()
  const chairFabric = furnitureCream
  const chairFrame = focus(0x3d3532, { roughness: 0.68, metalness: 0.22 })
  // 橢圓座墊比方盒更接近真實泡棉座面。
  const seat = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), chairFabric)
  seat.scale.set(1.08, 0.18, 0.92)
  seat.position.set(0, 1.02, 0)
  chair.add(seat)
  // 腰部收窄、兩側向前包覆的弧形網背。
  const backGeo = new THREE.PlaneGeometry(1.08, 1.3, 10, 12)
  const pos = backGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const width = 0.8 + ((y + 0.65) / 1.3) * 0.2
    pos.setX(i, x * width)
    pos.setZ(i, 0.16 * Math.pow(x / 0.54, 2))
  }
  pos.needsUpdate = true
  backGeo.computeVertexNormals()
  const back = new THREE.Mesh(backGeo, standard(0xc9c1b9, {
    roughness: 0.94,
    metalness: 0,
    side: THREE.DoubleSide,
  }))
  back.position.set(0, 1.7, 0.38)
  back.rotation.x = -0.12
  chair.add(back)
  box(chair, 0.7, 0.18, 0.16, chairFabric, 0, 2.38, 0.46) // 頭枕
  box(chair, 0.72, 0.1, 0.13, chairFrame, 0, 1.55, 0.25) // 腰靠
  for (const x of [-0.62, 0.62]) {
    box(chair, 0.07, 0.56, 0.07, chairFrame, x, 1.28, 0)
    box(chair, 0.13, 0.08, 0.58, chairFrame, x, 1.55, -0.08)
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.72, 12), chairFrame)
  stem.position.y = 0.58
  chair.add(stem)
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2
    box(chair, 0.64, 0.055, 0.07, chairFrame, Math.cos(a) * 0.28, 0.24, Math.sin(a) * 0.28, -a)
    const caster = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.055, 10), chairFrame)
    caster.rotation.z = Math.PI / 2
    caster.position.set(Math.cos(a) * 0.58, 0.17, Math.sin(a) * 0.58)
    chair.add(caster)
  }
  chair.position.set(0.25, 0, 2.05)
  A.add(chair)

  return g
}

/** 隨 progress 讓螢幕漸亮：遠處全暗 → 第一幕 dolly-in 停穩前全亮。 */
export function updateWorkbench(group, t) {
  const m = group.userData.screenMat
  if (!m) return
  const k = THREE.MathUtils.smoothstep(t, 0.01, 0.135)
  m.color.setScalar(0.08 + k * 0.92)
  m.emissive.setScalar(1)
  m.emissiveIntensity = k * 0.18
  if (group.userData.screenLight) group.userData.screenLight.intensity = k * 0.12
}
