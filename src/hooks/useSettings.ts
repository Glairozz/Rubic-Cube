import { useLocalStorage } from './useLocalStorage'

export type ThemeOption = 'dark' | 'light' | 'system'

export interface Settings {
  theme: ThemeOption
  animationSpeed: number // ms per quarter turn
  cubeScale: number
  showNotation: boolean
  reducedMotion: boolean
  highContrast: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  animationSpeed: 220,
  cubeScale: 1,
  showNotation: true,
  reducedMotion: false,
  highContrast: false,
}

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<Settings>('rubic-settings', DEFAULT_SETTINGS)

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  return { settings, update }
}
