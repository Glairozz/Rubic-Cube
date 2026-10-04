import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Keyboard, Redo2, RotateCcw, Shuffle, Undo2, Settings as SettingsIcon, Home } from 'lucide-react'
import CubeScene, { type CubeSceneHandle } from '../components/cube/CubeScene'
import TimerDisplay from '../components/timer/TimerDisplay'
import MoveHistory from '../components/stats/MoveHistory'
import ScrambleBar from '../components/controls/ScrambleBar'
import SettingsModal from '../components/controls/SettingsModal'
import KeyboardHelpModal from '../components/controls/KeyboardHelpModal'
import { useTimer } from '../hooks/useTimer'
import { generateScramble, scrambleToString } from '../engine/scramble/scramble'
import { formatMove, invertMove, parseMove, type Move } from '../engine/moves/moves'
import type { Settings } from '../hooks/useSettings'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface CubePageProps {
  settings: Settings
  updateSettings: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export default function CubePage({ settings, updateSettings }: CubePageProps) {
  const cubeRef = useRef<CubeSceneHandle | null>(null)
  const [moves, setMoves] = useState<string[]>([])
  const [cursor, setCursor] = useState(0)
  const [scramble, setScramble] = useState('')
  const [status, setStatus] = useState('Ready')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [best, setBest] = useLocalStorage<number | null>('rubic-best', null)
  const timer = useTimer()

  const applyMove = useCallback(
    (move: Move, record = true) => {
      cubeRef.current?.applyMove(move, settings.animationSpeed)
      if (record) {
        setMoves((prev) => [...prev.slice(0, cursor), formatMove(move)])
        setCursor((c) => c + 1)
      }
    },
    [cursor, settings.animationSpeed],
  )

  const scrambleNow = useCallback(() => {
    const seq = generateScramble(20)
    setScramble(scrambleToString(seq))
    setMoves((prev) => [...prev.slice(0, cursor), ...seq.map(formatMove)])
    setCursor((c) => c + seq.length)
    seq.forEach((m) => cubeRef.current?.applyMove(m, Math.max(60, settings.animationSpeed * 0.5)))
    setStatus('Scrambled')
    timer.reset()
  }, [cursor, settings.animationSpeed, timer])

  const undo = useCallback(() => {
    if (cursor === 0) return
    const notation = moves[cursor - 1]
    cubeRef.current?.applyMove(invertMove(parseMove(notation)), settings.animationSpeed)
    setCursor((c) => c - 1)
  }, [cursor, moves, settings.animationSpeed])

  const redo = useCallback(() => {
    if (cursor >= moves.length) return
    cubeRef.current?.applyMove(parseMove(moves[cursor]), settings.animationSpeed)
    setCursor((c) => c + 1)
  }, [cursor, moves, settings.animationSpeed])

  const reset = useCallback(() => {
    cubeRef.current?.reset()
    setMoves([])
    setCursor(0)
    setScramble('')
    setStatus('Ready')
    timer.reset()
  }, [timer])

  const handleSolved = useCallback(
    (solved: boolean) => {
      if (solved) {
        setStatus('Solved')
        const t = timer.elapsedMs()
        timer.stop()
        if (cursor > 0 && t > 0) {
          setBest((b) => (b === null || t < b ? t : b))
        }
      }
    },
    [cursor, timer, setBest],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (settingsOpen || helpOpen) return
      const key = e.key.toLowerCase()
      const inverse = e.shiftKey
      if (['r', 'l', 'u', 'd', 'f', 'b'].includes(key) && !e.ctrlKey && !e.metaKey) {
        const face = key.toUpperCase() as Move['face']
        applyMove({ face, modifier: inverse ? "'" : '' })
        setStatus('Turning')
        return
      }
      switch (key) {
        case ' ':
          e.preventDefault()
          timer.toggle()
          break
        case 'z':
          undo()
          break
        case 'y':
          redo()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyMove, undo, redo, timer, settingsOpen, helpOpen])

  const faceButtons: Array<{ label: string; move: Move }> = [
    { label: 'U', move: { face: 'U', modifier: '' } },
    { label: "U'", move: { face: 'U', modifier: "'" } },
    { label: 'D', move: { face: 'D', modifier: '' } },
    { label: "D'", move: { face: 'D', modifier: "'" } },
    { label: 'F', move: { face: 'F', modifier: '' } },
    { label: "F'", move: { face: 'F', modifier: "'" } },
    { label: 'B', move: { face: 'B', modifier: '' } },
    { label: "B'", move: { face: 'B', modifier: "'" } },
    { label: 'R', move: { face: 'R', modifier: '' } },
    { label: "R'", move: { face: 'R', modifier: "'" } },
    { label: 'L', move: { face: 'L', modifier: '' } },
    { label: "L'", move: { face: 'L', modifier: "'" } },
  ]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/70 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
          <Link to="/" className="text-sm font-bold tracking-[0.2em]">RUBIC</Link>
          <TimerDisplay displayRef={timer.displayRef} running={timer.running} onToggle={timer.toggle} />
          <div className="flex items-center gap-1">
            <Link to="/" aria-label="Home" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200/60 dark:hover:bg-neutral-800"><Home size={18} /></Link>
            <button aria-label="Keyboard shortcuts" onClick={() => setHelpOpen(true)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200/60 dark:hover:bg-neutral-800"><Keyboard size={18} /></button>
            <button aria-label="Settings" onClick={() => setSettingsOpen(true)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-200/60 dark:hover:bg-neutral-800"><SettingsIcon size={18} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
          <span>Moves: <strong className="text-neutral-800 dark:text-neutral-100">{cursor}</strong></span>
          <span>Status: <strong className="text-neutral-800 dark:text-neutral-100">{status}</strong></span>
          <span>Best: <strong className="font-mono text-neutral-800 dark:text-neutral-100">{best === null ? '—' : (best / 1000).toFixed(2) + 's'}</strong></span>
        </div>

        <CubeScene
          ref={cubeRef}
          className="h-[46vh] min-h-[300px] w-full sm:h-[52vh]"
          reducedMotion={settings.reducedMotion}
          scale={settings.cubeScale}
          onSolvedChange={handleSolved}
        />

        {settings.showNotation && (
          <ScrambleBar
            scramble={scramble}
            onRegenerate={scrambleNow}
            onClear={() => setScramble('')}
          />
        )}

        <MoveHistory moves={moves} cursor={cursor} />

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {faceButtons.map(({ label, move }) => (
            <button
              key={label}
              onClick={() => applyMove(move)}
              className="glass rounded-xl py-3 font-mono text-sm font-semibold transition-transform active:scale-95"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button onClick={scrambleNow} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]">
            <Shuffle size={16} /> Scramble
          </button>
          <button onClick={reset} className="flex items-center justify-center gap-2 rounded-xl bg-neutral-200/70 py-3 text-sm font-semibold transition-transform active:scale-[0.98] dark:bg-neutral-800">
            <RotateCcw size={16} /> Reset
          </button>
          <button onClick={undo} disabled={cursor === 0} className="flex items-center justify-center gap-2 rounded-xl bg-neutral-200/70 py-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-40 dark:bg-neutral-800">
            <Undo2 size={16} /> Undo
          </button>
          <button onClick={redo} disabled={cursor >= moves.length} className="flex items-center justify-center gap-2 rounded-xl bg-neutral-200/70 py-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-40 dark:bg-neutral-800">
            <Redo2 size={16} /> Redo
          </button>
        </div>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} update={updateSettings} />
      <KeyboardHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
