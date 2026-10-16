import { describe, it, expect } from 'vitest'
import {
  decideTurn,
  stepTurn,
  settleDuration,
  FOLLOW_LIMIT,
  COMMIT_THRESHOLD,
  HALF_TURN_THRESHOLD,
  QUARTER_TURN,
  HALF_TURN,
} from './gesture'

describe('stepTurn', () => {
  const tangentX = 1
  const tangentY = 0

  it('does not rotate when the finger has not moved', () => {
    expect(stepTurn(0, 0, 0, tangentX, tangentY, 100)).toBeCloseTo(0)
  })

  it('rotates 1:1 with the component of the drag along the tangent', () => {
    // 50 px along a 100 px/radian direction = half a radian.
    expect(stepTurn(0, 50, 0, tangentX, tangentY, 100)).toBeCloseTo(0.5)
    expect(stepTurn(0, -50, 0, tangentX, tangentY, 100)).toBeCloseTo(-0.5)
  })

  it('is symmetric for opposite swipes of equal length', () => {
    const right = stepTurn(0, 80, 0, 0.8, 0.6, 90)
    const left = stepTurn(0, -80, 0, 0.8, 0.6, 90)
    expect(right).toBeCloseTo(-left)
  })

  it('ignores drag perpendicular to the tangent (radial motion)', () => {
    expect(stepTurn(0, 0, 120, tangentX, tangentY, 100)).toBeCloseTo(0)
  })

  it('clamps to the follow limit', () => {
    expect(stepTurn(0, 1e6, 0, tangentX, tangentY, 100)).toBeCloseTo(FOLLOW_LIMIT)
    expect(stepTurn(0, -1e6, 0, tangentX, tangentY, 100)).toBeCloseTo(-FOLLOW_LIMIT)
  })

  it('accumulates across successive moves and can track back', () => {
    let angle = stepTurn(0, 60, 0, tangentX, tangentY, 100)
    expect(angle).toBeCloseTo(0.6)
    angle = stepTurn(angle, -20, 0, tangentX, tangentY, 100)
    expect(angle).toBeCloseTo(0.4)
  })

  it('stays put when the mapping is degenerate', () => {
    expect(stepTurn(1.2, 50, 0, tangentX, tangentY, 0)).toBeCloseTo(1.2)
  })
})

describe('decideTurn', () => {
  it('cancels swipes below the commit threshold', () => {
    expect(decideTurn('U', 0)).toEqual({ target: 0, move: null })
    expect(decideTurn('U', COMMIT_THRESHOLD - 0.01)).toEqual({ target: 0, move: null })
    expect(decideTurn('U', -(COMMIT_THRESHOLD - 0.01))).toEqual({ target: 0, move: null })
  })

  it('commits a quarter turn at the threshold, in the drag direction', () => {
    const cw = decideTurn('R', -COMMIT_THRESHOLD)
    expect(cw).toEqual({ target: -QUARTER_TURN, move: { face: 'R', modifier: '' } })
    const ccw = decideTurn('R', COMMIT_THRESHOLD)
    expect(ccw).toEqual({ target: QUARTER_TURN, move: { face: 'R', modifier: "'" } })
  })

  it('maps positive angles to counter-clockwise notation', () => {
    expect(decideTurn('F', 1.2).move).toEqual({ face: 'F', modifier: "'" })
    expect(decideTurn('F', -1.2).move).toEqual({ face: 'F', modifier: '' })
  })

  it('commits a half turn past the half-turn threshold', () => {
    expect(decideTurn('L', HALF_TURN_THRESHOLD + 0.01)).toEqual({ target: HALF_TURN, move: { face: 'L', modifier: '2' } })
    expect(decideTurn('L', -(HALF_TURN_THRESHOLD + 0.01))).toEqual({ target: -HALF_TURN, move: { face: 'L', modifier: '2' } })
    expect(decideTurn('L', FOLLOW_LIMIT)).toEqual({ target: HALF_TURN, move: { face: 'L', modifier: '2' } })
  })
})

describe('settleDuration', () => {
  it('uses the full duration for a quarter turn', () => {
    expect(settleDuration(220, 0, QUARTER_TURN)).toBe(220)
  })

  it('is proportional to the remaining angle', () => {
    expect(settleDuration(220, 0, QUARTER_TURN / 2)).toBe(110)
  })

  it('never becomes zero for a visible snap, but is 0 when nothing moves', () => {
    expect(settleDuration(220, 0, 0)).toBe(0)
    expect(settleDuration(220, 0, 0.01)).toBeGreaterThanOrEqual(80)
  })
})
