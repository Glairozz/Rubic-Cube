import type { Face, Move, Piece } from '../moves/moves'

/** A plain 3D vector, kept dependency-free so the resolver is easy to unit-test. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export type SwipeDecision =
  | { kind: 'turn'; move: Move }
  /** The gesture cannot map to a single layer turn, so it should orbit the camera. */
  | { kind: 'orbit' }

const FACE_BY_NORMAL: Record<string, Face> = {
  '1,0,0': 'R',
  '-1,0,0': 'L',
  '0,1,0': 'U',
  '0,-1,0': 'D',
  '0,0,1': 'F',
  '0,0,-1': 'B',
}

/** Middle slice for each rotation axis (x, y, z). */
const SLICE_BY_AXIS: Record<0 | 1 | 2, Piece> = { 0: 'M', 1: 'E', 2: 'S' }

/**
 * Reference axis of each slice — the outward normal of the face whose turn
 * direction it copies (M follows L, E follows D, S follows F).
 */
const SLICE_REFERENCE_AXIS: Record<string, Vec3> = {
  M: { x: -1, y: 0, z: 0 },
  E: { x: 0, y: -1, z: 0 },
  S: { x: 0, y: 0, z: 1 },
}

function component(v: Vec3, index: 0 | 1 | 2): number {
  return index === 0 ? v.x : index === 1 ? v.y : v.z
}

function axis(index: 0 | 1 | 2, sign: number): Vec3 {
  return {
    x: index === 0 ? sign : 0,
    y: index === 1 ? sign : 0,
    z: index === 2 ? sign : 0,
  }
}

/** Snap a (near) axis-aligned vector to the closest exact unit axis. */
function snapAxis(v: Vec3, out: { index: 0 | 1 | 2; sign: 1 | -1 }): void {
  const ax = Math.abs(v.x)
  const ay = Math.abs(v.y)
  const az = Math.abs(v.z)
  if (ax >= ay && ax >= az) {
    out.index = 0
    out.sign = v.x < 0 ? -1 : 1
  } else if (ay >= az) {
    out.index = 1
    out.sign = v.y < 0 ? -1 : 1
  } else {
    out.index = 2
    out.sign = v.z < 0 ? -1 : 1
  }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/**
 * Resolve a finger/mouse drag across a sticker into a cube move.
 *
 * All inputs are expressed in the cube's own (unscaled, axis-aligned) frame:
 * - `normal`  outward normal of the touched sticker face
 * - `cubie`   grid position of the touched cubie, e.g. {x:1,y:1,z:1} or {x:0,y:1,z:-1}
 * - `drag`    drag delta in the plane of the touched sticker
 *
 * The layer that follows the finger is found by rotating around the axis
 * perpendicular to both the sticker normal and the drag direction:
 * - if the touched cubie sits on that axis at ±1, an outer face turns;
 * - if it sits at 0, the matching middle slice (M/E/S) turns.
 * Only a degenerate drag falls back to orbiting the camera.
 */
export function resolveSwipe(normal: Vec3, cubie: Vec3, drag: Vec3): SwipeDecision {
  const n: { index: 0 | 1 | 2; sign: 1 | -1 } = { index: 0, sign: 1 }
  snapAxis(normal, n)
  const nVec = axis(n.index, n.sign)

  // Project the drag onto the sticker plane (drop the normal component).
  const dn = dot(drag, nVec)
  const plane: Vec3 = { x: drag.x - dn * nVec.x, y: drag.y - dn * nVec.y, z: drag.z - dn * nVec.z }

  // Dominant in-plane drag direction.
  let bestIndex: 0 | 1 | 2 = n.index === 0 ? 1 : 0
  let bestMagnitude = 0
  let bestSign: 1 | -1 = 1
  for (const i of [0, 1, 2] as const) {
    if (i === n.index) continue
    const value = component(plane, i)
    if (Math.abs(value) > bestMagnitude) {
      bestMagnitude = Math.abs(value)
      bestIndex = i
      bestSign = value < 0 ? -1 : 1
    }
  }
  if (bestMagnitude < 1e-6) return { kind: 'orbit' }

  const tangent = axis(bestIndex, bestSign)
  const rotationAxis = cross(nVec, tangent) // exact ±unit axis
  const a: { index: 0 | 1 | 2; sign: 1 | -1 } = { index: 0, sign: 1 }
  snapAxis(rotationAxis, a)
  const aVec = axis(a.index, a.sign)

  // Which layer does the touched cubie belong to along the rotation axis?
  // ±1 = outer face, 0 = middle slice (M/E/S).
  const layer = Math.round(component(cubie, a.index) * a.sign)

  // Velocity of the touched cubie for a positive rotation around the axis,
  // and the signed rotation that follows the finger.
  const velocity = cross(aVec, cubie)
  const follow = dot(velocity, plane)
  if (Math.abs(follow) < 1e-9) return { kind: 'orbit' }

  const omega = follow > 0 ? 1 : -1

  if (layer === 0) {
    // Middle slice: choose M/E/S from the rotation axis, then express the
    // rotation around that slice's reference axis (positive = inverse/CCW).
    const piece = SLICE_BY_AXIS[a.index]
    const reference = SLICE_REFERENCE_AXIS[piece]
    const omegaReference = omega * dot(aVec, reference)
    return { kind: 'turn', move: { face: piece, modifier: omegaReference > 0 ? "'" : '' } }
  }

  // Outward normal of that face.
  const faceSign = layer > 0 ? a.sign : -a.sign
  const faceVec = axis(a.index, faceSign)
  const face = FACE_BY_NORMAL[`${faceVec.x},${faceVec.y},${faceVec.z}`]
  if (!face) return { kind: 'orbit' }

  const omegaFace = omega * layer // signed rotation around the face's outward normal
  const modifier = omegaFace > 0 ? "'" : '' // positive around outward normal = counter-clockwise
  return { kind: 'turn', move: { face, modifier } }
}
