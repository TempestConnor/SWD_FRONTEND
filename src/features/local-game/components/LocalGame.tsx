import { useEffect, useState } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import type { Side } from '../../../shared/lib/chess'
import { initialRemaining, remainingAfterMove, sideKey, type RemainingMs } from '../../../shared/lib/clock'
import { Button } from '../../../shared/ui/Button'
import type { LocalGame as StartedGame } from '../api'
import { isRejectedMoveList, useLocalPositionQuery } from '../hooks/useLocalPositionQuery'
import { localGameMessages } from '../messages'
import { clearLocalGame, loadLocalGame, saveLocalGame, type StoredLocalGame } from '../storage'
import { LocalGamePlay } from './LocalGamePlay'
import { LocalGameSetup } from './LocalGameSetup'

/** The stored game plus when the current turn started; the turn start is not stored. */
type Session = { game: StoredLocalGame; turnStartedAt: number }

/** Local hot-seat chess: clock setup, then a board shared by both players on one browser. */
export function LocalGame() {
  // Policy: the clock pauses while the page is closed, so a restored turn starts counting on load.
  const [session, setSession] = useState<Session | null>(() => {
    const game = loadLocalGame()
    return game ? { game, turnStartedAt: Date.now() } : null
  })
  const positionQuery = useLocalPositionQuery(session ? session.game.moves : null)
  // Moves only enter the session after the backend accepts them, so a rejected list came from storage.
  const discarded = isRejectedMoveList(positionQuery.error)
  const game = discarded ? null : (session?.game ?? null)

  // Browser storage mirrors the game; it is the only copy that survives a refresh (BR-GAME-004).
  useEffect(() => {
    if (game) {
      saveLocalGame({ ...game, savedAt: Date.now() })
    } else {
      clearLocalGame()
    }
  }, [game])

  function handleStarted(started: StartedGame) {
    const clock = started.clock ?? { enabled: false }
    const fresh: StoredLocalGame = {
      clock,
      moves: [],
      remainingMs: initialRemaining(clock),
      timedOut: null,
      savedAt: Date.now(),
    }
    setSession({ game: fresh, turnStartedAt: Date.now() })
  }

  function handleMoved(moves: string[], movedAt: number) {
    setSession((current) => {
      if (!current || current.game.timedOut) {
        return current
      }
      const { game: before, turnStartedAt } = current
      const mover: Side = moves.length % 2 === 1 ? 'WHITE' : 'BLACK'
      // No clock runs before White's first move, so that move costs no time.
      const elapsed = before.moves.length === 0 ? 0 : movedAt - turnStartedAt
      const remainingMs = before.remainingMs && remainingAfterMove(before.remainingMs, before.clock, mover, elapsed)
      return { game: { ...before, moves, remainingMs }, turnStartedAt: movedAt }
    })
  }

  function handleTick(remaining: RemainingMs) {
    // Saves the running clock without re-rendering, so a refresh keeps the time already used this turn.
    if (game) {
      saveLocalGame({ ...game, remainingMs: remaining, savedAt: Date.now() })
    }
  }

  function handleTimeout(side: Side) {
    setSession((current) => {
      if (!current?.game.remainingMs || current.game.timedOut) {
        return current
      }
      const remainingMs = { ...current.game.remainingMs, [sideKey(side)]: 0 }
      return { ...current, game: { ...current.game, timedOut: side, remainingMs } }
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{localGameMessages.title}</h1>
      {session && game ? (
        positionQuery.data ? (
          <LocalGamePlay
            game={game}
            position={positionQuery.data}
            turnStartedAt={session.turnStartedAt}
            onMoved={handleMoved}
            onTick={handleTick}
            onTimeout={handleTimeout}
            onNewGame={() => setSession(null)}
          />
        ) : positionQuery.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
              {errorMessages.generic}
            </p>
            <Button onClick={() => void positionQuery.refetch()}>{localGameMessages.board.retry}</Button>
          </div>
        ) : (
          <p>{localGameMessages.board.loading}</p>
        )
      ) : (
        <LocalGameSetup
          notice={discarded ? localGameMessages.setup.restoreFailed : undefined}
          onStarted={handleStarted}
        />
      )}
    </section>
  )
}
