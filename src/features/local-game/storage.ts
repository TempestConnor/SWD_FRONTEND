import type { ClockSettings } from './api'

export const LOCAL_GAME_STORAGE_KEY = 'chess.local-game.v1'

export type Side = 'WHITE' | 'BLACK'

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

export function loadLocalGame(): StoredLocalGame | null {
  throw new Error('not implemented')
}

export function saveLocalGame(_game: StoredLocalGame): void {
  throw new Error('not implemented')
}

export function clearLocalGame(): void {
  throw new Error('not implemented')
}
