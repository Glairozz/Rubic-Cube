import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CubePage from './pages/CubePage'
import { useSettings } from './hooks/useSettings'

export default function App() {
  const { settings, update } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    const applyTheme = () => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', dark)
    }
    applyTheme()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', applyTheme)
    root.classList.toggle('high-contrast', settings.highContrast)
    return () => mq.removeEventListener('change', applyTheme)
  }, [settings.theme, settings.highContrast])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/play" element={<CubePage settings={settings} updateSettings={update} />} />
      </Routes>
    </BrowserRouter>
  )
}
