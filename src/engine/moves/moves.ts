export type Face = 'U' | 'D' | 'F' | 'B' | 'R' | 'L'
export type Modifier = '' | "'" | '2'

export interface Move {
  face: Face
  modifier: Modifier
}

const FACES: Face[] = ['U', 'D', 'F', 'B', 'R', 'L']

export function parseMove(notation: string): Move {
  const face = notation[0] as Face
  if (!FACES.includes(face)) throw new Error(`Invalid face: ${notation}`)
  const rest = notation.slice(1)
  const modifier: Modifier = rest === "'" ? "'" : rest === '2' ? '2' : ''
  return { face, modifier }
}

export function formatMove(move: Move): string {
  return `${move.face}${move.modifier}`
}

export function invertMove(move: Move): Move {
  if (move.modifier === '2') return move
  return { face: move.face, modifier: move.modifier === "'" ? '' : "'" }
}

/** Outward normal axis for each face (unit vector components). */
export const FACE_AXIS: Record<Face, [number, number, number]> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

/** Which world coordinate identifies the turned layer (±1). */
export const FACE_LAYER_INDEX: Record<Face, 0 | 1 | 2> = {
  R: 0, L: 0, U: 1, D: 1, F: 2, B: 2,
}

export function layerCoordinate(move: Move): number {
  const axis = FACE_AXIS[move.face]
  return axis[FACE_LAYER_INDEX[move.face]]
}

/** Rotation angle (radians) applied around the face normal, right-handed. */
export function moveAngle(move: Move): number {
  const base = -Math.PI / 2 // clockwise viewed from outside the face
  const sign = move.modifier === "'" ? -1 : 1
  const times = move.modifier === '2' ? 2 : 1
  return base * sign * times
}
