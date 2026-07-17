import * as THREE from 'three'
import { box, emissive, flat, focus, island, standard } from '../flight/stage/materials.js'

function makeDashboardMaterial() {
  const c = document.createElement('canvas')
  c.width = 768; c.height = 360
  const x = c.getContext('2d')
  x.fillStyle = '#071019'; x.fillRect(0, 0, c.width, c.height)
  x.fillStyle = '#112434'; x.fillRect(18, 18, 732, 42)
  x.font = 'bold 18px ui-monospace, monospace'; x.fillStyle = '#d7e8f3'
  x.fillText('DELIVERY CONTROL / REGION-A', 36, 46)
  const services = ['GATEWAY', 'IDENTITY', 'WORKFLOW', 'AUDIT', 'DATA-SYNC', 'NOTIFY']
  services.forEach((name, i) => {
    const col = i % 3, row = Math.floor(i / 3)
    const px = 32 + col * 240, py = 92 + row * 104
    x.fillStyle = '#102433'; x.fillRect(px, py, 202, 76)
    x.strokeStyle = i === 4 ? '#f0a45a' : '#2cd5b7'; x.lineWidth = 2; x.strokeRect(px, py, 202, 76)
    x.font = '14px ui-monospace, monospace'; x.fillStyle = '#c7d7e3'; x.fillText(name, px + 14, py + 25)
    x.fillStyle = i === 4 ? '#f0a45a' : '#2cd5b7'; x.fillText(i === 4 ? 'DEGRADED' : 'HEALTHY', px + 14, py + 54)
  })
  x.strokeStyle = '#2c6686'; x.lineWidth = 2
  for (const y of [180, 284]) { x.beginPath(); x.moveTo(110, y); x.lineTo(660, y); x.stroke() }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
  return standard(0xffffff, { map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.42, roughness: 0.52 })
}

/** 第四幕：以虛構資料呈現大型系統交付與監控，避免洩漏真實客戶資訊。 */
export function buildCommandRoom() {
  const g = new THREE.Group()
  const B = island(g, 30, 23, 157, -1.5, -111)
  const roomWall = standard(0x35495c, { roughness: 0.82 })
  box(B, 29, 0.12, 22, flat(0x263746), 0, 0.06, 0)
  box(B, 29, 8, 0.3, roomWall, 0, 4, -9.5)
  box(B, 0.25, 8, 22, roomWall, -13.8, 4, 0)

  const screenMat = makeDashboardMaterial()
  box(B, 13.4, 6.3, 0.18, focus(0x252e37), 1.8, 4.8, -9.25)
  box(B, 12.8, 5.75, 0.04, screenMat, 1.8, 4.8, -9.12)
  for (const x of [-9, -6.6]) {
    box(B, 2, 1.7, 0.12, emissive(0x163f57, 0.34), x, 5.7, -9.1)
    for (let i = 0; i < 3; i++) box(B, 1.35 - i * 0.18, 0.08, 0.04, emissive(0x4dd8cc, 0.5), x, 6.15 - i * 0.38, -9.0)
  }

  const deskMat = standard(0x263541, { roughness: 0.4, metalness: 0.45 })
  box(B, 10, 0.38, 4.4, deskMat, 0.8, 1.8, 1)
  box(B, 8.8, 1.4, 3.4, standard(0x151d25, { roughness: 0.48, metalness: 0.38 }), 0.8, 0.9, 1)
  for (const x of [-2.4, 0.8, 4]) {
    const consoleMat = emissive(0x163c52, 0.38, { roughness: 0.38 })
    const console = box(B, 2.5, 0.08, 1.25, consoleMat, x, 2.03, 0.7)
    console.rotation.x = -0.08
    for (let i = 0; i < 4; i++) box(B, 0.34, 0.035, 0.12, emissive(i === 3 ? 0xffa55d : 0x5ce6d0, 0.55), x - 0.65 + i * 0.43, 2.09, 0.6)
  }

  // 中央座位與名牌代表 Alvis 的指揮位置，不使用人物模型。
  const chair = new THREE.Group()
  const chairMat = standard(0x222a34, { roughness: 0.66, metalness: 0.18 })
  const seat = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 10), chairMat)
  seat.scale.set(1, 0.28, 0.82); seat.position.y = 0.8; chair.add(seat)
  box(chair, 1.25, 1.55, 0.18, chairMat, 0, 1.55, 0.35)
  chair.position.set(0.8, 0, 4.7); B.add(chair)
  box(B, 2.2, 0.48, 0.08, emissive(0x24647c, 0.5), 0.8, 2.55, -1.23)
  const nameCanvas = document.createElement('canvas'); nameCanvas.width = 256; nameCanvas.height = 64
  const nx = nameCanvas.getContext('2d'); nx.fillStyle = '#0b1923'; nx.fillRect(0, 0, 256, 64)
  nx.font = 'bold 28px ui-monospace, monospace'; nx.fillStyle = '#bdefff'; nx.textAlign = 'center'; nx.fillText('ALVIS / LEAD', 128, 42)
  const nameTex = new THREE.CanvasTexture(nameCanvas); nameTex.colorSpace = THREE.SRGBColorSpace
  const nameMat = standard(0xffffff, { map: nameTex, emissive: 0xffffff, emissiveMap: nameTex, emissiveIntensity: 0.5 })
  box(B, 2.1, 0.45, 0.03, nameMat, 0.8, 2.55, -1.17)

  const pulse = new THREE.PointLight(0x45cfe2, 1.1, 17, 2)
  pulse.position.set(1.5, 5, -6); B.add(pulse)
  g.userData.statusLight = pulse
  return g
}

export function updateCommandRoom(group, t) {
  group.visible = t >= 0.55 && t <= 0.73
  if (group.userData.statusLight) group.userData.statusLight.intensity = 0.82 + Math.sin(performance.now() * 0.002) * 0.12
}
