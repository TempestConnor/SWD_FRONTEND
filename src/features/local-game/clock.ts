import type { ClockSettings } from './api'
import type { Side } from './storage'

export type RemainingMs = { white: number; black: number }

/** Formats remaining time as minutes and seconds, e.g. 1_800_000 → '30:00'. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function initialRemaining(clock: ClockSettings): RemainingMs | null {
  if (!clock.enabled) {
    return null
  }
  const ms = (clock.initialMinutes ?? 0) * 60_000
  return { white: ms, black: ms }
}

/** The side to move's time after it has thought for elapsedMs, never below zero. */
export function remainingAfterElapsed(remaining: RemainingMs, side: Side, elapsedMs: number): RemainingMs {
  const key = sideKey(side)
  return { ...remaining, [key]: Math.max(0, remaining[key] - Math.max(0, elapsedMs)) }
}

/** Charges the mover for the time spent and then adds the increment. */
export function remainingAfterMove(
  remaining: RemainingMs,
  clock: ClockSettings,
  mover: Side,
  elapsedMs: number,
): RemainingMs {
  const key = sideKey(mover)
  const charged = remainingAfterElapsed(remaining, mover, elapsedMs)
  return { ...charged, [key]: charged[key] + (clock.incrementSeconds ?? 0) * 1000 }
}

export function sideKey(side: Side): keyof RemainingMs {
  return side === 'WHITE' ? 'white' : 'black'
}
