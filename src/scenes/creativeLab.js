import * as THREE from 'three'
import { box, emissive, flat, focus, island, standard } from '../flight/stage/materials.js'

const tube = (parent, points, radius, mat) => {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 22, radius, 7, false), mat))
}

/** 第五幕：左側是文件到 RAG 的知識流程，右側是 FigureShot 實體攝影棚。 */
export function buildCreativeLab() {
  const g = new THREE.Group()
  const B = island(g, 34, 24, 194, -1.5, -144)
  box(B, 33, 0.1, 23, flat(0x13131b), 0, 0.05, 0)

  // 左側：文件 → embedding → retrieval → RAG answer。
  const paperMat = standard(0xd6d9d8, { roughness: 0.82, metalness: 0 })
  const nodeMat = emissive(0x5ad6ff, 0.58)
  const nodePositions = []
  for (let i = 0; i < 9; i++) {
    const x = -13 + (i % 3) * 2.5
    const y = 2.1 + Math.floor(i / 3) * 1.8
    const z = -4 + ((i * 7) % 5) * 1.5
    const paper = box(B, 1.45, 0.06, 1.9, paperMat, x, y, z, (i % 2 ? -0.18 : 0.2))
    paper.rotation.x = 0.16 + (i % 3) * 0.06
    for (let line = 0; line < 4; line++) box(B, 0.95 - line * 0.08, 0.015, 0.035, flat(0x6f7a82), x, y + 0.05, z - 0.55 + line * 0.28)
    nodePositions.push([x + 0.7, y + 0.45, z])
  }
  nodePositions.forEach((p, i) => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.12 + (i % 3) * 0.025, 10, 7), nodeMat)
    node.position.set(...p); B.add(node)
    if (i > 0) tube(B, [nodePositions[i - 1], [(p[0] + nodePositions[i - 1][0]) / 2, p[1] + 0.4, (p[2] + nodePositions[i - 1][2]) / 2], p], 0.018, nodeMat)
  })
  const stages = ['DOCS', 'EMBED', 'RETRIEVE', 'RAG']
  const stageMat = standard(0x173149, { transparent: true, opacity: 0.8, roughness: 0.35, metalness: 0.24 })
  stages.forEach((label, i) => {
    const x = -12 + i * 2.7
    box(B, 2.05, 0.85, 0.08, stageMat, x, 7.7, -5.6)
    const c = document.createElement('canvas'); c.width = 192; c.height = 64
    const cx = c.getContext('2d'); cx.fillStyle = '#0d1e2b'; cx.fillRect(0, 0, 192, 64)
    cx.font = 'bold 22px ui-monospace, monospace'; cx.fillStyle = '#8de9ff'; cx.textAlign = 'center'; cx.fillText(label, 96, 40)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    box(B, 1.95, 0.75, 0.025, standard(0xffffff, { map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.42 }), x, 7.7, -5.52)
    if (i < stages.length - 1) box(B, 0.55, 0.045, 0.04, nodeMat, x + 1.3, 7.7, -5.5)
  })

  // 中央分界：透明資料閘門讓兩側視覺互相流入。
  box(B, 0.12, 9.5, 12, standard(0x21445a, { transparent: true, opacity: 0.34, roughness: 0.18, metalness: 0.45 }), 0, 4.8, 0)

  // 右側 FigureShot 攝影棚。
  const cyclorama = standard(0x282932, { roughness: 0.92, metalness: 0 })
  box(B, 13.5, 0.18, 10, cyclorama, 8.8, 0.1, 0)
  box(B, 13.5, 7.5, 0.16, cyclorama, 8.8, 3.75, -5)
  const venomMat = standard(0x05070a, { roughness: 0.16, metalness: 0.12, envMapIntensity: 2.2 })
  const figure = new THREE.Group()
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1.05, 22, 14), venomMat)
  torso.scale.set(1.34, 1.38, 0.74); torso.position.y = 2.62; figure.add(torso)
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10), venomMat)
    shoulder.scale.set(1.25, 0.8, 0.82); shoulder.position.set(side * 1.12, 3.35, 0); figure.add(shoulder)
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.56, 18, 12), venomMat)
  head.scale.set(0.9, 1.05, 0.9); head.position.y = 4.35; figure.add(head)
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 9), venomMat)
  jaw.scale.set(1.05, 0.62, 0.96); jaw.position.set(0, 4.06, 0.24); figure.add(jaw)
  for (const side of [-1, 1]) {
    tube(figure, [[side * 0.7, 3.3, 0], [side * 1.35, 2.65, 0.1], [side * 1.7, 1.9, -0.05]], 0.22, venomMat)
    tube(figure, [[side * 0.48, 1.75, 0], [side * 0.6, 0.95, 0.05], [side * 0.72, 0.18, 0]], 0.28, venomMat)
  }
  // 高對比斜眼與長舌是遠距離仍能辨識猛毒輪廓的必要特徵。
  const eyeMat = emissive(0xe9f2f4, 0.42)
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), eyeMat)
    eye.scale.set(1.5, 0.32, 0.16); eye.position.set(side * 0.2, 4.47, 0.49); eye.rotation.z = side * 0.48; figure.add(eye)
  }
  tube(figure, [[0, 3.98, 0.58], [0.18, 3.72, 0.78], [0.52, 3.54, 0.72], [0.72, 3.28, 0.58]], 0.07, emissive(0xa33457, 0.2))
  tube(figure, [[-0.9, 3.3, 0.18], [-1.45, 4.0, 0.1], [-1.7, 4.65, -0.1]], 0.055, venomMat)
  tube(figure, [[0.92, 3.18, 0.16], [1.55, 3.65, 0], [1.88, 4.18, -0.2]], 0.045, venomMat)
  figure.position.set(8.6, 0.25, -1.5); B.add(figure)

  const camera = new THREE.Group()
  box(camera, 1.4, 0.9, 0.85, focus(0x16181c, { roughness: 0.32, metalness: 0.52 }), 0, 3.3, 0)
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.8, 18), focus(0x101216, { roughness: 0.22, metalness: 0.62 }))
  lens.rotation.x = Math.PI / 2; lens.position.set(0, 3.3, -0.72); camera.add(lens)
  for (let i = 0; i < 3; i++) box(camera, 0.08, 2.4, 0.08, focus(0x272c32), (i - 1) * 0.55, 1.25, 0.35 + Math.abs(i - 1) * 0.18)
  camera.position.set(8.6, 0, 6); B.add(camera)

  for (const side of [-1, 1]) {
    const light = new THREE.SpotLight(side < 0 ? 0x70bfff : 0xff8fba, 13, 15, 0.48, 0.82, 1.5)
    light.position.set(8.6 + side * 4.8, 7, 3.2); light.target.position.copy(figure.position).add(new THREE.Vector3(0, 2.4, 0))
    B.add(light); B.add(light.target)
    box(B, 0.18, 6.4, 0.18, focus(0x262b31), 8.6 + side * 4.8, 3.2, 3.2)
  }

  // Instagram 牌是獨立作品入口，不混進 RAG 流程。
  const igCanvas = document.createElement('canvas'); igCanvas.width = 512; igCanvas.height = 128
  const ix = igCanvas.getContext('2d'); ix.fillStyle = '#17131e'; ix.fillRect(0, 0, 512, 128)
  ix.font = 'bold 34px system-ui, sans-serif'; ix.fillStyle = '#ffb4d8'; ix.fillText('FIGURE PHOTOGRAPHY', 28, 52)
  ix.font = '28px ui-monospace, monospace'; ix.fillStyle = '#f3eef6'; ix.fillText('@figsman99  ↗', 28, 96)
  const igTex = new THREE.CanvasTexture(igCanvas); igTex.colorSpace = THREE.SRGBColorSpace
  box(B, 5.8, 1.45, 0.06, standard(0xffffff, { map: igTex, emissive: 0xffffff, emissiveMap: igTex, emissiveIntensity: 0.32 }), 10.3, 6.4, -4.82)

  g.userData.figure = figure
  g.userData.nodes = nodePositions
  return g
}

export function updateCreativeLab(group, t) {
  group.visible = t >= 0.7 && t <= 0.88
  if (group.userData.figure) group.userData.figure.rotation.y = Math.sin(performance.now() * 0.00045) * 0.08
}
