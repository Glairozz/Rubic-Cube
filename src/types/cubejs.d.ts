// Type declarations for the `cubejs` package (ships as CommonJS without types).
// It models the 3x3x3 cube and implements Kociemba's two-phase solver.
declare module 'cubejs' {
  interface CubeJSON {
    cp: number[]
    co: number[]
    ep: number[]
    eo: number[]
  }

  class Cube {
    constructor(state?: Cube | CubeJSON)
    static fromString(facelet: string): Cube
    static random(): Cube
    static inverse(algorithm: string | number[] | number): string
    static initSolver(): void
    static scramble(): string
    move(algorithm: string | number[] | number): Cube
    init(state: Cube | CubeJSON): Cube
    identity(): Cube
    isSolved(): boolean
    asString(): string
    clone(): Cube
    randomize(): Cube
    solve(maxDepth?: number): string
    toJSON(): CubeJSON
  }

  export = Cube
}
