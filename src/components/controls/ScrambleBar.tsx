import { Check, Copy, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'

interface ScrambleBarProps {
  scramble: string
  onRegenerate: () => void
  onClear: () => void
}

export default function ScrambleBar({ scramble, onRegenerate, onClear }: ScrambleBarProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!scramble) return
    try {
      await navigator.clipboard.writeText(scramble)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="glass flex items-center gap-2 rounded-2xl p-2 pl-4">
      <p className="flex-1 truncate font-mono text-sm text-neutral-700 dark:text-neutral-200" aria-label="Current scramble">
        {scramble || 'No scramble yet — press Scramble'}
      </p>
      <button onClick={copy} aria-label="Copy scramble" className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200/60 dark:hover:bg-neutral-800">
        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
      </button>
      <button onClick={onRegenerate} aria-label="Regenerate scramble" className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200/60 dark:hover:bg-neutral-800">
        <RefreshCw size={16} />
      </button>
      <button onClick={onClear} aria-label="Clear scramble" className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200/60 dark:hover:bg-neutral-800">
        <X size={16} />
      </button>
    </div>
  )
}
