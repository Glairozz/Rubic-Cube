import { useEffect, useState } from 'react'
import { getSolverStatus, subscribeSolverStatus, warmUpSolver, type SolverStatus } from '../engine/cube/solver'

/** Subscribes to the background solver's warm-up state and kicks it off once. */
export function useSolver(): SolverStatus {
  const [status, setStatus] = useState<SolverStatus>(getSolverStatus)

  useEffect(() => {
    const unsubscribe = subscribeSolverStatus(setStatus)
    void warmUpSolver()
    return unsubscribe
  }, [])

  return status
}
