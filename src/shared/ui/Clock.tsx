import { formatClock } from '../lib/clock'

/** Below this, the running clock turns red. */
const LOW_TIME_MS = 10_000

type ClockProps = {
  /** Accessible name of the timer, e.g. 'White clock'. */
  label: string
  ms: number
  /** Highlights the clock that is counting down. */
  active: boolean
}

export function Clock({ label, ms, active }: ClockProps) {
  const tone = !active
    ? 'bg-surface text-muted ring-1 ring-line'
    : ms < LOW_TIME_MS
      ? 'bg-red-600 text-white shadow-md'
      : 'bg-ink text-white shadow-md'

  return (
    <div
      role="timer"
      aria-label={label}
      className={`self-end rounded-lg px-4 py-1.5 font-mono text-2xl font-semibold tabular-nums transition-colors ${tone}`}
    >
      {formatClock(ms)}
    </div>
  )
}
