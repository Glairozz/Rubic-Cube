import type { Face, Move } from '../moves/moves'

/** How far (radians) a layer may travel while tracking the finger (~140°). */
export const FOLLOW_LIMIT = 2.45
/** A released swipe below this angle (~45°) slides back to where it started. */
export const COMMIT_THRESHOLD = Math.PI / 4
/** A released swipe past this angle (~135°) commits a half turn instead of a quarter turn. */
export const HALF_TURN_THRESHOLD = (3 * Math.PI) / 4

export const QUARTER_TURN = Math.PI / 2
export const HALF_TURN = Math.PI

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/**
 * Advance the rotation of a layer being dragged by `(dragX, dragY)` client pixels.
 *
 * The layer is driven 1:1 with the finger in *screen* space: the grabbed point of
 * the layer travels along the unit direction `(tangentX, tangentY)` at
 * `pixelsPerRadian` pixels per radian, so only the component of the drag along
 * that direction rotates the layer. Dragging toward or away from the rotation
 * axis therefore does nothing, and opposite swipes stay symmetric — something a
 * sticker-plane projection cannot guarantee (a radial drag would otherwise leak
 * into the angle and make one direction feel dead).
 */
export function stepTurn(
  angle: number,
  dragX: number,
  dragY: number,
  tangentX: number,
  tangentY: number,
  pixelsPerRadian: number,
): number {
  if (pixelsPerRadian < 1e-6) return clamp(angle, -FOLLOW_LIMIT, FOLLOW_LIMIT)
  const along = dragX * tangentX + dragY * tangentY
  return clamp(angle + along / pixelsPerRadian, -FOLLOW_LIMIT, FOLLOW_LIMIT)
}

/**
 * Decide what happens when a finger-release ends a drag-following turn.
 *
 * - below COMMIT_THRESHOLD the layer slides back to 0 (cancelled move)
 * - below HALF_TURN_THRESHOLD it snaps a quarter turn in the drag direction
 * - beyond that it snaps a half turn (e.g. dragging R past 135° gives R2)
 *
 * `angle` is measured around the face's outward normal, so a positive angle
 * is counter-clockwise seen from outside the face (standard `?` notation).
 */
export function decideTurn(face: Face, angle: number): { target: number; move: Move | null } {
  const magnitude = Math.abs(angle)
  const sign = angle < 0 ? -1 : 1
  if (magnitude < COMMIT_THRESHOLD) return { target: 0, move: null }
  if (magnitude >= HALF_TURN_THRESHOLD) return { target: sign * HALF_TURN, move: { face, modifier: '2' } }
  return { target: sign * QUARTER_TURN, move: { face, modifier: sign > 0 ? "'" : '' } }
}

/** Duration (ms) for the snap animation after a release, proportional to the remaining angle. */
export function settleDuration(baseMs: number, from: number, target: number): number {
  const remaining = Math.abs(target - from)
  if (remaining < 1e-6) return 0
  return Math.max(80, Math.round((baseMs * remaining) / QUARTER_TURN))
}
