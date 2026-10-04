import { useCallback, useEffect, useRef, useState } from 'react'

/** rAF-driven stopwatch that writes to a DOM node, avoiding re-renders. */
export function useTimer() {
  const displayRef = useRef<HTMLSpanElement | null>(null)
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const accumulatedRef = useRef(0)
  const [running, setRunning] = useState(false)

  const render = useCallback((ms: number) => {
    const el = displayRef.current
    if (!el) return
    const totalCentis = Math.floor(ms / 10)
    const minutes = Math.floor(totalCentis / 6000)
    const seconds = Math.floor(totalCentis / 100) % 60
    const centis = totalCentis % 100
    el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`
  }, [])

  const tick = useCallback(() => {
    render(accumulatedRef.current + (performance.now() - startRef.current))
    rafRef.current = requestAnimationFrame(tick)
  }, [render])

  const start = useCallback(() => {
    setRunning((r) => {
      if (r) return r
      startRef.current = performance.now()
      rafRef.current = requestAnimationFrame(tick)
      return true
    })
  }, [tick])

  const stop = useCallback(() => {
    setRunning((r) => {
      if (!r) return r
      cancelAnimationFrame(rafRef.current)
      accumulatedRef.current += performance.now() - startRef.current
      return false
    })
  }, [])

  const elapsedMs = useCallback(() => {
    return accumulatedRef.current + (startRef.current && running ? performance.now() - startRef.current : 0)
  }, [running])

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    accumulatedRef.current = 0
    setRunning(false)
    render(0)
  }, [render])

  const toggle = useCallback(() => {
    setRunning((r) => {
      if (r) {
        cancelAnimationFrame(rafRef.current)
        accumulatedRef.current += performance.now() - startRef.current
        return false
      }
      startRef.current = performance.now()
      rafRef.current = requestAnimationFrame(tick)
      return true
    })
  }, [tick])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return { displayRef, running, start, stop, reset, toggle, elapsedMs }
}

export function formatElapsed(ms: number): string {
  const totalCentis = Math.floor(ms / 10)
  const minutes = Math.floor(totalCentis / 6000)
  const seconds = Math.floor(totalCentis / 100) % 60
  const centis = totalCentis % 100
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`
}
