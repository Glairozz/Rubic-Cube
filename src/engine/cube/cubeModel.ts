import Cube from 'cubejs'
import { formatMove, parseMove, type Move } from '../moves/moves'

/**
 * Thin, typed wrapper around the `cubejs` model. This is the single logical
 * source of truth for the cube: the 3D scene, the move history and the solver
 * all agree on it, which guarantees that manual turns and generated solutions
 * operate on the exact same state.
 */
export type CubeState = ReturnType<typeof createCube>

export function createCube(): Cube {
  return new Cube()
}

export function applyMoveToState(state: CubeState, move: Move): CubeState {
  return state.move(formatMove(move))
}

export function applyAlgorithmToState(state: CubeState, algorithm: string): CubeState {
  return state.move(algorithm)
}

export function stateToFacelet(state: CubeState): string {
  return state.asString()
}

export function cubeFromFacelet(facelet: string): CubeState {
  return Cube.fromString(facelet)
}

export function isCubeSolved(state: CubeState): boolean {
  return state.isSolved()
}

/** Split a Kociemba algorithm such as `"D2 B' R' B L'"` into typed moves. */
export function algorithmToMoves(algorithm: string): Move[] {
  return algorithm
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseMove)
}

let solverInitialized = false

/** Synchronous solver warm-up. Blocks for a few seconds; prefer the worker. */
export function initSolverSync(): void {
  if (solverInitialized) return
  Cube.initSolver()
  solverInitialized = true
}

/** Solve a facelet state synchronously. Only used by the worker fallback and tests. */
export function solveFaceletSync(facelet: string): string {
  initSolverSync()
  return Cube.fromString(facelet).solve()
}
