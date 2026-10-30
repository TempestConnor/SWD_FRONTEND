import { sideToMove, type Side } from '../../shared/lib/chess'
import { msAfterElapsed, sideKey, type RemainingMs } from '../../shared/lib/clock'
import type { OnlineGame } from './api'

/** The side whose clock the server is running: the side to move of an active game with a clock. */
export function runningSide(game: OnlineGame): Side | null {
  if (game.status !== 'ACTIVE' || !game.clock?.enabled || !game.turnStartedAt || !game.currentFen) {
    return null
  }
  return sideToMove(game.currentFen)
}

/** Time left on a running clock at nowMs; a local time before the turn start counts as no time spent. */
export function runningMs(remainingMs: number, turnStartedAt: string, nowMs: number): number {
  return msAfterElapsed(remainingMs, nowMs - Date.parse(turnStartedAt))
}

/** Both clocks at nowMs as the server's timestamps imply; null when the game has no clock. */
export function liveRemaining(game: OnlineGame, nowMs: number): RemainingMs | null {
  if (!game.clock?.enabled || game.whiteRemainingMs == null || game.blackRemainingMs == null) {
    return null
  }
  const remaining = { white: game.whiteRemainingMs, black: game.blackRemainingMs }
  const running = runningSide(game)
  if (running && game.turnStartedAt) {
    const key = sideKey(running)
    remaining[key] = runningMs(remaining[key], game.turnStartedAt, nowMs)
  }
  return remaining
}
