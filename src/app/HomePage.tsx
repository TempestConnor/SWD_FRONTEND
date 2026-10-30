import type { ReactNode } from 'react'
import { appMessages } from './messages'

/** A few pieces on the hero's decorative board, by square index (0 = a8). */
const HERO_PIECES: Record<number, string> = { 4: '♚', 12: '♟', 19: '♞', 28: '♙', 36: '♘', 45: '♗', 60: '♔' }

type HomePageProps = {
  /** The ways to start a game, which the router supplies. */
  children?: ReactNode
}

export function HomePage({ children }: HomePageProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">{appMessages.siteName}</h1>
          <p className="max-w-md text-lg text-muted">{appMessages.home.tagline}</p>
        </div>
        <HeroBoard />
      </section>
      {children}
    </main>
  )
}

function HeroBoard() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto grid w-64 grid-cols-8 overflow-hidden rounded-xl shadow-xl ring-1 ring-ink/10 sm:w-72 md:rotate-2"
    >
      {Array.from({ length: 64 }, (_, index) => {
        const dark = (Math.floor(index / 8) + index) % 2 === 1
        return (
          <div
            key={index}
            className={`grid aspect-square place-items-center text-2xl leading-none text-ink ${dark ? 'bg-square-dark' : 'bg-square-light'}`}
          >
            {HERO_PIECES[index]}
          </div>
        )
      })}
    </div>
  )
}
