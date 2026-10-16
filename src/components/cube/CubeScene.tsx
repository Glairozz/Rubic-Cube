import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  FACE_AXIS,
  FACE_LAYER_INDEX,
  moveAngle,
  type Face,
  type Move,
} from '../../engine/moves/moves'
import { resolveSwipe } from '../../engine/cube/swipe'
import { decideTurn, settleDuration, stepTurn } from '../../engine/cube/gesture'
import {
  applyMoveToState,
  createCube,
  isCubeSolved,
  stateToFacelet,
  type CubeState,
} from '../../engine/cube/cubeModel'

export interface CubeSceneHandle {
  applyMove: (move: Move, durationMs?: number) => void
  reset: () => void
  /** Return the camera to its default angle and distance. */
  resetCamera: () => void
  busy: () => boolean
  isSolved: () => boolean
  getStateString: () => string
}

interface Props {
  className?: string
  /** Gentle automatic spin, used for the landing page hero. */
  idle?: boolean
  reducedMotion?: boolean
  /** Extra scale applied to the cube group. */
  scale?: number
  /** Duration (ms) used for moves triggered by swiping a sticker. */
  animationSpeed?: number
  onSolvedChange?: (solved: boolean) => void
  /** Fired when a swipe/click commits a turn, so the host can record it. */
  onUserMove?: (move: Move) => void
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

const CUBIE_SIZE = 0.94
/** Corner rounding of the black cubelet body — creates soft bevels. */
const BEVEL = 0.075
/** Side length of a sticker plate, leaving a black border on every face. */
const STICKER_SIZE = 0.82
const STICKER_CORNER = 0.13
/** Stickers sit just above the body surface to avoid z-fighting. */
const STICKER_LIFT = CUBIE_SIZE / 2 + 0.004
/** Distance between cubelet centres — the visible black gap. */
const GAP = 1.02
/** Minimum pointer travel (CSS px) before a gesture is interpreted as a swipe. */
const SWIPE_THRESHOLD = 9
/**
 * Sensitivity of a followed layer. A 1:1 mapping makes the sticker track the
 * finger exactly, but on a cube this small on screen a 90° turn would need a
 * ~170 px drag. This gain keeps the layer visually coupled to the finger while
 * letting a swipe of roughly a fifth of the cube commit a quarter turn.
 */
const DRAG_GAIN = 1.8

const DEFAULT_ROT_X = -0.45
const DEFAULT_ROT_Y = -0.6
const DEFAULT_DIST = 7.2
const MIN_DIST = 4.6
const MAX_DIST = 13
/** Two-finger pinch needs at least this much separation before it engages. */
const PINCH_MIN = 24

type Materials = Record<keyof typeof STICKER_COLORS, THREE.MeshStandardMaterial>
type Cubie = THREE.Group

interface ActiveTurn {
  pivot: THREE.Group
  cubies: Cubie[]
  face: Face
  /** Rotation axis in cube-local space: the outward normal of the face. */
  axis: THREE.Vector3
  /**
   * 'follow' — the layer tracks the finger and no move exists yet.
   * 'settle' — a timed animation from `from` to `target` (commit or rollback).
   */
  phase: 'follow' | 'settle'
  angle: number
  from: number
  target: number
  start: number
  duration: number
  /** Move committed when a settle finishes; null means the gesture was cancelled. */
  move: Move | null
  /** True when the turn came from a swipe, so the host should record it. */
  fromGesture: boolean
}

interface MoveJob {
  move: Move
  duration: number
}

type GestureMode = 'pending' | 'orbit' | 'turn' | 'pinch' | 'locked'

interface Gesture {
  pointerId: number
  mode: GestureMode
  downX: number
  downY: number
  lastX: number
  lastY: number
  normal: THREE.Vector3 | null
  point: THREE.Vector3 | null
  cubie: Cubie | null
  /** Pinch bookkeeping. */
  pinchDist: number
  pinchCam: number
  midX: number
  midY: number
  /**
   * Follow-turn geometry captured when the finger grabbed a layer: the grabbed
   * point split into its component along the world rotation axis and its
   * perpendicular radius, plus where that axis passes through the cube.
   */
  axisWorld: THREE.Vector3 | null
  perp0: THREE.Vector3 | null
  along0: THREE.Vector3 | null
  centerWorld: THREE.Vector3 | null
}

interface SceneState {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  viewGroup: THREE.Group
  cubeGroup: THREE.Group
  cubies: Cubie[]
  bodyGeometry: RoundedBoxGeometry
  stickerGeometry: THREE.ShapeGeometry
  materials: Materials
  logic: CubeState
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
  ray: THREE.Ray
  plane: THREE.Plane
  queue: MoveJob[]
  active: ActiveTurn | null
  gesture: Gesture | null
  pointers: Map<number, { x: number; y: number }>
  targetRotX: number
  targetRotY: number
  targetDist: number
  dist: number
  raf: number
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

const CubeScene = forwardRef<CubeSceneHandle, Props>(function CubeScene(
  { className, idle = false, reducedMotion = false, scale = 1, animationSpeed = 220, onSolvedChange, onUserMove },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef<SceneState | null>(null)

  const propsRef = useRef({ idle, reducedMotion, scale, animationSpeed, onSolvedChange, onUserMove })
  propsRef.current = { idle, reducedMotion, scale, animationSpeed, onSolvedChange, onUserMove }

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
      s.gesture = null
      // Release any captured pointers so touch input starts fresh.
      for (const id of s.pointers.keys()) {
        try {
          s.renderer.domElement.releasePointerCapture(id)
        } catch {
          // already released
        }
      }
      s.pointers.clear()
      rebuildCube(s.cubeGroup, s.cubies, s.bodyGeometry, s.stickerGeometry, s.materials)
      s.logic = createCube()
    },
    resetCamera() {
      const s = stateRef.current
      if (!s) return
      s.targetRotX = DEFAULT_ROT_X
      s.targetRotY = DEFAULT_ROT_Y
      s.targetDist = DEFAULT_DIST
    },
    busy() {
      const s = stateRef.current
      return !!s && (s.active !== null || s.queue.length > 0)
    },
    isSolved() {
      const s = stateRef.current
      return s ? isCubeSolved(s.logic) : true
    },
    getStateString() {
      const s = stateRef.current
      return s ? stateToFacelet(s.logic) : ''
    },
  }))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0, DEFAULT_DIST)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.touchAction = 'none'
    renderer.domElement.style.userSelect = 'none'
    renderer.domElement.style.webkitUserSelect = 'none'
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.72))
    const key = new THREE.DirectionalLight(0xffffff, 1.15)
    key.position.set(4, 6, 8)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xfff7ed, 0.35)
    fill.position.set(5, -2, 4)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0x93c5fd, 0.3)
    rim.position.set(-6, -4, -6)
    scene.add(rim)

    const viewGroup = new THREE.Group()
    scene.add(viewGroup)
    const cubeGroup = new THREE.Group()
    viewGroup.add(cubeGroup)
    viewGroup.rotation.x = DEFAULT_ROT_X
    viewGroup.rotation.y = DEFAULT_ROT_Y

    const assets = buildAssets()
    const cubies: Cubie[] = []
    rebuildCube(cubeGroup, cubies, assets.bodyGeometry, assets.stickerGeometry, assets.materials)

    const s: SceneState = {
      scene,
      camera,
      renderer,
      viewGroup,
      cubeGroup,
      cubies,
      bodyGeometry: assets.bodyGeometry,
      stickerGeometry: assets.stickerGeometry,
      materials: assets.materials,
      logic: createCube(),
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      ray: new THREE.Ray(),
      plane: new THREE.Plane(),
      queue: [],
      active: null,
      gesture: null,
      pointers: new Map(),
      targetRotX: DEFAULT_ROT_X,
      targetRotY: DEFAULT_ROT_Y,
      targetDist: DEFAULT_DIST,
      dist: DEFAULT_DIST,
      raf: 0,
    }
    stateRef.current = s

    const setPointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect()
      s.pointer.x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      s.pointer.y = -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1
    }

    const hitCubie = (clientX: number, clientY: number) => {
      setPointer(clientX, clientY)
      s.raycaster.setFromCamera(s.pointer, camera)
      const hits = s.raycaster.intersectObjects(s.cubies, true)
      for (const hit of hits) {
        if (!hit.face || !hit.point) continue
        // Walk up to the cubie group (hits can land on the body or a sticker).
        let root: THREE.Object3D | null = hit.object
        while (root && !root.userData.cubie) root = root.parent
        if (!root) continue
        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
        return { cubie: root as Cubie, normal, point: hit.point.clone() }
      }
      return null
    }

    const unprojectToPlane = (
      clientX: number,
      clientY: number,
      point: THREE.Vector3,
      normal: THREE.Vector3,
    ): THREE.Vector3 => {
      setPointer(clientX, clientY)
      s.raycaster.setFromCamera(s.pointer, camera)
      s.ray.copy(s.raycaster.ray)
      s.plane.setFromNormalAndCoplanarPoint(normal, point)
      const result = new THREE.Vector3()
      if (!s.ray.intersectPlane(s.plane, result)) result.copy(point)
      return result
    }

    /** Project a world position to client (viewport) pixels, matching pointer events. */
    const projectToClient = (world: THREE.Vector3) => {
      const v = world.clone().project(camera)
      const rect = renderer.domElement.getBoundingClientRect()
      return {
        x: rect.left + ((v.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - v.y) / 2) * rect.height,
      }
    }

    /**
     * Turn a (down → current) screen drag over a sticker into a swipe decision.
     * Shared by the live gesture handler and the dev-only test hook so both agree.
     */
    const resolveDrag = (
      downX: number,
      downY: number,
      curX: number,
      curY: number,
      normal: THREE.Vector3,
      point: THREE.Vector3,
      cubie: THREE.Vector3,
    ) => {
      const start = unprojectToPlane(downX, downY, point, normal)
      const current = unprojectToPlane(curX, curY, point, normal)
      const dragWorld = current.sub(start)

      const inverse = new THREE.Matrix4().copy(s.cubeGroup.matrixWorld).invert()
      const dragLocal = dragWorld.transformDirection(inverse)
      const normalLocal = normal.clone().transformDirection(inverse)
      const cubieLocal = cubie.clone().divideScalar(GAP)

      return resolveSwipe(normalLocal, cubieLocal, dragLocal)
    }

    const orbit = (dx: number, dy: number) => {
      s.targetRotY += dx * 0.008
      s.targetRotX += dy * 0.008
      s.targetRotX = clamp(s.targetRotX, -1.4, 1.4)
    }

    // Dev-only introspection used by browser tests; stripped from production builds.
    if (import.meta.env.DEV) {
      ;(window as unknown as { __cube?: unknown }).__cube = {
        pick(clientX: number, clientY: number) {
          const hit = hitCubie(clientX, clientY)
          if (!hit) return null
          const inv = new THREE.Matrix4().copy(s.cubeGroup.matrixWorld).invert()
          const n = hit.normal.clone().transformDirection(inv)
          const comps = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)]
          let idx = 0
          if (comps[1] > comps[idx]) idx = 1
          if (comps[2] > comps[idx]) idx = 2
          const sign = n.getComponent(idx) < 0 ? -1 : 1
          const normal = [0, 0, 0]
          normal[idx] = sign
          return {
            grid: [
              Math.round(hit.cubie.position.x / GAP),
              Math.round(hit.cubie.position.y / GAP),
              Math.round(hit.cubie.position.z / GAP),
            ],
            normal,
          }
        },
        state: () => stateToFacelet(s.logic),
        view: () => ({ rotX: s.targetRotX, rotY: s.targetRotY, dist: s.targetDist }),
        /** Predict the swipe decision for a drag from (clientX, clientY) by (dx, dy) px. */
        resolve(clientX: number, clientY: number, dx: number, dy: number) {
          const hit = hitCubie(clientX, clientY)
          if (!hit) return { kind: 'orbit', move: null }
          return resolveDrag(clientX, clientY, clientX + dx, clientY + dy, hit.normal, hit.point, hit.cubie.position)
        },
        debug(clientX: number, clientY: number) {
          setPointer(clientX, clientY)
          s.raycaster.setFromCamera(s.pointer, camera)
          const r = s.raycaster.ray
          return {
            pointer: [s.pointer.x, s.pointer.y],
            origin: [r.origin.x, r.origin.y, r.origin.z],
            dir: [r.direction.x, r.direction.y, r.direction.z],
            camPos: [camera.position.x, camera.position.y, camera.position.z],
            camWorld: camera.matrixWorld.elements.slice(12, 15),
            cubeScale: s.cubeGroup.scale.toArray(),
            cubeWorld: s.cubeGroup.matrixWorld.elements.slice(12, 15),
            cubie0World: s.cubies[0] ? s.cubies[0].matrixWorld.elements.slice(12, 15) : null,
            cubie0Local: s.cubies[0] ? s.cubies[0].position.toArray() : null,
            nCubies: s.cubies.length,
            frame: s.renderer.info.render.frame,
            raf: s.raf,
            domConnected: s.renderer.domElement.isConnected,
            mode: s.gesture ? s.gesture.mode : null,
            active: s.active
              ? { face: s.active.face, phase: s.active.phase, angle: s.active.angle, target: s.active.target, move: s.active.move }
              : null,
          }
        },
        /** Advance one frame synchronously (rAF is paused in hidden tabs). */
        pump(now?: number) {
          step(now ?? performance.now())
        },
      }
    }

    const startPinch = (g: Gesture) => {
      const pts = [...s.pointers.values()]
      if (pts.length < 2) return
      g.mode = 'pinch'
      g.pinchDist = Math.max(Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), 1)
      g.pinchCam = s.targetDist
      g.midX = (pts[0].x + pts[1].x) / 2
      g.midY = (pts[0].y + pts[1].y) / 2
    }

    /** Attach the nine cubelets of a layer to a fresh pivot at the cube centre. */
    const createPivot = (move: Move) => {
      const axisVals = FACE_AXIS[move.face]
      const layerIdx = FACE_LAYER_INDEX[move.face]
      const pivot = new THREE.Group()
      s.cubeGroup.add(pivot)
      const layer = s.cubies.filter((c) => {
        const grid = Math.round(c.position.getComponent(layerIdx) / GAP)
        return grid * axisVals[layerIdx] === 1
      })
      layer.forEach((c) => pivot.attach(c))
      return { pivot, layer }
    }

    /** A move coming from the queue starts its timed 90° (or 180°) animation immediately. */
    const startQueuedTurn = (move: Move, duration: number, now: number) => {
      const { pivot, layer } = createPivot(move)
      s.active = {
        pivot,
        cubies: layer,
        face: move.face,
        axis: new THREE.Vector3(FACE_AXIS[move.face][0], FACE_AXIS[move.face][1], FACE_AXIS[move.face][2]),
        phase: 'settle',
        angle: 0,
        from: 0,
        target: moveAngle(move),
        start: now,
        duration,
        move,
        fromGesture: false,
      }
    }

    /** The finger grabbed a sticker: attach the layer and follow the finger from now on. */
    const startFollowTurn = (g: Gesture, move: Move) => {
      const { pivot, layer } = createPivot(move)
      const axis = new THREE.Vector3(FACE_AXIS[move.face][0], FACE_AXIS[move.face][1], FACE_AXIS[move.face][2])

      // World rotation axis (through the cube centre) and the grabbed point split
      // into its along-axis and perpendicular-radius parts.
      const centerWorld = new THREE.Vector3().setFromMatrixPosition(s.cubeGroup.matrixWorld)
      const axisWorld = axis.clone().transformDirection(s.cubeGroup.matrixWorld).normalize()
      const rel = g.point!.clone().sub(centerWorld)
      const along0 = axisWorld.clone().multiplyScalar(rel.dot(axisWorld))
      const perp0 = rel.clone().sub(along0)

      s.active = {
        pivot,
        cubies: layer,
        face: move.face,
        axis,
        phase: 'follow',
        angle: 0,
        from: 0,
        target: 0,
        start: 0,
        duration: 0,
        move: null,
        fromGesture: true,
      }

      g.axisWorld = axisWorld
      g.perp0 = perp0
      g.along0 = along0
      g.centerWorld = centerWorld
      // Follow from the grab point so the finger travel already used to reach the
      // swipe threshold still counts toward the turn.
      g.lastX = g.downX
      g.lastY = g.downY
      g.mode = 'turn'
    }

    /** Move the grabbed layer to a timed settle: a committed turn or a rollback to 0. */
    const startSettle = (active: ActiveTurn, target: number, move: Move | null) => {
      active.phase = 'settle'
      active.from = active.angle
      active.target = target
      active.start = performance.now()
      active.duration = propsRef.current.reducedMotion
        ? 0
        : move
          ? settleDuration(propsRef.current.animationSpeed, active.angle, target)
          : settleDuration(Math.min(propsRef.current.animationSpeed, 180), active.angle, target)
      active.move = move
    }

    const finishTurn = () => {
      const active = s.active
      if (!active) return

      active.cubies.forEach((c) => {
        s.cubeGroup.attach(c)
        c.position.set(
          Math.round(c.position.x / GAP) * GAP,
          Math.round(c.position.y / GAP) * GAP,
          Math.round(c.position.z / GAP) * GAP,
        )
        // Snap orientation to the nearest 90° rotation so drift can never accumulate.
        const m = new THREE.Matrix4().makeRotationFromQuaternion(c.quaternion)
        const e = m.elements
        for (let i = 0; i < 16; i++) e[i] = Math.round(e[i])
        c.quaternion.setFromRotationMatrix(m)
      })
      s.cubeGroup.remove(active.pivot)
      s.active = null

      if (active.move) {
        // Keep the authoritative logical state in lockstep with the animation.
        s.logic = applyMoveToState(s.logic, active.move)
        if (active.fromGesture) propsRef.current.onUserMove?.(active.move)
        propsRef.current.onSolvedChange?.(isCubeSolved(s.logic))
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      const g = s.gesture
      // One layer at a time: extra fingers are ignored while a layer tracks the finger.
      if (g && g.mode === 'turn') return

      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      try {
        renderer.domElement.setPointerCapture(e.pointerId)
      } catch {
        // pointer capture is best-effort
      }
      e.preventDefault()

      if (g) {
        // A second finger turns the gesture into camera pan/zoom.
        if (s.pointers.size >= 2 && g.mode !== 'pinch') startPinch(g)
        return
      }

      const busy = s.active !== null || s.queue.length > 0
      let mode: GestureMode = 'orbit'
      let normal: THREE.Vector3 | null = null
      let point: THREE.Vector3 | null = null
      let cubie: Cubie | null = null

      if (!busy) {
        const pick = hitCubie(e.clientX, e.clientY)
        if (pick) {
          mode = 'pending'
          normal = pick.normal
          point = pick.point
          cubie = pick.cubie
        }
      } else if (hitCubie(e.clientX, e.clientY)) {
        // A turn is being committed: lock layer gestures instead of orbiting.
        mode = 'locked'
      }

      s.gesture = {
        pointerId: e.pointerId,
        mode,
        downX: e.clientX,
        downY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        normal,
        point,
        cubie,
        pinchDist: 0,
        pinchCam: DEFAULT_DIST,
        midX: e.clientX,
        midY: e.clientY,
        axisWorld: null,
        perp0: null,
        along0: null,
        centerWorld: null,
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const tracked = s.pointers.get(e.pointerId)
      if (tracked) {
        tracked.x = e.clientX
        tracked.y = e.clientY
      }
      const g = s.gesture
      if (!g) return

      if (g.mode === 'pinch') {
        const pts = [...s.pointers.values()]
        if (pts.length < 2) return
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        if (d < PINCH_MIN) {
          // Too close to measure reliably: re-baseline so zoom starts smoothly.
          g.pinchDist = d
          g.pinchCam = s.targetDist
        } else {
          s.targetDist = clamp((g.pinchCam * g.pinchDist) / d, MIN_DIST, MAX_DIST)
        }
        const midX = (pts[0].x + pts[1].x) / 2
        const midY = (pts[0].y + pts[1].y) / 2
        orbit(midX - g.midX, midY - g.midY)
        g.midX = midX
        g.midY = midY
        return
      }

      if (g.pointerId !== e.pointerId) return

      if (g.mode === 'orbit') {
        orbit(e.clientX - g.lastX, e.clientY - g.lastY)
        g.lastX = e.clientX
        g.lastY = e.clientY
        return
      }
      if (g.mode === 'locked') return

      if (g.mode === 'turn') {
        const active = s.active
        if (
          !active ||
          active.phase !== 'follow' ||
          !g.axisWorld ||
          !g.perp0 ||
          !g.along0 ||
          !g.centerWorld
        ) {
          return
        }
        // Where the grabbed point sits now that the layer has turned by `active.angle`.
        const perp = g.perp0.clone().applyAxisAngle(g.axisWorld, active.angle)
        const pointOnLayer = g.centerWorld.clone().add(g.along0).add(perp)
        // Screen direction and speed of that point for a positive rotation.
        const velocity = new THREE.Vector3().crossVectors(g.axisWorld, perp)
        const dTheta = 0.02
        const ahead = pointOnLayer.clone().addScaledVector(velocity, dTheta)
        const from = projectToClient(pointOnLayer)
        const to = projectToClient(ahead)
        const sx = to.x - from.x
        const sy = to.y - from.y
        const len = Math.hypot(sx, sy)
        if (len < 1e-6) return
        const pixelsPerRadian = len / dTheta / DRAG_GAIN
        const angle = stepTurn(
          active.angle,
          e.clientX - g.lastX,
          e.clientY - g.lastY,
          sx / len,
          sy / len,
          pixelsPerRadian,
        )
        g.lastX = e.clientX
        g.lastY = e.clientY
        active.angle = angle
        active.pivot.quaternion.setFromAxisAngle(active.axis, angle)
        return
      }

      // mode === 'pending': wait for enough travel to decide the swipe direction.
      const dx = e.clientX - g.downX
      const dy = e.clientY - g.downY
      if (dx * dx + dy * dy < SWIPE_THRESHOLD * SWIPE_THRESHOLD) return

      if (!g.normal || !g.point || !g.cubie) {
        g.mode = 'orbit'
        return
      }
      if (s.active !== null || s.queue.length > 0) {
        // A move slipped in while the finger was down — lock instead of corrupting.
        g.mode = 'locked'
        return
      }

      const decision = resolveDrag(g.downX, g.downY, e.clientX, e.clientY, g.normal, g.point, g.cubie.position)
      if (decision.kind === 'turn') {
        startFollowTurn(g, decision.move)
      } else {
        // Not a single-layer turn (e.g. a face-center sticker): orbit the view.
        g.mode = 'orbit'
        orbit(e.clientX - g.downX, e.clientY - g.downY)
        g.lastX = e.clientX
        g.lastY = e.clientY
      }
    }

    /**
     * End a pointer. `kind` is 'up' for a normal release (a grabbed layer decides
     * whether to commit or roll back) and 'cancel' for interruption (always rolls back).
     */
    const endGesture = (e: PointerEvent, kind: 'up' | 'cancel') => {
      const g = s.gesture
      s.pointers.delete(e.pointerId)
      if (!g) return

      if (g.mode === 'pinch') {
        const remaining = [...s.pointers.entries()][0]
        if (remaining && kind === 'up') {
          // Keep the remaining finger alive as a single-finger orbit.
          s.gesture = {
            pointerId: remaining[0],
            mode: 'orbit',
            downX: remaining[1].x,
            downY: remaining[1].y,
            lastX: remaining[1].x,
            lastY: remaining[1].y,
            normal: null,
            point: null,
            cubie: null,
            pinchDist: 0,
            pinchCam: DEFAULT_DIST,
            midX: remaining[1].x,
            midY: remaining[1].y,
            axisWorld: null,
            perp0: null,
            along0: null,
            centerWorld: null,
          }
        } else {
          s.gesture = null
        }
        return
      }

      if (g.pointerId !== e.pointerId) return
      s.gesture = null
      try {
        renderer.domElement.releasePointerCapture(e.pointerId)
      } catch {
        // already released
      }

      if (g.mode === 'turn' && s.active && s.active.phase === 'follow') {
        if (kind === 'up') {
          const { target, move } = decideTurn(s.active.face, s.active.angle)
          startSettle(s.active, target, move)
        } else {
          // Interrupted gesture (touch cancellation): slide back without a move.
          startSettle(s.active, 0, null)
        }
      }
    }

    const onPointerUp = (e: PointerEvent) => endGesture(e, 'up')
    const onPointerCancel = (e: PointerEvent) => endGesture(e, 'cancel')
    const onLostCapture = (e: PointerEvent) => endGesture(e, 'cancel')
    const onContextMenu = (e: Event) => e.preventDefault()

    const onWheel = (e: WheelEvent) => {
      if (propsRef.current.idle) return // let the landing page scroll normally
      e.preventDefault()
      s.targetDist = clamp(s.targetDist * Math.exp(e.deltaY * 0.0015), MIN_DIST, MAX_DIST)
    }

    // Belt and braces: touch-action:none covers most browsers, but iOS Safari
    // still needs explicit preventDefault to block page scroll/pinch over the cube.
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 1) e.preventDefault()
    }
    const onSafariGesture = (e: Event) => e.preventDefault()

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerCancel)
    renderer.domElement.addEventListener('lostpointercapture', onLostCapture)
    renderer.domElement.addEventListener('contextmenu', onContextMenu)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false })
    renderer.domElement.addEventListener('gesturestart', onSafariGesture)
    renderer.domElement.addEventListener('gesturechange', onSafariGesture)

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

    /** Advance the scene to time `now` (ms). Shared by the rAF loop and the dev test pump. */
    const step = (now: number) => {
      if (propsRef.current.idle && !s.gesture && !s.active && !propsRef.current.reducedMotion) {
        s.targetRotY += 0.0035
      }
      viewGroup.rotation.x += (s.targetRotX - viewGroup.rotation.x) * 0.12
      viewGroup.rotation.y += (s.targetRotY - viewGroup.rotation.y) * 0.12
      s.dist += (s.targetDist - s.dist) * 0.15
      camera.position.z = s.dist
      const sc = propsRef.current.scale
      cubeGroup.scale.setScalar(cubeGroup.scale.x + (sc - cubeGroup.scale.x) * 0.2)

      if (!s.active && s.queue.length > 0) {
        const next = s.queue.shift()!
        startQueuedTurn(next.move, next.duration, now)
      }
      if (s.active && s.active.phase === 'settle') {
        const active = s.active
        const t = active.duration === 0 ? 1 : Math.min((now - active.start) / active.duration, 1)
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        const angle = active.from + (active.target - active.from) * eased
        active.pivot.quaternion.setFromAxisAngle(active.axis, angle)
        active.angle = angle
        if (t >= 1) finishTurn()
      }

      renderer.render(scene, camera)
    }

    const tick = (now: number) => {
      s.raf = requestAnimationFrame(tick)
      step(now)
    }
    s.raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(s.raf)
      observer.disconnect()
      if (import.meta.env.DEV) delete (window as unknown as { __cube?: unknown }).__cube
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel)
      renderer.domElement.removeEventListener('lostpointercapture', onLostCapture)
      renderer.domElement.removeEventListener('contextmenu', onContextMenu)
      renderer.domElement.removeEventListener('wheel', onWheel)
      renderer.domElement.removeEventListener('touchmove', onTouchMove)
      renderer.domElement.removeEventListener('gesturestart', onSafariGesture)
      renderer.domElement.removeEventListener('gesturechange', onSafariGesture)
      assets.bodyGeometry.dispose()
      assets.stickerGeometry.dispose()
      Object.values(assets.materials).forEach((material) => material.dispose())
      renderer.dispose()
      container.removeChild(renderer.domElement)
      stateRef.current = null
    }
  }, [])

  return <div ref={containerRef} className={className} style={{ touchAction: 'none' }} />
})

function buildAssets(): {
  bodyGeometry: RoundedBoxGeometry
  stickerGeometry: THREE.ShapeGeometry
  materials: Materials
} {
  const bodyGeometry = new RoundedBoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE, 3, BEVEL)
  const stickerGeometry = new THREE.ShapeGeometry(
    roundedRectShape(STICKER_SIZE / 2, STICKER_CORNER),
    6,
  )
  const materials: Materials = {
    px: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.px, roughness: 0.34 }),
    nx: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.nx, roughness: 0.34 }),
    py: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.py, roughness: 0.34 }),
    ny: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.ny, roughness: 0.34 }),
    pz: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.pz, roughness: 0.34 }),
    nz: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.nz, roughness: 0.34 }),
    core: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.core, roughness: 0.6 }),
  }
  return { bodyGeometry, stickerGeometry, materials }
}

/** A square with rounded corners, centred on the origin and facing +z. */
function roundedRectShape(half: number, radius: number): THREE.Shape {
  const r = Math.min(radius, half)
  const shape = new THREE.Shape()
  shape.moveTo(-half + r, -half)
  shape.lineTo(half - r, -half)
  shape.quadraticCurveTo(half, -half, half, -half + r)
  shape.lineTo(half, half - r)
  shape.quadraticCurveTo(half, half, half - r, half)
  shape.lineTo(-half + r, half)
  shape.quadraticCurveTo(-half, half, -half, half - r)
  shape.lineTo(-half, -half + r)
  shape.quadraticCurveTo(-half, -half, -half + r, -half)
  return shape
}

/** Place a sticker plate just outside one face of a cubelet. */
function addSticker(cubie: Cubie, dir: 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz', geometry: THREE.BufferGeometry, material: THREE.Material) {
  const sticker = new THREE.Mesh(geometry, material)
  switch (dir) {
    case 'px':
      sticker.position.x = STICKER_LIFT
      sticker.rotation.y = Math.PI / 2
      break
    case 'nx':
      sticker.position.x = -STICKER_LIFT
      sticker.rotation.y = -Math.PI / 2
      break
    case 'py':
      sticker.position.y = STICKER_LIFT
      sticker.rotation.x = -Math.PI / 2
      break
    case 'ny':
      sticker.position.y = -STICKER_LIFT
      sticker.rotation.x = Math.PI / 2
      break
    case 'pz':
      sticker.position.z = STICKER_LIFT
      break
    case 'nz':
      sticker.position.z = -STICKER_LIFT
      sticker.rotation.y = Math.PI
      break
  }
  cubie.add(sticker)
}

function rebuildCube(
  cubeGroup: THREE.Group,
  cubies: Cubie[],
  bodyGeometry: THREE.BufferGeometry,
  stickerGeometry: THREE.BufferGeometry,
  materials: Materials,
) {
  while (cubeGroup.children.length > 0) {
    cubeGroup.remove(cubeGroup.children[0])
  }
  cubies.length = 0

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const cubie = new THREE.Group()
        cubie.userData.cubie = true
        cubie.add(new THREE.Mesh(bodyGeometry, materials.core))
        if (x === 1) addSticker(cubie, 'px', stickerGeometry, materials.px)
        if (x === -1) addSticker(cubie, 'nx', stickerGeometry, materials.nx)
        if (y === 1) addSticker(cubie, 'py', stickerGeometry, materials.py)
        if (y === -1) addSticker(cubie, 'ny', stickerGeometry, materials.ny)
        if (z === 1) addSticker(cubie, 'pz', stickerGeometry, materials.pz)
        if (z === -1) addSticker(cubie, 'nz', stickerGeometry, materials.nz)
        cubie.position.set(x * GAP, y * GAP, z * GAP)
        cubeGroup.add(cubie)
        cubies.push(cubie)
      }
    }
  }
}

export default CubeScene
