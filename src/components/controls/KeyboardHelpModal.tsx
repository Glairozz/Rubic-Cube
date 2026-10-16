import Modal from '../ui/Modal'

const SHORTCUTS: Array<[string, string]> = [
  ['Drag sticker (mouse/touch)', 'Layer follows your finger'],
  ['Release past 45°', 'Snap to a 90° turn (past 135° = 180°)'],
  ['Short swipe / release early', 'Layer slides back, no move'],
  ['Drag empty space', 'Rotate the view'],
  ['Mouse wheel / pinch', 'Zoom in and out'],
  ['Two-finger drag', 'Rotate the view'],
  ['R / L / U / D / F / B', 'Turn face clockwise'],
  ["Shift + letter", 'Turn face counter-clockwise'],
  ['Space', 'Start / stop timer'],
  ['Z', 'Undo last move'],
  ['Y', 'Redo move'],
  ['Scramble/Undo/Solve/Reset', 'Action buttons'],
]

export default function KeyboardHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <ul className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
        {SHORTCUTS.map(([keys, action]) => (
          <li key={keys} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">{action}</span>
            <kbd className="rounded-md border border-neutral-300 bg-neutral-100 px-2 py-0.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800">
              {keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
