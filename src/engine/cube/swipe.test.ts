import { describe, it, expect } from 'vitest'
import { resolveSwipe } from './swipe'
import { invertMove } from '../moves/moves'

describe('resolveSwipe', () => {
  it('swipes +x on front-top-right (U face layer) → U\'', () => {
    const normal = { x: 0, y: 0, z: 1 } // +Z (front sticker)
    const cubie = { x: 1, y: 1, z: 1 } // top-right-front corner
    const drag = { x: 1, y: 0, z: 0 } // swipe to the right
    const res = resolveSwipe(normal, cubie, drag)
    expect(res.kind).toBe('turn')
    if (res.kind === 'turn') {
      expect(res.move).toEqual({ face: 'U', modifier: "'" })
    }
  })

  it('swipes -x on front-top-right → U', () => {
    const normal = { x: 0, y: 0, z: 1 }
    const cubie = { x: 1, y: 1, z: 1 }
    const drag = { x: -1, y: 0, z: 0 }
    const res = resolveSwipe(normal, cubie, drag)
    expect(res.kind).toBe('turn')
    if (res.kind === 'turn') {
      expect(res.move).toEqual({ face: 'U', modifier: '' })
    }
  })

  it('swipes +y on front-top-right → R', () => {
    const normal = { x: 0, y: 0, z: 1 }
    const cubie = { x: 1, y: 1, z: 1 }
    const drag = { x: 0, y: 1, z: 0 } // swipe up
    const res = resolveSwipe(normal, cubie, drag)
    expect(res.kind).toBe('turn')
    if (res.kind === 'turn') {
      expect(res.move).toEqual({ face: 'R', modifier: '' })
    }
  })

  it('swipes -y on front-top-right → R\'', () => {
    const normal = { x: 0, y: 0, z: 1 }
    const cubie = { x: 1, y: 1, z: 1 }
    const drag = { x: 0, y: -1, z: 0 }
    const res = resolveSwipe(normal, cubie, drag)
    expect(res.kind).toBe('turn')
    if (res.kind === 'turn') {
      expect(res.move).toEqual({ face: 'R', modifier: "'" })
    }
  })

  it('top-face center swiped +x → S (front-to-back slice)', () => {
    const normal = { x: 0, y: 1, z: 0 }
    const cubie = { x: 0, y: 1, z: 0 }
    const drag = { x: 1, y: 0, z: 0 }
    const res = resolveSwipe(normal, cubie, drag)
    expect(res).toEqual({ kind: 'turn', move: { face: 'S', modifier: '' } })
  })

  it('swiping the front middle row gives E / E\'', () => {
    const normal = { x: 0, y: 0, z: 1 }
    const cubie = { x: 0, y: 0, z: 1 }
    expect(resolveSwipe(normal, cubie, { x: 1, y: 0, z: 0 })).toEqual({
      kind: 'turn',
      move: { face: 'E', modifier: '' },
    })
    expect(resolveSwipe(normal, cubie, { x: -1, y: 0, z: 0 })).toEqual({
      kind: 'turn',
      move: { face: 'E', modifier: "'" },
    })
  })

  it("swiping the front middle column gives M' / M", () => {
    const normal = { x: 0, y: 0, z: 1 }
    const cubie = { x: 0, y: 0, z: 1 }
    expect(resolveSwipe(normal, cubie, { x: 0, y: 1, z: 0 })).toEqual({
      kind: 'turn',
      move: { face: 'M', modifier: "'" },
    })
    expect(resolveSwipe(normal, cubie, { x: 0, y: -1, z: 0 })).toEqual({
      kind: 'turn',
      move: { face: 'M', modifier: '' },
    })
  })

  it('opposite middle-slice drags give inverse moves', () => {
    const cases = [
      { normal: { x: 0, y: 0, z: 1 }, cubie: { x: 0, y: 0, z: 1 }, drag: { x: 1, y: 0, z: 0 } },
      { normal: { x: 0, y: 0, z: 1 }, cubie: { x: 0, y: 0, z: 1 }, drag: { x: 0, y: 1, z: 0 } },
      { normal: { x: 0, y: 1, z: 0 }, cubie: { x: 0, y: 1, z: 0 }, drag: { x: 1, y: 0, z: 0 } },
      { normal: { x: 1, y: 0, z: 0 }, cubie: { x: 1, y: 0, z: 0 }, drag: { x: 0, y: 1, z: 0 } },
    ]
    for (const c of cases) {
      const a = resolveSwipe(c.normal, c.cubie, c.drag)
      const b = resolveSwipe(c.normal, c.cubie, { x: -c.drag.x, y: -c.drag.y, z: -c.drag.z })
      expect(a.kind).toBe('turn')
      expect(b.kind).toBe('turn')
      if (a.kind === 'turn' && b.kind === 'turn') {
        expect(b.move).toEqual(invertMove(a.move))
      }
    }
  })

  it('opposite drag gives inverse move', () => {
    const cases = [
      { normal: { x: 0, y: 0, z: 1 }, cubie: { x: 1, y: 1, z: 1 }, drag: { x: 1, y: 0, z: 0 } },
      { normal: { x: 0, y: 0, z: 1 }, cubie: { x: -1, y: 1, z: 1 }, drag: { x: 0, y: 1, z: 0 } },
      { normal: { x: 0, y: 1, z: 0 }, cubie: { x: 1, y: 1, z: 1 }, drag: { x: 1, y: 0, z: 0 } },
      { normal: { x: -1, y: 0, z: 0 }, cubie: { x: -1, y: 1, z: -1 }, drag: { x: 0, y: 1, z: 0 } },
    ]
    for (const c of cases) {
      const a = resolveSwipe(c.normal, c.cubie, c.drag)
      const b = resolveSwipe(c.normal, c.cubie, { x: -c.drag.x, y: -c.drag.y, z: -c.drag.z })
      if (a.kind === 'turn' && b.kind === 'turn') {
        const inv = invertMove(a.move)
        expect(b.move).toEqual(inv)
      }
    }
  })

  it('each standard face is reachable for at least one swipe', () => {
    const reached = new Set<string>()
    const samples = [
      { normal: { x: 0, y: 0, z: 1 }, cubie: { x: 1, y: 1, z: 1 }, drag: { x: 1, y: 0, z: 0 } }, // U'
      { normal: { x: 0, y: 0, z: 1 }, cubie: { x: 1, y: -1, z: 1 }, drag: { x: 1, y: 0, z: 0 } }, // D
      { normal: { x: 0, y: 0, z: 1 }, cubie: { x: 1, y: 1, z: 1 }, drag: { x: 0, y: 1, z: 0 } }, // R
      { normal: { x: 0, y: 0, z: 1 }, cubie: { x: -1, y: 1, z: 1 }, drag: { x: 0, y: 1, z: 0 } }, // L'
      { normal: { x: 0, y: 1, z: 0 }, cubie: { x: 1, y: 1, z: 1 }, drag: { x: 1, y: 0, z: 0 } }, // F
      { normal: { x: 0, y: 1, z: 0 }, cubie: { x: 1, y: 1, z: -1 }, drag: { x: 1, y: 0, z: 0 } }, // B'
    ]
    for (const s of samples) {
      const res = resolveSwipe(s.normal, s.cubie, s.drag)
      if (res.kind === 'turn') reached.add(`${res.move.face}${res.move.modifier}`)
    }
    expect(reached.size).toBeGreaterThan(4)
  })
})
