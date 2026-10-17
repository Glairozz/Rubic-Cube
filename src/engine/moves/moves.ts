export type Face = 'U' | 'D' | 'F' | 'B' | 'R' | 'L'
/**
 * Middle-layer slices (Singmaster notation). Each one is defined to turn in the
 * same direction as the outer face it is named after:
 * - `M` (between L and R, x = 0) turns like `L`
 * - `E` (between U and D, y = 0) turns like `D`
 * - `S` (between F and B, z = 0) turns like `F`
 */
export type Slice = 'M' | 'E' | 'S'
/** Any turnable layer: an outer face or a middle slice. */
export type Piece = Face | Slice
export type Modifier = '' | "'" | '2'

export interface Move {
  /** The turned layer — an outer face or a middle slice. */
  face: Piece
  modifier: Modifier
}

export const FACES: Face[] = ['U', 'D', 'F', 'B', 'R', 'L']
export const SLICES: Slice[] = ['M', 'E', 'S']
const PIECES: Piece[] = [...FACES, ...SLICES]

export function isSlice(piece: Piece): piece is Slice {
  return piece === 'M' || piece === 'E' || piece === 'S'
}

export function parseMove(notation: string): Move {
  const face = notation[0] as Piece
  if (!PIECES.includes(face)) throw new Error(`Invalid face: ${notation}`)
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

/**
 * Rotation axis for every layer (unit vector components). For a face this is
 * its outward normal; for a slice it is the normal of the face it copies its
 * direction from (L for M, D for E, F for S).
 */
export const FACE_AXIS: Record<Piece, [number, number, number]> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  M: [-1, 0, 0],
  E: [0, -1, 0],
  S: [0, 0, 1],
}

/** Which world coordinate (x=0, y=1, z=2) identifies the turned layer. */
export const FACE_LAYER_INDEX: Record<Piece, 0 | 1 | 2> = {
  R: 0, L: 0, U: 1, D: 1, F: 2, B: 2, M: 0, E: 1, S: 2,
}

/**
 * Grid position of the turned layer along its layer axis, in cubelet units:
 * outer faces are at ±1, middle slices at 0.
 */
export function pieceLayerValue(piece: Piece): number {
  return isSlice(piece) ? 0 : FACE_AXIS[piece][FACE_LAYER_INDEX[piece]]
}

/** Rotation angle (radians) applied around the layer axis, right-handed. */
export function moveAngle(move: Move): number {
  const base = -Math.PI / 2 // clockwise viewed from outside the layer
  const sign = move.modifier === "'" ? -1 : 1
  const times = move.modifier === '2' ? 2 : 1
  return base * sign * times
}
