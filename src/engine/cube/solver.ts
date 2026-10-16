import SolverWorker from './solver.worker.ts?worker'
import { initSolverSync, solveFaceletSync } from './cubeModel'

export type SolverStatus = 'idle' | 'warming' | 'ready' | 'failed'

type StatusListener = (status: SolverStatus) => void

let status: SolverStatus = 'idle'
let readyPromise: Promise<boolean> | null = null
let resolveReady: ((ok: boolean) => void) | null = null

const listeners = new Set<StatusListener>()

let worker: Worker | null = null
let requestId = 0
const pending = new Map<number, { resolve: (algorithm: string) => void; reject: (error: unknown) => void }>()

function setStatus(next: SolverStatus): void {
  if (status === next) return
  status = next
  if (next === 'ready' || next === 'failed') resolveReady?.(next === 'ready')
  listeners.forEach((listener) => listener(next))
}

export function getSolverStatus(): SolverStatus {
  return status
}

export function subscribeSolverStatus(listener: StatusListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  try {
    const instance = new SolverWorker()
    instance.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type: 'ready' }
        | { type: 'solved'; id: number; algorithm: string }
        | { type: 'error'; id?: number; message: string }

      if (!data || typeof data !== 'object') return

      if (data.type === 'ready') {
        setStatus('ready')
      } else if (data.type === 'solved') {
        const entry = pending.get(data.id)
        if (entry) {
          pending.delete(data.id)
          entry.resolve(data.algorithm)
        }
      } else if (data.type === 'error') {
        const entry = data.id != null ? pending.get(data.id) : undefined
        if (entry && data.id != null) {
          pending.delete(data.id)
          entry.reject(new Error(data.message))
        } else {
          setStatus('failed')
        }
      }
    }
    instance.onerror = () => setStatus('failed')
    return instance
  } catch {
    return null
  }
}

/**
 * Prepare the solver exactly once. Uses a web worker when available and falls
 * back to a (blocking) synchronous warm-up otherwise, e.g. in tests or very old
 * browsers.
 */
export function warmUpSolver(): Promise<boolean> {
  if (status === 'ready') return Promise.resolve(true)
  if (status === 'failed') return Promise.resolve(false)
  if (readyPromise) return readyPromise

  readyPromise = new Promise<boolean>((resolve) => {
    resolveReady = resolve
  })
  setStatus('warming')

  const instance = createWorker()
  if (instance) {
    worker = instance
    instance.postMessage({ type: 'init' })
  } else {
    setTimeout(() => {
      try {
        initSolverSync()
        setStatus('ready')
      } catch {
        setStatus('failed')
      }
    }, 0)
  }

  return readyPromise
}

/** Resolve once the solver is ready (or failed). */
export function ensureSolver(): Promise<boolean> {
  if (status === 'ready') return Promise.resolve(true)
  if (status === 'failed') return Promise.resolve(false)
  return warmUpSolver()
}

/** Solve a facelet string, resolving with `null` when no solver is available. */
export async function solveFacelet(facelet: string): Promise<string | null> {
  const ready = await ensureSolver()
  if (!ready) return null

  if (worker) {
    const id = ++requestId
    try {
      return await new Promise<string>((resolve, reject) => {
        pending.set(id, { resolve, reject })
        worker!.postMessage({ type: 'solve', id, facelet })
      })
    } catch {
      return null
    }
  }

  try {
    return solveFaceletSync(facelet)
  } catch {
    return null
  }
}
