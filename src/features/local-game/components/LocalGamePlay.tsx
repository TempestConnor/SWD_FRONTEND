import { useCallback, useState } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { Button } from '../../../shared/ui/Button'
import type { LocalPosition } from '../api'
import { formatClock, type RemainingMs } from '../clock'
import { useLocalClock } from '../hooks/useLocalClock'
import { isRejectedMoveList } from '../hooks/useLocalPositionQuery'
import { usePlayLocalMoveMutation } from '../hooks/usePlayLocalMoveMutation'
import { localGameMessages, opponent } from '../messages'
import type { Side, StoredLocalGame } from '../storage'
import { LocalBoard } from './LocalBoard'

const messages = localGameMessages.board
const noMoves: string[] = []

type LocalGamePlayProps = {
  game: StoredLocalGame
  position: LocalPosition
  turnStartedAt: number
  onMoved: (moves: string[], movedAt: number) => void
  onTick: (remaining: RemainingMs) => void
  onTimeout: (side: Side) => void
  onNewGame: () => void
}

export function LocalGamePlay({
  game,
  position,
  turnStartedAt,
  onMoved,
  onTick,
  onTimeout,
  onNewGame,
}: LocalGamePlayProps) {
  const [error, setError] = useState<string | null>(null)
  const playMove = usePlayLocalMoveMutation()
  const sideToMove: Side = position.sideToMove === 'BLACK' ? 'BLACK' : 'WHITE'
  const over = position.status !== 'ACTIVE' || game.timedOut !== null
  // Policy: no clock runs before White's first move.
  const running = game.clock.enabled === true && game.moves.length > 0 && !over
  const remaining = useLocalClock({ remaining: game.remainingMs, sideToMove, running, turnStartedAt, onTick, onTimeout })

  const { mutate } = playMove
  const playedMoves = game.moves
  // Stable handlers keep the memoized board from re-rendering on every clock tick.
  const handleMove = useCallback(
    (uci: string) => {
      const movedAt = Date.now()
      setError(null)
      mutate([...playedMoves, uci], {
        onSuccess: (_position, moves) => onMoved(moves, movedAt),
        onError: (failure) => setError(isRejectedMoveList(failure) ? messages.illegalMove : errorMessages.generic),
      })
    },
    [mutate, playedMoves, onMoved],
  )
  const handleIllegalMove = useCallback(() => setError(messages.illegalMove), [])

  function handleNewGame() {
    if (over || window.confirm(messages.confirmNewGame)) {
      onNewGame()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {remaining ? <SideClock side="BLACK" ms={remaining.black} active={running && sideToMove === 'BLACK'} /> : null}
      <LocalBoard
        fen={position.fen ?? ''}
        sideToMove={sideToMove}
        legalMoves={position.legalMoves ?? noMoves}
        locked={over || playMove.isPending}
        onMove={handleMove}
        onIllegalMove={handleIllegalMove}
      />
      {remaining ? <SideClock side="WHITE" ms={remaining.white} active={running && sideToMove === 'WHITE'} /> : null}
      <p role="status" className="text-lg font-medium">
        {describeState(game, position, sideToMove)}
      </p>
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : null}
      <div>
        <Button onClick={handleNewGame}>{messages.newGame}</Button>
      </div>
    </div>
  )
}

type SideClockProps = { side: Side; ms: number; active: boolean }

function SideClock({ side, ms, active }: SideClockProps) {
  return (
    <div
      role="timer"
      aria-label={messages.clock(side)}
      className={`self-end rounded px-3 py-1 font-mono text-xl tabular-nums ${active ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
    >
      {formatClock(ms)}
    </div>
  )
}

function describeState(game: StoredLocalGame, position: LocalPosition, sideToMove: Side): string {
  if (game.timedOut) {
    return localGameMessages.outcome.timeout(game.timedOut)
  }
  switch (position.status) {
    case 'CHECKMATE':
      // The side to move is the one that was mated.
      return localGameMessages.outcome.CHECKMATE(opponent(sideToMove))
    case 'STALEMATE':
    case 'INSUFFICIENT_MATERIAL':
    case 'THREEFOLD_REPETITION':
    case 'FIFTY_MOVE_RULE':
      return localGameMessages.outcome[position.status]
    default:
      return messages.toMove(sideToMove)
  }
}
