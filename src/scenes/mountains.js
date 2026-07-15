import * as THREE from 'three'
import { flat, glow, palette } from '../flight/stage/materials.js'

/** 場景 03：山與月（Contact / 收尾）。 */
export function buildMountains() {
  const g = new THREE.Group()
  const C = new THREE.Group()

  const peak = (h, r, x, z, snow) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), flat(palette.mountain))
    cone.position.set(x, h / 2, z)
    C.add(cone)
    if (snow) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.35, h * 0.3, 6), flat(palette.snow))
      cap.position.set(x, h * 0.85, z)
      C.add(cap)
    }
  }
  peak(14, 6, 0, 0, true)
  peak(9, 4.5, -8, 4, true)
  peak(7, 4, 7, 5, false)
  peak(5, 3, -4, 9, false)
  C.position.set(120, 4, -70)
  g.add(C)

  const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 20), glow(palette.moon))
  moon.position.set(150, 34, -100)
  g.add(moon)

  return g
}
