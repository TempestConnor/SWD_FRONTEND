import type { Side } from '../../shared/lib/chess'
import type { ClockSettings } from './api'

export const LOCAL_GAME_STORAGE_KEY = 'chess.local-game.v1'

/** The minimum needed to rebuild a local game; the position itself is replayed by the backend. */
export type StoredLocalGame = {
  clock: ClockSettings
  /** UCI moves in play order. */
  moves: string[]
  /** Remaining time per side when last saved; null when the clock is disabled. */
  remainingMs: { white: number; black: number } | null
  /** The side whose clock ran out, which ends the game; the backend does not know about clocks. */
  timedOut: Side | null
  /** Epoch milliseconds of the last save. */
  savedAt: number
}

const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/

export function loadLocalGame(): StoredLocalGame | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(LOCAL_GAME_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) {
    return null
  }

  try {
    const value: unknown = JSON.parse(raw)
    if (isStoredLocalGame(value)) {
      return value
    }
  } catch {
    // Falls through to discarding the corrupt value.
  }
  clearLocalGame()
  return null
}

export function saveLocalGame(game: StoredLocalGame): void {
  try {
    localStorage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify(game))
  } catch {
    // Storage can be full or blocked; the game keeps running in memory.
  }
}

export function clearLocalGame(): void {
  try {
    localStorage.removeItem(LOCAL_GAME_STORAGE_KEY)
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

function isStoredLocalGame(value: unknown): value is StoredLocalGame {
  return (
    isRecord(value) &&
    isClock(value.clock) &&
    Array.isArray(value.moves) &&
    value.moves.every((move) => typeof move === 'string' && UCI_MOVE.test(move)) &&
    (value.remainingMs === null || isRemaining(value.remainingMs)) &&
    (value.timedOut === null || value.timedOut === 'WHITE' || value.timedOut === 'BLACK') &&
    typeof value.savedAt === 'number'
  )
}

function isClock(value: unknown): value is ClockSettings {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    isOptionalNumber(value.initialMinutes) &&
    isOptionalNumber(value.incrementSeconds)
  )
}

/** The backend sends null rather than omitting the timings of a disabled clock. */
function isOptionalNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number'
}

function isRemaining(value: unknown): value is { white: number; black: number } {
  return isRecord(value) && isTime(value.white) && isTime(value.black)
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
