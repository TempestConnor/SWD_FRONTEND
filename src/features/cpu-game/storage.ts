import type { components } from '../../api/schema'

export const CPU_GAME_STORAGE_KEY = 'chess.cpu-game.v1'

export type Side = 'WHITE' | 'BLACK'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

/** The minimum needed to rebuild a CPU game; the position itself is replayed by the backend. */
export type StoredCpuGame = {
  difficulty: Difficulty
  /** The player's resolved color; RANDOM is resolved by the backend at start. */
  playerColor: Side
  clock: components['schemas']['ClockSettingsDTO']
  /** UCI moves in play order, both the player's and the CPU's. */
  moves: string[]
  /** The player's remaining time when last saved; null when the clock is disabled. The CPU has no clock. */
  remainingMs: number | null
  /** True once the player's clock ran out, which ends the game. */
  timedOut: boolean
  /** Epoch milliseconds of the last save. */
  savedAt: number
}

export function loadCpuGame(): StoredCpuGame | null {
  throw new Error('not implemented')
}

export function saveCpuGame(_game: StoredCpuGame): void {
  throw new Error('not implemented')
}

export function clearCpuGame(): void {
  throw new Error('not implemented')
}
