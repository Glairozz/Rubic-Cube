import Cube from 'cubejs'

/**
 * Web worker that owns the (CPU-heavy) Kociemba table precomputation and runs
 * solves off the main thread, so warming up the solver never janks the cube.
 */

interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null
  postMessage: (message: unknown) => void
}

const ctx = self as unknown as WorkerScope

ctx.onmessage = (event: MessageEvent) => {
  const data = event.data as
    | { type: 'init' }
    | { type: 'solve'; id: number; facelet: string }

  if (!data || typeof data !== 'object') return

  if (data.type === 'init') {
    try {
      Cube.initSolver()
      ctx.postMessage({ type: 'ready' })
    } catch (error) {
      ctx.postMessage({ type: 'error', message: String(error) })
    }
    return
  }

  if (data.type === 'solve') {
    try {
      const cube = Cube.fromString(data.facelet)
      const algorithm = cube.solve()
      ctx.postMessage({ type: 'solved', id: data.id, algorithm })
    } catch (error) {
      ctx.postMessage({ type: 'error', id: data.id, message: String(error) })
    }
  }
}
