import { useCallback, useEffect, useState } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { incrementMs, msAfterElapsed } from '../../../shared/lib/clock'
import { Button } from '../../../shared/ui/Button'
import { isRejectedMoveList, useCpuPositionQuery } from '../hooks/useCpuPositionQuery'
import { cpuGameMessages } from '../messages'
import { clearCpuGame, loadCpuGame, saveCpuGame, type StoredCpuGame } from '../storage'
import { CpuGamePlay, type PendingMove } from './CpuGamePlay'
import { CpuGameSetup } from './CpuGameSetup'

/**
 * The stored game plus what is not stored: an id that tells this game's CPU replies from a previous game's,
 * when the player's turn started, and the player's move while the CPU has not yet confirmed it.
 */
type Session = { id: number; game: StoredCpuGame; turnStartedAt: number; pending: PendingMove | null }

let lastSessionId = 0

function newSession(game: StoredCpuGame): Session {
  lastSessionId += 1
  return { id: lastSessionId, game, turnStartedAt: Date.now(), pending: null }
}

/** Chess against the backend's CPU: difficulty, color and clock setup, then a board against the engine. */
export function CpuGame() {
  // Policy (as for local games): the clock pauses while the page is closed.
  const [session, setSession] = useState<Session | null>(() => {
    const game = loadCpuGame()
    return game ? newSession(game) : null
  })
  // The pending move is not yet accepted by the backend, so the position is the one before it.
  const confirmedMoves = session ? (session.pending ? session.game.moves.slice(0, -1) : session.game.moves) : null
  const positionQuery = useCpuPositionQuery(confirmedMoves)
  // Moves only enter the confirmed list after the backend accepts them, so a rejected list came from storage.
  const discarded = isRejectedMoveList(positionQuery.error)
  const game = discarded ? null : (session?.game ?? null)

  // Browser storage mirrors the game, including a move still waiting for the CPU (BR-GAME-004).
  useEffect(() => {
    if (game) {
      saveCpuGame({ ...game, savedAt: Date.now() })
    } else {
      clearCpuGame()
    }
  }, [game])

  // Stable handlers keep the memoized board from re-rendering on every clock tick.
  const handleMoved = useCallback((uci: string, movedAt: number) => {
    setSession((current) => {
      if (!current || current.pending || current.game.timedOut) {
        return current
      }
      const { game: before, turnStartedAt } = current
      // No clock runs before the first move of the game, so that move costs no time.
      const elapsed = before.moves.length === 0 ? 0 : movedAt - turnStartedAt
      const remainingMs =
        before.remainingMs === null ? null : msAfterElapsed(before.remainingMs, elapsed) + incrementMs(before.clock)
      return {
        ...current,
        game: { ...before, moves: [...before.moves, uci], remainingMs },
        pending: { move: uci, remainingMs: before.remainingMs, turnStartedAt },
      }
    })
  }, [])

  const handleCpuMoved = useCallback((sessionId: number, requested: string[], moves: string[]) => {
    const now = Date.now()
    setSession((current) =>
      isCurrent(current, sessionId, requested)
        ? { ...current, game: { ...current.game, moves }, pending: null, turnStartedAt: now }
        : current,
    )
  }, [])

  const handleMoveRejected = useCallback((sessionId: number, requested: string[]) => {
    setSession((current) => {
      if (!isCurrent(current, sessionId, requested) || !current.pending) {
        return current
      }
      const { pending } = current
      const game = { ...current.game, moves: requested.slice(0, -1), remainingMs: pending.remainingMs }
      return { ...current, game, pending: null, turnStartedAt: pending.turnStartedAt }
    })
  }, [])

  function handleTick(remainingMs: number) {
    // Saves the running clock without re-rendering, so a refresh keeps the time already used this turn.
    if (game) {
      saveCpuGame({ ...game, remainingMs, savedAt: Date.now() })
    }
  }

  function handleTimeout() {
    setSession((current) => {
      if (!current || current.game.remainingMs === null || current.game.timedOut) {
        return current
      }
      return { ...current, game: { ...current.game, timedOut: true, remainingMs: 0 } }
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">{cpuGameMessages.title}</h1>
      {session && game ? (
        positionQuery.data ? (
          <CpuGamePlay
            sessionId={session.id}
            game={game}
            position={positionQuery.data}
            pending={session.pending}
            turnStartedAt={session.turnStartedAt}
            onMoved={handleMoved}
            onCpuMoved={handleCpuMoved}
            onMoveRejected={handleMoveRejected}
            onTick={handleTick}
            onTimeout={handleTimeout}
            onNewGame={() => setSession(null)}
          />
        ) : positionQuery.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-red-700">
              {errorMessages.generic}
            </p>
            <Button onClick={() => void positionQuery.refetch()}>{cpuGameMessages.board.retry}</Button>
          </div>
        ) : (
          <p>{cpuGameMessages.board.loading}</p>
        )
      ) : (
        <CpuGameSetup
          notice={discarded ? cpuGameMessages.setup.restoreFailed : undefined}
          onStarted={(started) => setSession(newSession(started))}
        />
      )}
    </section>
  )
}

/** A CPU reply belongs to the game on screen only if that game and its move list are unchanged since the request. */
function isCurrent(session: Session | null, sessionId: number, requested: string[]): session is Session {
  const moves = session?.game.moves
  return (
    session?.id === sessionId &&
    moves !== undefined &&
    moves.length === requested.length &&
    moves.every((move, index) => move === requested[index])
  )
}
