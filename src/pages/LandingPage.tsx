import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MousePointerClick, Timer, Shuffle, ListOrdered, Smartphone, Palette, ArrowRight,
} from 'lucide-react'
import CubeScene from '../components/cube/CubeScene'

const FEATURES = [
  { icon: MousePointerClick, title: 'Smooth Controls', text: 'Keyboard, mouse and touch controls designed for fast and precise cube manipulation.' },
  { icon: Timer, title: 'Smart Timer', text: 'Track solve times automatically and improve your speed.' },
  { icon: Shuffle, title: 'Random Scrambles', text: 'Generate random scrambles whenever you want a new challenge.' },
  { icon: ListOrdered, title: 'Move Tracking', text: 'Track your moves and improve your solving efficiency.' },
  { icon: Smartphone, title: 'Responsive', text: 'Designed to work beautifully on desktop, tablet and mobile.' },
  { icon: Palette, title: 'Customization', text: 'Themes and preferences that make the experience your own.' },
]

const STEPS = [
  { n: '01', title: 'Scramble', text: 'Generate a random scramble and mix up the cube.' },
  { n: '02', title: 'Solve', text: 'Turn the faces with keyboard, mouse or touch and solve it.' },
  { n: '03', title: 'Improve', text: 'Track your time and moves, then beat your best.' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-dvh">
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all ${
          scrolled ? 'border-b border-neutral-200/60 bg-white/70 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/70' : ''
        }`}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="#top" className="text-sm font-bold tracking-[0.2em]">RUBIC</a>
          <div className="hidden items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400 sm:flex">
            <a href="#top" className="hover:text-neutral-900 dark:hover:text-white">Home</a>
            <a href="#features" className="hover:text-neutral-900 dark:hover:text-white">Features</a>
            <a href="#how" className="hover:text-neutral-900 dark:hover:text-white">How It Works</a>
            <a href="#play-cta" className="hover:text-neutral-900 dark:hover:text-white">Play</a>
          </div>
          <Link to="/play" className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95">
            Play Now
          </Link>
        </nav>
      </header>

      <main id="top">
        <section className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 pb-16 pt-28 lg:flex-row lg:pt-36">
          <div className="flex-1 text-center lg:text-left">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold tracking-tight sm:text-6xl"
            >
              Master the Cube.<br />One Move at a Time.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-5 max-w-xl text-base text-neutral-500 dark:text-neutral-400 sm:text-lg"
            >
              A fast, smooth and beautifully designed Rubik's Cube experience built for practice, solving and speed.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
            >
              <Link to="/play" className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-6 py-3 font-semibold text-white transition-transform active:scale-95">
                Start Solving <ArrowRight size={18} />
              </Link>
              <a href="#features" className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-6 py-3 font-semibold transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900">
                Explore Features
              </a>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex-1">
            <CubeScene className="h-[320px] w-full sm:h-[420px]" idle />
          </motion.div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Built for solvers</h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">Everything you need to practice and improve.</p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="glass rounded-2xl p-6 transition-transform hover:-translate-y-1">
                <Icon className="text-blue-500" size={22} />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
                <span className="font-mono text-sm text-blue-500">{s.n}</span>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="play-cta" className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Ready to solve?</h2>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">Start your next solve.</p>
          <Link to="/play" className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue-500 px-8 py-4 font-semibold text-white transition-transform active:scale-95">
            Play Rubic Cube <ArrowRight size={18} />
          </Link>
        </section>
      </main>

      <footer className="border-t border-neutral-200/60 dark:border-neutral-800/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-500 dark:text-neutral-400 sm:flex-row">
          <span className="font-semibold tracking-[0.2em]">RUBIC CUBE</span>
          <div className="flex gap-6">
            <Link to="/play">Play</Link>
            <a href="#features">Features</a>
            <a href="https://github.com/Glairozz/Rubic-Cube" target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <span>© {new Date().getFullYear()} Rubic Cube</span>
        </div>
      </footer>
    </div>
  )
}
