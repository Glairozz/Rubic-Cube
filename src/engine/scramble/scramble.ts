import { parseMove, formatMove, type Face, type Move } from '../moves/moves'

const ALL_FACES: Face[] = ['U', 'D', 'F', 'B', 'R', 'L']
const MODIFIERS = ['', "'", '2'] as const

/** Random scramble that never repeats the same face twice in a row. */
export function generateScramble(length = 20): Move[] {
  const moves: Move[] = []
  let lastFace: Face | null = null
  while (moves.length < length) {
    const face = ALL_FACES[Math.floor(Math.random() * ALL_FACES.length)]
    if (face === lastFace) continue
    const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)]
    moves.push(parseMove(`${face}${modifier}`))
    lastFace = face
  }
  return moves
}

export function scrambleToString(moves: Move[]): string {
  return moves.map(formatMove).join(' ')
}
