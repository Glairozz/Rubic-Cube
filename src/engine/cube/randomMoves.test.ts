import { describe, it, expect } from 'vitest'
import { applyMoveToState, createCube, isCubeSolved, stateToFacelet } from './cubeModel'
import { FACE_AXIS, FACE_LAYER_INDEX, invertMove, type Face, type Modifier, type Move } from '../moves/moves'
import { resolveSwipe } from './swipe'

const FACES: Face[] = ['U', 'D', 'F', 'B', 'R', 'L']
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
  it('remains a valid cube after 400 random moves; the inverse sequence restores solved', () => {
    const random = makeRandom(20261016)
    const history: Move[] = []
    let cube = createCube()
    for (let i = 0; i < 400; i++) {
      const move: Move = {
        face: FACES[Math.floor(random() * FACES.length)],
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
            const axis = FACE_AXIS[decision.move.face]
            const idx = FACE_LAYER_INDEX[decision.move.face]
            const component = idx === 0 ? cubie.x : idx === 1 ? cubie.y : cubie.z
            // The touched cubie must lie in the outer layer that gets turned.
            expect(component * axis[idx]).toBe(1)
          }
        }
      }
    }
    expect(turns).toBeGreaterThanOrEqual(96)
  })
})
