import * as THREE from 'three'
import { box, emissive, flat, focus, island, palette, standard } from '../flight/stage/materials.js'

function labelMaterial(title, subtitle) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 432
  const x = c.getContext('2d')
  const grad = x.createLinearGradient(0, 0, 768, 432); grad.addColorStop(0, '#101a29'); grad.addColorStop(1, '#273c55')
  x.fillStyle = grad; x.fillRect(0, 0, 768, 432)
  x.textAlign = 'center'; x.fillStyle = '#f3f5f7'; x.font = 'bold 66px ui-monospace, monospace'; x.fillText(title, 384, 182)
  x.fillStyle = '#a9c1d5'; x.font = '28px system-ui, sans-serif'; x.fillText(subtitle, 384, 246)
  x.fillStyle = '#f0bd68'; x.font = '22px ui-monospace, monospace'; x.fillText('PROJECTS  ·  ABOUT  ·  CONTACT', 384, 330)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
  return standard(0xffffff, { map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.16, roughness: 0.58 })
}

/** 第六幕：回到同一張桌子的升級版，物件依旅程順序逐一亮起。 */
export function buildFinalDesk() {
  const g = new THREE.Group()
  const A = island(g, 12, 8.5, 232, -0.2, -178, {
    top: palette.workbenchFloor, mid: palette.workbenchFloorMid, deep: palette.workbenchFloorDeep,
  })
  const cream = standard(palette.wood, { roughness: 0.96, metalness: 0 })
  const dark = focus(palette.device)
  box(A, 7.4, 0.3, 3, cream, 0, 1.75, 0)
  for (const [x, z] of [[-3.1, -1.05], [3.1, -1.05], [-3.1, 1.05], [3.1, 1.05]]) box(A, 0.28, 1.75, 0.28, cream, x, 0.88, z)
  box(A, 4, 2.35, 0.16, dark, 0, 3.15, -0.95)
  const screenMat = labelMaterial('ALVIS WU', 'Full-Stack Engineering Lead × Solution Engineer × AI Explorer')
  box(A, 3.82, 2.15, 0.025, screenMat, 0, 3.15, -0.85)
  box(A, 0.22, 0.75, 0.18, dark, 0, 2.05, -1.02)
  box(A, 1.35, 0.08, 0.72, dark, 0, 1.9, -0.62)

  const artifacts = []
  const addArtifact = (group, x, z, color) => {
    group.position.set(x, 1.94, z); A.add(group)
    const light = new THREE.PointLight(color, 0, 3.8, 2); light.position.set(x, 2.75, z); A.add(light)
    artifacts.push({ group, light, color })
  }

  // 城市模型。
  const city = new THREE.Group(); const cityMat = standard(0x334a60, { roughness: 0.38, metalness: 0.42 })
  ;[[-0.45, 0.7], [0, 1.15], [0.45, 0.88], [0.2, 0.56]].forEach(([x, h], i) => box(city, 0.32, h, 0.32, cityMat, x, h / 2, (i % 2) * 0.3))
  addArtifact(city, -2.75, -0.15, 0x69bfff)

  // 小型無人機。
  const drone = new THREE.Group(); const metal = standard(0x8e9aa2, { roughness: 0.34, metalness: 0.56 })
  box(drone, 0.8, 0.22, 0.48, metal, 0, 0.45, 0)
  for (const side of [-1, 1]) box(drone, 0.32, 0.14, 0.54, metal, side * 0.55, 0.45, 0)
  addArtifact(drone, -1.5, 0.52, 0x46e2d1)

  // 相機與猛毒流體剪影。
  const photo = new THREE.Group(); box(photo, 0.8, 0.55, 0.45, dark, 0, 0.38, 0)
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.42, 14), dark); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.38, -0.35); photo.add(lens)
  const silhouette = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 9), standard(0x050609, { roughness: 0.18 })); silhouette.scale.set(0.75, 1.5, 0.55); silhouette.position.set(0.7, 0.55, 0.1); photo.add(silhouette)
  addArtifact(photo, 1.7, 0.42, 0xff87b9)

  // 漂浮文件與 AI 節點。
  const knowledge = new THREE.Group(); const nodeMat = emissive(0x78d8ff, 0.55)
  let previous = null
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Vector3((i % 2) * 0.55, 0.28 + i * 0.17, (i % 3) * 0.28)
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), nodeMat); node.position.copy(p); knowledge.add(node)
    if (previous) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([previous, p]), new THREE.LineBasicMaterial({ color: 0x78d8ff }))
      knowledge.add(line)
    }
    previous = p.clone()
  }
  addArtifact(knowledge, 2.9, -0.3, 0x78d8ff)

  // 技術帶領流程筆記本置於前緣，避免和四組立體物件打架。
  const notebook = new THREE.Group(); box(notebook, 1.45, 0.08, 0.95, standard(0xe1d8c8, { roughness: 0.92 }), 0, 0, 0)
  for (let i = 0; i < 4; i++) box(notebook, 0.85 - i * 0.08, 0.012, 0.025, flat(0x6b777e), -0.1, 0.05, -0.28 + i * 0.17)
  addArtifact(notebook, 0.15, 1.05, 0xf0bd68)

  // 最終幕沿用全域清晨藍灰，不再疊加額外暖色主光／補光；保留物件自身科技色 glow。
  g.userData.artifacts = artifacts
  g.userData.screenMat = screenMat
  return g
}

export function updateFinalDesk(group, t) {
  group.visible = t >= 0.86
  const items = group.userData.artifacts || []
  items.forEach((item, i) => {
    const k = THREE.MathUtils.smoothstep(t, 0.875 + i * 0.018, 0.905 + i * 0.018)
    item.light.intensity = k * 1.05
    item.group.position.y = 1.94 + (1 - k) * 0.22
  })
  if (group.userData.screenMat) group.userData.screenMat.emissiveIntensity = THREE.MathUtils.lerp(0.05, 0.34, THREE.MathUtils.smoothstep(t, 0.94, 0.985))
}
