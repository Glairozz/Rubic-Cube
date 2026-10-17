import { describe, it, expect } from 'vitest'
import { createCube, applyAlgorithmToState, isCubeSolved, stateToFacelet, cubeFromFacelet, algorithmToMoves, solveFaceletSync } from './cubeModel'
import { parseMove, invertMove, formatMove, moveAngle, type Move } from '../moves/moves'

describe('moves', () => {
  it('parseMove/formatMove/invertMove', () => {
    expect(parseMove("R'")).toEqual({ face: 'R', modifier: "'" })
    expect(parseMove('R2')).toEqual({ face: 'R', modifier: '2' })
    expect(parseMove('R')).toEqual({ face: 'R', modifier: '' })
    expect(formatMove({ face: 'U', modifier: "'" })).toBe("U'")
    expect(invertMove({ face: 'R', modifier: '' })).toEqual({ face: 'R', modifier: "'" })
    expect(invertMove({ face: 'R', modifier: "'" })).toEqual({ face: 'R', modifier: '' })
    expect(invertMove({ face: 'F', modifier: '2' })).toEqual({ face: 'F', modifier: '2' })
  })

  it('parses middle slices in Singmaster notation', () => {
    expect(parseMove('M')).toEqual({ face: 'M', modifier: '' })
    expect(parseMove("E'")).toEqual({ face: 'E', modifier: "'" })
    expect(parseMove('S2')).toEqual({ face: 'S', modifier: '2' })
    expect(formatMove({ face: 'M', modifier: "'" })).toBe("M'")
    expect(invertMove({ face: 'S', modifier: '' })).toEqual({ face: 'S', modifier: "'" })
    expect(invertMove({ face: 'E', modifier: '2' })).toEqual({ face: 'E', modifier: '2' })
  })

  it('moveAngle sign convention matches ±90°', () => {
    // base -π/2; modifier ' (CCW viewed from outside) -> sign -1 gives -(-π/2)= +π/2
    expect(moveAngle({ face: 'U', modifier: "'" })).toBeCloseTo(Math.PI / 2)
    expect(moveAngle({ face: 'U', modifier: '' })).toBeCloseTo(-Math.PI / 2)
    expect(moveAngle({ face: 'U', modifier: '2' })).toBeCloseTo(-Math.PI)
  })

  it('slices use the same ±90°/180° angle convention', () => {
    for (const face of ['M', 'E', 'S'] as const) {
      expect(moveAngle({ face, modifier: '' })).toBeCloseTo(-Math.PI / 2)
      expect(moveAngle({ face, modifier: "'" })).toBeCloseTo(Math.PI / 2)
      expect(moveAngle({ face, modifier: '2' })).toBeCloseTo(-Math.PI)
    }
  })
})

describe('middle slices', () => {
  it('M/E/S + inverse restore a solved cube', () => {
    for (const face of ['M', 'E', 'S'] as const) {
      const cube = createCube()
      applyAlgorithmToState(cube, `${face} ${face}'`)
      expect(isCubeSolved(cube)).toBe(true)

      const twice = createCube()
      applyAlgorithmToState(twice, `${face}2 ${face}2`)
      expect(isCubeSolved(twice)).toBe(true)
    }
  })

  it('a move followed by its inverse restores the exact facelet', () => {
    const sequence = "M E S' M2 E' S"
    const scrambled = createCube()
    applyAlgorithmToState(scrambled, sequence)
    expect(isCubeSolved(scrambled)).toBe(false)

    const facelet = stateToFacelet(scrambled)
    const restored = cubeFromFacelet(facelet)
    applyAlgorithmToState(restored, "S' E M2 S E' M'")
    expect(isCubeSolved(restored)).toBe(true)
  })

  it('M follows L, E follows D on the facelet centers', () => {
    const m = createCube()
    applyAlgorithmToState(m, 'M')
    const mFacelet = stateToFacelet(m)
    // M (like L) sends U→B, B→D, D→F, F→U on the four ring centers.
    expect(mFacelet[4]).toBe('B') // U center now blue
    expect(mFacelet[22]).toBe('U') // F center now white
    expect(mFacelet[31]).toBe('F') // D center now red
    expect(mFacelet[49]).toBe('D') // B center now yellow

    const e = createCube()
    applyAlgorithmToState(e, 'E')
    const eFacelet = stateToFacelet(e)
    // E (like D) sends F→R, R→B, B→L, L→F.
    expect(eFacelet[22]).toBe('L') // F center now blue
    expect(eFacelet[13]).toBe('F') // R center now red
  })

  it('keeps nine stickers per colour after a mixed slice scramble', () => {
    const cube = createCube()
    applyAlgorithmToState(cube, "R M' U E S' D2 R' M E2")
    const facelet = stateToFacelet(cube)
    expect(facelet.length).toBe(54)
    for (const color of 'URFDLB') {
      expect(facelet.split(color).length - 1).toBe(9)
    }
  })
})

describe('cubeModel', () => {
  it('four quarter turns identity', () => {
    const faces: Move['face'][] = ['U', 'D', 'R', 'L', 'F', 'B']
    for (const f of faces) {
      const cube = createCube()
      applyAlgorithmToState(cube, `${f} ${f} ${f} ${f}`)
      expect(isCubeSolved(cube)).toBe(true)
    }
  })

  it('opposite moves identity pair', () => {
    const faces: Move['face'][] = ['U', 'D', 'R', 'L', 'F', 'B']
    for (const f of faces) {
      const cube = createCube()
      applyAlgorithmToState(cube, `${f} ${f}'`)
      expect(isCubeSolved(cube)).toBe(true)
      const cube2 = createCube()
      applyAlgorithmToState(cube2, `${f}' ${f}`)
      expect(isCubeSolved(cube2)).toBe(true)
    }
  })

  it('mixed sequence + inverse → solved', () => {
    const sequence = "R U R' U' F R' F' R"
    const cube = createCube()
    applyAlgorithmToState(cube, sequence)
    expect(isCubeSolved(cube)).toBe(false)
    const inv = invertAlgorithm(sequence)
    applyAlgorithmToState(cube, inv)
    expect(isCubeSolved(cube)).toBe(true)
  })

  it('facelet roundtrip', () => {
    const cube = createCube()
    applyAlgorithmToState(cube, "R U F' D L2 B R'")
    const facelet = stateToFacelet(cube)
    expect(facelet.length).toBe(54)
    const cube2 = cubeFromFacelet(facelet)
    expect(isCubeSolved(cube2)).toBe(false)
    expect(stateToFacelet(cube2)).toBe(facelet)
    expect(stateToFacelet(cube)).toBe(facelet)
  })

  it('algorithmToMoves roundtrips', () => {
    const algorithm = "R U R' U' F R2 B'"
    const moves = algorithmToMoves(algorithm)
    expect(moves.map(formatMove).join(' ')).toBe(algorithm)
  })

  it('solver solves scrambled cube', () => {
    const cube = createCube()
    const scramble = "U F R2 B' D2 L' U2"
    applyAlgorithmToState(cube, scramble)
    expect(isCubeSolved(cube)).toBe(false)
    const solution = solveFaceletSync(stateToFacelet(cube))
    expect(solution.length).toBeGreaterThan(0)
    const solved = createCube()
    applyAlgorithmToState(solved, scramble + ' ' + solution)
    expect(isCubeSolved(solved)).toBe(true)
  }, 20000)
})

function invertAlgorithm(algo: string): string {
  return algo
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map((n) => formatMove(invertMove(parseMove(n))))
    .join(' ')
}
