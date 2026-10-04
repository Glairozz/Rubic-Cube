interface TimerDisplayProps {
  displayRef: React.RefObject<HTMLSpanElement | null>
  running: boolean
  onToggle: () => void
}

export default function TimerDisplay({ displayRef, running, onToggle }: TimerDisplayProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={running ? 'Stop timer' : 'Start timer'}
      className="group flex items-baseline gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/60"
    >
      <span
        ref={displayRef}
        className={`font-mono text-3xl font-semibold tabular-nums tracking-tight transition-colors ${
          running ? 'text-emerald-500' : ''
        }`}
      >
        0:00.00
      </span>
      <span className="text-[10px] uppercase tracking-widest text-neutral-400 group-hover:text-neutral-500">
        {running ? 'stop' : 'start'}
      </span>
    </button>
  )
}
