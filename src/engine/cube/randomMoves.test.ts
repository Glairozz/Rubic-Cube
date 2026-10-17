import { describe, it, expect } from 'vitest'
import { applyMoveToState, createCube, isCubeSolved, stateToFacelet } from './cubeModel'
import { FACE_LAYER_INDEX, invertMove, pieceLayerValue, SLICES, type Face, type Modifier, type Move, type Piece } from '../moves/moves'
import { resolveSwipe } from './swipe'

const FACES: Face[] = ['U', 'D', 'F', 'B', 'R', 'L']
/** Faces and middle slices together — the engine must treat them alike. */
const PIECES: Piece[] = [...FACES, ...SLICES]
const MODIFIERS: Modifier[] = ['', "'", '2']

/** Tiny deterministic LCG so failures are reproducible. */
function makeRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

describe('mechanical consistency', () => {
  it('remains a valid cube after 400 random face+slice moves; the inverse sequence restores solved', () => {
    const random = makeRandom(20261016)
    const history: Move[] = []
    let cube = createCube()
    for (let i = 0; i < 400; i++) {
      const move: Move = {
        // Includes M/E/S so middle slices are exercised, not just outer faces.
        face: PIECES[Math.floor(random() * PIECES.length)],
        modifier: MODIFIERS[Math.floor(random() * MODIFIERS.length)],
      }
      history.push(move)
      cube = applyMoveToState(cube, move)
    }

    const facelet = stateToFacelet(cube)
    expect(facelet.length).toBe(54)
    // Every face of the cube must still show exactly nine stickers of its colour.
    for (const face of 'URFDLB') {
      expect(facelet.split(face).length - 1).toBe(9)
    }

    let undone = cube
    for (let i = history.length - 1; i >= 0; i--) {
      undone = applyMoveToState(undone, invertMove(history[i]))
    }
    expect(isCubeSolved(undone)).toBe(true)
  })

  it('every swipe resolution turns the layer the touched sticker belongs to', () => {
    const normals: Array<{ x: number; y: number; z: number }> = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
    ]
    const drags = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
    ]

    let turns = 0
    for (const n of normals) {
      // All nine cubie positions that carry a sticker with this normal.
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          const cubie =
            n.x !== 0
              ? { x: n.x, y: a, z: b }
              : n.y !== 0
                ? { x: a, y: n.y, z: b }
                : { x: a, y: b, z: n.z }
          for (const drag of drags) {
            const decision = resolveSwipe(n, cubie, drag)
            if (decision.kind !== 'turn') continue
            turns++
            const idx = FACE_LAYER_INDEX[decision.move.face]
            const component = idx === 0 ? cubie.x : idx === 1 ? cubie.y : cubie.z
            // The touched cubie must lie in the layer that gets turned:
            // ±1 for an outer face, 0 for a middle slice.
            expect(component).toBe(pieceLayerValue(decision.move.face))
          }
        }
      }
    }
    expect(turns).toBeGreaterThanOrEqual(96)
  })
})
