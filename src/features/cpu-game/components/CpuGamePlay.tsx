import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { applyUciMove, toSide } from '../../../shared/lib/chess'
import { Board } from '../../../shared/ui/Board'
import { Button } from '../../../shared/ui/Button'
import { Clock } from '../../../shared/ui/Clock'
import type { CpuPosition } from '../api'
import { useCpuClock } from '../hooks/useCpuClock'
import { useCpuMoveMutation } from '../hooks/useCpuMoveMutation'
import { isRejectedMoveList } from '../hooks/useCpuPositionQuery'
import { cpuGameMessages } from '../messages'
import type { StoredCpuGame } from '../storage'

const messages = cpuGameMessages.board
const noMoves: string[] = []

/** The player's move while the CPU's reply is outstanding, with what to restore if the backend rejects it. */
export type PendingMove = { move: string; remainingMs: number | null; turnStartedAt: number }

type CpuGamePlayProps = {
  sessionId: number
  game: StoredCpuGame
  /** The backend's position before the pending move, if there is one. */
  position: CpuPosition
  pending: PendingMove | null
  turnStartedAt: number
  onMoved: (uci: string, movedAt: number) => void
  onCpuMoved: (sessionId: number, requested: string[], moves: string[]) => void
  onMoveRejected: (sessionId: number, requested: string[]) => void
  onTick: (remainingMs: number) => void
  onTimeout: () => void
  onNewGame: () => void
}

export function CpuGamePlay({
  sessionId,
  game,
  position,
  pending,
  turnStartedAt,
  onMoved,
  onCpuMoved,
  onMoveRejected,
  onTick,
  onTimeout,
  onNewGame,
}: CpuGamePlayProps) {
  const [error, setError] = useState<string | null>(null)
  const cpuMove = useCpuMoveMutation()
  const over = position.status !== 'ACTIVE' || game.timedOut
  const playerTurn = !pending && toSide(position.sideToMove) === game.playerColor
  // Derived rather than read from the mutation, so a game restored on the CPU's turn shows it from the first render.
  const thinking = !over && !playerTurn && error !== messages.cpuFailed
  // Policy: no clock runs before the first move of the game, nor while the CPU thinks.
  const running = game.clock.enabled === true && game.moves.length > 0 && !over && playerTurn
  const remainingMs = useCpuClock({ remainingMs: game.remainingMs, running, turnStartedAt, onTick, onTimeout })

  const { mutate } = cpuMove
  const { difficulty, playerColor } = game
  const requestCpuMove = useCallback(
    (moves: string[]) => {
      mutate(
        { difficulty, playerColor, moves },
        {
          onSuccess: (next) => onCpuMoved(sessionId, moves, next),
          onError: (failure) => {
            if (isRejectedMoveList(failure)) {
              setError(messages.illegalMove)
              onMoveRejected(sessionId, moves)
            } else {
              setError(messages.cpuFailed)
            }
          },
        },
      )
    },
    [mutate, difficulty, playerColor, sessionId, onCpuMoved, onMoveRejected],
  )

  const playedMoves = game.moves
  // Stable handlers keep the memoized board from re-rendering on every clock tick.
  const handleMove = useCallback(
    (uci: string) => {
      setError(null)
      onMoved(uci, Date.now())
      requestCpuMove([...playedMoves, uci])
    },
    [onMoved, requestCpuMove, playedMoves],
  )
  const handleIllegalMove = useCallback(() => setError(messages.illegalMove), [])

  // A game restored on the CPU's turn was refreshed during its calculation, so ask again (F03 edge).
  const resumeCpu = useEffectEvent(() => {
    if (!over && !pending && !playerTurn) {
      requestCpuMove(playedMoves)
    }
  })
  useEffect(() => {
    resumeCpu()
  }, [])

  function handleRetry() {
    setError(null)
    requestCpuMove(playedMoves)
  }

  function handleNewGame() {
    if (over || window.confirm(messages.confirmNewGame)) {
      onNewGame()
    }
  }

  const fen = position.fen ?? ''
  const status = describeState(game, position, playerTurn, thinking)

  return (
    <div className="flex flex-col gap-3">
      <Board
        fen={pending ? applyUciMove(fen, pending.move) : fen}
        movableSide={playerColor}
        orientation={playerColor}
        legalMoves={pending ? noMoves : (position.legalMoves ?? noMoves)}
        locked={over || !playerTurn}
        onMove={handleMove}
        onIllegalMove={handleIllegalMove}
      />
      {remainingMs === null ? null : <Clock label={messages.clock} ms={remainingMs} active={running} />}
      {status ? (
        <p role="status" className="text-lg font-medium">
          {status}
        </p>
      ) : null}
      {error ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-red-700">
            {error}
          </p>
          {error === messages.cpuFailed ? (
            <Button onClick={handleRetry}>{messages.retry}</Button>
          ) : null}
        </div>
      ) : null}
      <div>
        <Button onClick={handleNewGame}>{messages.newGame}</Button>
      </div>
    </div>
  )
}

function describeState(game: StoredCpuGame, position: CpuPosition, playerTurn: boolean, thinking: boolean) {
  const outcomes = cpuGameMessages.outcome
  if (game.timedOut) {
    return outcomes.timeout
  }
  switch (position.status) {
    case 'CHECKMATE':
      // The side to move is the one that was mated.
      return toSide(position.sideToMove) === game.playerColor ? outcomes.playerMated : outcomes.cpuMated
    case 'STALEMATE':
    case 'INSUFFICIENT_MATERIAL':
    case 'THREEFOLD_REPETITION':
    case 'FIFTY_MOVE_RULE':
      return outcomes[position.status]
    default:
      if (thinking) {
        return messages.thinking
      }
      return playerTurn ? messages.yourMove : null
  }
}
