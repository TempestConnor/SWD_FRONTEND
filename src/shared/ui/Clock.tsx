import { formatClock } from '../lib/clock'

type ClockProps = {
  /** Accessible name of the timer, e.g. 'White clock'. */
  label: string
  ms: number
  /** Highlights the clock that is counting down. */
  active: boolean
}

export function Clock({ label, ms, active }: ClockProps) {
  return (
    <div
      role="timer"
      aria-label={label}
      className={`self-end rounded px-3 py-1 font-mono text-xl tabular-nums ${active ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
    >
      {formatClock(ms)}
    </div>
  )
}
