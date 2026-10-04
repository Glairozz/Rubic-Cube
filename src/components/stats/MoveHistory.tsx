interface MoveHistoryProps {
  moves: string[]
  cursor: number
}

export default function MoveHistory({ moves, cursor }: MoveHistoryProps) {
  const played = moves.slice(0, cursor)
  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
        Move history · {played.length}
      </h3>
      {played.length === 0 ? (
        <p className="text-sm text-neutral-500">No moves yet. Scramble or start turning.</p>
      ) : (
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {played.map((notation, i) => (
            <span
              key={i}
              className={`rounded-md px-1.5 py-0.5 font-mono text-xs ${
                i === cursor - 1
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-200/70 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              {notation}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
