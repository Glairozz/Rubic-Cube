import Modal from '../ui/Modal'
import type { Settings } from '../../hooks/useSettings'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: Settings
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-neutral-600 dark:text-neutral-300">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

export default function SettingsModal({ open, onClose, settings, update }: SettingsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
        <Row label="Theme">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => update('theme', t)}
              aria-pressed={settings.theme === t}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                settings.theme === t
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-200/70 hover:bg-neutral-300/70 dark:bg-neutral-800 dark:hover:bg-neutral-700'
              }`}
            >
              {t}
            </button>
          ))}
        </Row>
        <Row label="Animation speed">
          <input
            type="range"
            min={80}
            max={600}
            step={20}
            value={settings.animationSpeed}
            aria-label="Animation speed"
            onChange={(e) => update('animationSpeed', Number(e.target.value))}
            className="accent-blue-500"
          />
        </Row>
        <Row label="Cube size">
          <input
            type="range"
            min={0.7}
            max={1.3}
            step={0.05}
            value={settings.cubeScale}
            aria-label="Cube size"
            onChange={(e) => update('cubeScale', Number(e.target.value))}
            className="accent-blue-500"
          />
        </Row>
        <Row label="Show move notation">
          <Toggle label="Show move notation" checked={settings.showNotation} onChange={(v) => update('showNotation', v)} />
        </Row>
        <Row label="Reduced motion">
          <Toggle label="Reduced motion" checked={settings.reducedMotion} onChange={(v) => update('reducedMotion', v)} />
        </Row>
        <Row label="High contrast">
          <Toggle label="High contrast" checked={settings.highContrast} onChange={(v) => update('highContrast', v)} />
        </Row>
      </div>
    </Modal>
  )
}
