import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import {
  FACE_AXIS,
  FACE_LAYER_INDEX,
  moveAngle,
  type Move,
} from '../../engine/moves/moves'

export interface CubeSceneHandle {
  applyMove: (move: Move, durationMs?: number) => void
  reset: () => void
  busy: () => boolean
  getSolved: () => boolean
}

interface Props {
  className?: string
  /** Gentle automatic spin, used for the landing page hero. */
  idle?: boolean
  reducedMotion?: boolean
  /** Extra scale applied to the cube group. */
  scale?: number
  onSolvedChange?: (solved: boolean) => void
}

const STICKER_COLORS = {
  px: 0x22c55e, // right - green
  nx: 0x3b82f6, // left - blue
  py: 0xf8fafc, // top - white
  ny: 0xfacc15, // bottom - yellow
  pz: 0xef4444, // front - red
  nz: 0xf97316, // back - orange
  core: 0x111111,
}

interface ActiveTurn {
  pivot: THREE.Group
  cubies: THREE.Mesh[]
  target: THREE.Quaternion
  start: number
  duration: number
  axis: THREE.Vector3
  angle: number
}

const CubeScene = forwardRef<CubeSceneHandle, Props>(function CubeScene(
  { className, idle = false, reducedMotion = false, scale = 1, onSolvedChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    viewGroup: THREE.Group
    cubeGroup: THREE.Group
    cubies: THREE.Mesh[]
    queue: Array<{ move: Move; duration: number }>
    active: ActiveTurn | null
    targetRotX: number
    targetRotY: number
    dragging: boolean
    lastX: number
    lastY: number
    frame: number
    raf: number
  } | null>(null)

  const propsRef = useRef({ idle, reducedMotion, scale, onSolvedChange })
  propsRef.current = { idle, reducedMotion, scale, onSolvedChange }

  useImperativeHandle(ref, () => ({
    applyMove(move, durationMs = 220) {
      const s = stateRef.current
      if (!s) return
      s.queue.push({ move, duration: propsRef.current.reducedMotion ? 0 : durationMs })
    },
    reset() {
      const s = stateRef.current
      if (!s) return
      s.queue = []
      s.active = null
      rebuildCube(s.cubeGroup, s.cubies)
      propsRef.current.onSolvedChange?.(true)
    },
    busy() {
      const s = stateRef.current
      return !!s && (s.active !== null || s.queue.length > 0)
    },
    getSolved() {
      const s = stateRef.current
      return s ? cubeSolved(s.cubies) : true
    },
  }))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0, 7.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(4, 6, 8)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x93c5fd, 0.35)
    rim.position.set(-6, -4, -6)
    scene.add(rim)

    const viewGroup = new THREE.Group()
    scene.add(viewGroup)
    const cubeGroup = new THREE.Group()
    viewGroup.add(cubeGroup)
    viewGroup.rotation.x = -0.45
    viewGroup.rotation.y = -0.6

    const cubies: THREE.Mesh[] = []
    rebuildCube(cubeGroup, cubies)

    const s = {
      scene, camera, renderer, viewGroup, cubeGroup, cubies,
      queue: [] as Array<{ move: Move; duration: number }>,
      active: null as ActiveTurn | null,
      targetRotX: -0.45,
      targetRotY: -0.6,
      dragging: false,
      lastX: 0,
      lastY: 0,
      frame: 0,
      raf: 0,
    }
    stateRef.current = s

    const onPointerDown = (e: PointerEvent) => {
      s.dragging = true
      s.lastX = e.clientX
      s.lastY = e.clientY
      renderer.domElement.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!s.dragging) return
      const dx = e.clientX - s.lastX
      const dy = e.clientY - s.lastY
      s.targetRotY += dx * 0.008
      s.targetRotX += dy * 0.008
      s.targetRotX = Math.max(-1.4, Math.min(1.4, s.targetRotX))
      s.lastX = e.clientX
      s.lastY = e.clientY
    }
    const onPointerUp = () => {
      s.dragging = false
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    const tick = (now: number) => {
      s.raf = requestAnimationFrame(tick)

      if (propsRef.current.idle && !s.dragging && !propsRef.current.reducedMotion) {
        s.targetRotY += 0.0035
      }
      viewGroup.rotation.x += (s.targetRotX - viewGroup.rotation.x) * 0.12
      viewGroup.rotation.y += (s.targetRotY - viewGroup.rotation.y) * 0.12
      const sc = propsRef.current.scale
      cubeGroup.scale.setScalar(cubeGroup.scale.x + (sc - cubeGroup.scale.x) * 0.2)

      if (!s.active && s.queue.length > 0) {
        const next = s.queue.shift()!
        startTurn(s, next.move, next.duration, now)
      }
      if (s.active) {
        const t = s.active.duration === 0 ? 1 : Math.min((now - s.active.start) / s.active.duration, 1)
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        s.active.pivot.quaternion.slerpQuaternions(new THREE.Quaternion(), s.active.target, eased)
        if (t >= 1) {
          finishTurn(s)
          propsRef.current.onSolvedChange?.(cubeSolved(s.cubies))
        }
      }

      renderer.render(scene, camera)
    }
    s.raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(s.raf)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mats = obj.material as THREE.Material[]
          mats.forEach((m) => m.dispose())
        }
      })
      renderer.dispose()
      container.removeChild(renderer.domElement)
      stateRef.current = null
    }
  }, [])

  return <div ref={containerRef} className={className} style={{ touchAction: 'none' }} />
})

function rebuildCube(cubeGroup: THREE.Group, cubies: THREE.Mesh[]) {
  while (cubeGroup.children.length > 0) {
    const child = cubeGroup.children[0]
    cubeGroup.remove(child)
  }
  cubies.length = 0

  const size = 0.94
  const gap = 1.02
  const geometry = new THREE.BoxGeometry(size, size, size)

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const materials: THREE.Material[] = [
          new THREE.MeshStandardMaterial({ color: x === 1 ? STICKER_COLORS.px : STICKER_COLORS.core, roughness: 0.35 }),
          new THREE.MeshStandardMaterial({ color: x === -1 ? STICKER_COLORS.nx : STICKER_COLORS.core, roughness: 0.35 }),
          new THREE.MeshStandardMaterial({ color: y === 1 ? STICKER_COLORS.py : STICKER_COLORS.core, roughness: 0.35 }),
          new THREE.MeshStandardMaterial({ color: y === -1 ? STICKER_COLORS.ny : STICKER_COLORS.core, roughness: 0.35 }),
          new THREE.MeshStandardMaterial({ color: z === 1 ? STICKER_COLORS.pz : STICKER_COLORS.core, roughness: 0.35 }),
          new THREE.MeshStandardMaterial({ color: z === -1 ? STICKER_COLORS.nz : STICKER_COLORS.core, roughness: 0.35 }),
        ]
        const mesh = new THREE.Mesh(geometry, materials)
        mesh.position.set(x * gap, y * gap, z * gap)
        mesh.userData.home = new THREE.Vector3(x * gap, y * gap, z * gap)
        cubeGroup.add(mesh)
        cubies.push(mesh)
      }
    }
  }
}

function startTurn(
  s: {
    viewGroup: THREE.Group; cubeGroup: THREE.Group; cubies: THREE.Mesh[]
    active: ActiveTurn | null; queue: Array<{ move: Move; duration: number }>
  },
  move: Move,
  duration: number,
  now: number,
) {
  const axisVals = FACE_AXIS[move.face]
  const axis = new THREE.Vector3(axisVals[0], axisVals[1], axisVals[2])
  const layerIdx = FACE_LAYER_INDEX[move.face]
  const angle = moveAngle(move)

  const pivot = new THREE.Group()
  s.cubeGroup.add(pivot)
  const layer = s.cubies.filter((c) => {
    const v = c.position.getComponent(layerIdx)
    return Math.round(v * axisVals[layerIdx]) === 1
  })
  layer.forEach((c) => pivot.attach(c))

  s.active = {
    pivot,
    cubies: layer,
    target: new THREE.Quaternion().setFromAxisAngle(axis, angle),
    start: now,
    duration,
    axis,
    angle,
  }
}

function finishTurn(s: {
  cubeGroup: THREE.Group
  cubies: THREE.Mesh[]
  active: ActiveTurn | null
}) {
  const active = s.active
  if (!active) return
  active.cubies.forEach((c) => {
    s.cubeGroup.attach(c)
    const gap = 1.02
    c.position.set(
      Math.round(c.position.x / gap) * gap,
      Math.round(c.position.y / gap) * gap,
      Math.round(c.position.z / gap) * gap,
    )
    // snap orientation to the nearest 90° rotation matrix
    const m = new THREE.Matrix4().makeRotationFromQuaternion(c.quaternion)
    const e = m.elements
    for (let i = 0; i < 16; i++) e[i] = Math.round(e[i])
    c.quaternion.setFromRotationMatrix(m)
  })
  s.cubeGroup.remove(active.pivot)
  s.active = null
}

function cubeSolved(cubies: THREE.Mesh[]): boolean {
  const m = new THREE.Matrix4()
  const identity = new THREE.Matrix4()
  return cubies.every((c) => {
    const home = c.userData.home as THREE.Vector3
    if (c.position.distanceTo(home) > 0.01) return false
    m.makeRotationFromQuaternion(c.quaternion)
    return Math.abs(m.elements[0] - 1) < 0.01 && Math.abs(m.elements[5] - 1) < 0.01 && Math.abs(m.elements[10] - 1) < 0.01
  }) && !!identity
}

export default CubeScene
