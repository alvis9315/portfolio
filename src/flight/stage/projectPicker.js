import * as THREE from 'three'

/** 城市場景的 project raycasting 與 hover ownership。 */
export function createProjectPicker({ canvas, camera, scene, isEnabled, onSelect }) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let hasPointer = false
  let hovered = null
  let hoveredEmissive = 0

  const pickProjectMesh = () => {
    raycaster.setFromCamera(pointer, camera)
    for (const hit of raycaster.intersectObjects(scene.children, true)) {
      for (let object = hit.object; object; object = object.parent) {
        if (object.userData?.project) return object
      }
    }
    return null
  }

  const setHover = (mesh) => {
    if (mesh === hovered) return
    if (hovered) {
      if (hovered.material?.emissive) hovered.material.emissive.setHex(hoveredEmissive)
      else if (hovered.userData.baseScale) hovered.scale.copy(hovered.userData.baseScale)
    }
    hovered = mesh
    if (hovered) {
      if (hovered.material?.emissive) {
        hoveredEmissive = hovered.material.emissive.getHex()
        hovered.material.emissive.setHex(0x2f4a43)
      } else {
        hovered.userData.baseScale = hovered.userData.baseScale || hovered.scale.clone()
        hovered.scale.copy(hovered.userData.baseScale).multiplyScalar(1.12)
      }
    }
    canvas.style.cursor = hovered ? 'pointer' : ''
  }

  const onPointerMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    hasPointer = true
  }
  const onPointerLeave = () => { hasPointer = false }
  const onClick = () => {
    const mesh = isEnabled() ? pickProjectMesh() : null
    onSelect(mesh ? mesh.userData.project : null)
  }

  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('click', onClick)

  return {
    update() {
      setHover(hasPointer && isEnabled() ? pickProjectMesh() : null)
    },
    dispose() {
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('click', onClick)
      setHover(null)
    },
  }
}
