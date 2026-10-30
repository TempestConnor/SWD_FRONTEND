import type { RemainingMs } from '../../shared/lib/clock'
import type { OnlineGame } from './api'

/** Both clocks at nowMs as the server's timestamps imply; null when the game has no clock. */
export function liveRemaining(_game: OnlineGame, _nowMs: number): RemainingMs | null {
  throw new Error('not implemented')
}
