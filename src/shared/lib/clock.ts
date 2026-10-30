import type { components } from '../../api/schema'
import type { Side } from './chess'

export type ClockSettings = components['schemas']['ClockSettingsDTO']
export type RemainingMs = { white: number; black: number }

/** Formats remaining time as minutes and seconds, e.g. 1_800_000 → '30:00'. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/** One side's starting time; null when the clock is disabled. */
export function initialMs(clock: ClockSettings): number | null {
  return clock.enabled ? (clock.initialMinutes ?? 0) * 60_000 : null
}

export function incrementMs(clock: ClockSettings): number {
  return (clock.incrementSeconds ?? 0) * 1000
}

/** Time left after thinking for elapsedMs, never below zero. */
export function msAfterElapsed(ms: number, elapsedMs: number): number {
  return Math.max(0, ms - Math.max(0, elapsedMs))
}

export function initialRemaining(clock: ClockSettings): RemainingMs | null {
  const ms = initialMs(clock)
  return ms === null ? null : { white: ms, black: ms }
}

/** The side to move's time after it has thought for elapsedMs, never below zero. */
export function remainingAfterElapsed(remaining: RemainingMs, side: Side, elapsedMs: number): RemainingMs {
  const key = sideKey(side)
  return { ...remaining, [key]: msAfterElapsed(remaining[key], elapsedMs) }
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
  return { ...charged, [key]: charged[key] + incrementMs(clock) }
}

export function sideKey(side: Side): keyof RemainingMs {
  return side === 'WHITE' ? 'white' : 'black'
}

export type ClockForm =
  | { clock: ClockSettings; invalid?: undefined }
  | { clock?: undefined; invalid: { initialMinutes: boolean; incrementSeconds: boolean } }

/** Applies BR-MOVE-011/012: an enabled clock needs 5–120 minutes and 0–60 seconds; a disabled one has no timing. */
export function parseClockForm(enabled: boolean, initialMinutes: string, incrementSeconds: string): ClockForm {
  if (!enabled) {
    return { clock: { enabled: false } }
  }
  const minutes = Number(initialMinutes)
  const increment = Number(incrementSeconds)
  const invalid = {
    initialMinutes: initialMinutes.trim() === '' || !isIntegerBetween(minutes, 5, 120),
    incrementSeconds: incrementSeconds.trim() === '' || !isIntegerBetween(increment, 0, 60),
  }
  if (invalid.initialMinutes || invalid.incrementSeconds) {
    return { invalid }
  }
  return { clock: { enabled: true, initialMinutes: minutes, incrementSeconds: increment } }
}

function isIntegerBetween(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max
}
