import type { Side } from '../../shared/lib/chess'
import type { ClockSettings } from '../../shared/lib/clock'

export const CPU_GAME_STORAGE_KEY = 'chess.cpu-game.v1'

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

/** The minimum needed to rebuild a CPU game; the position itself is replayed by the backend. */
export type StoredCpuGame = {
  difficulty: Difficulty
  /** The player's resolved color; RANDOM is resolved by the backend at start. */
  playerColor: Side
  clock: ClockSettings
  /** UCI moves in play order, both the player's and the CPU's. */
  moves: string[]
  /** The player's remaining time when last saved; null when the clock is disabled. The CPU has no clock. */
  remainingMs: number | null
  /** True once the player's clock ran out, which ends the game. */
  timedOut: boolean
  /** Epoch milliseconds of the last save. */
  savedAt: number
}

const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/

export function loadCpuGame(): StoredCpuGame | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(CPU_GAME_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) {
    return null
  }

  try {
    const value: unknown = JSON.parse(raw)
    if (isStoredCpuGame(value)) {
      return value
    }
  } catch {
    // Falls through to discarding the corrupt value.
  }
  clearCpuGame()
  return null
}

export function saveCpuGame(game: StoredCpuGame): void {
  try {
    localStorage.setItem(CPU_GAME_STORAGE_KEY, JSON.stringify(game))
  } catch {
    // Storage can be full or blocked; the game keeps running in memory.
  }
}

export function clearCpuGame(): void {
  try {
    localStorage.removeItem(CPU_GAME_STORAGE_KEY)
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

function isStoredCpuGame(value: unknown): value is StoredCpuGame {
  return (
    isRecord(value) &&
    (value.difficulty === 'EASY' || value.difficulty === 'MEDIUM' || value.difficulty === 'HARD') &&
    (value.playerColor === 'WHITE' || value.playerColor === 'BLACK') &&
    isClock(value.clock) &&
    Array.isArray(value.moves) &&
    value.moves.every((move) => typeof move === 'string' && UCI_MOVE.test(move)) &&
    (value.remainingMs === null || isTime(value.remainingMs)) &&
    typeof value.timedOut === 'boolean' &&
    typeof value.savedAt === 'number'
  )
}

function isClock(value: unknown): value is ClockSettings {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    (value.initialMinutes === undefined || typeof value.initialMinutes === 'number') &&
    (value.incrementSeconds === undefined || typeof value.incrementSeconds === 'number')
  )
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
