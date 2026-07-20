import * as THREE from 'three'

/** 城市 project 與第三幕 mission 面板的 raycasting / hover ownership。 */
export function createProjectPicker({ canvas, camera, scene, isEnabled, onSelect }) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let hasPointer = false
  let hovered = null
  let hoveredState = null

  const interactionFor = (object) => object.userData?.project ?? object.userData?.mission ?? null
  const pickInteractionMesh = () => {
    raycaster.setFromCamera(pointer, camera)
    for (const hit of raycaster.intersectObjects(scene.children, true)) {
      for (let object = hit.object; object; object = object.parent) {
        if (!interactionFor(object)) continue
        if (typeof object.userData.isSelectable === 'function' && !object.userData.isSelectable()) continue
        return object
      }
    }
    return null
  }

  const setHover = (mesh) => {
    if (mesh === hovered) return
    if (hovered) {
      if (hovered.material?.emissive) {
        hovered.material.emissive.setHex(hoveredState.emissive)
        hovered.material.emissiveIntensity = hoveredState.intensity
      }
      else if (hovered.userData.baseScale) hovered.scale.copy(hovered.userData.baseScale)
    }
    hovered = mesh
    if (hovered) {
      if (hovered.material?.emissive) {
        hoveredState = {
          emissive: hovered.material.emissive.getHex(),
          intensity: hovered.material.emissiveIntensity,
        }
        hovered.material.emissive.setHex(hovered.userData.hoverColor ?? 0x2f4a43)
        hovered.material.emissiveIntensity = Math.max(hovered.material.emissiveIntensity, 1.45)
      } else {
        hovered.userData.baseScale = hovered.userData.baseScale || hovered.scale.clone()
        hovered.scale.copy(hovered.userData.baseScale).multiplyScalar(1.12)
      }
    }
    canvas.style.cursor = hovered ? 'pointer' : ''
  }

  const onPointerMove = (event) => {
    const bounds = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1
    pointer.y = -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1
    hasPointer = true
  }
  const onPointerLeave = () => { hasPointer = false }
  const onClick = () => {
    const mesh = isEnabled() ? pickInteractionMesh() : null
    onSelect(mesh ? interactionFor(mesh) : null)
  }

  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('click', onClick)

  return {
    update() {
      setHover(hasPointer && isEnabled() ? pickInteractionMesh() : null)
    },
    dispose() {
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('click', onClick)
      setHover(null)
    },
  }
}
