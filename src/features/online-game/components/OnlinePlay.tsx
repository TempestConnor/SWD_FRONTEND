import { useCallback, useMemo, useState } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { applyUciMove, legalMoves, sideToMove, toSide, type Side } from '../../../shared/lib/chess'
import { Board } from '../../../shared/ui/Board'
import type { OnlineGame } from '../api'
import { useMakeMoveMutation } from '../hooks/useMakeMoveMutation'
import { useMovesQuery } from '../hooks/useMovesQuery'
import { onlineGameMessages as messages } from '../messages'
import { MoveList } from './MoveList'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const noMoves: string[] = []

type OnlinePlayProps = {
  game: OnlineGame
}

/**
 * The board of an online game (F08). The viewer moves only on their turn of an active game; the move shows at
 * once and the server's answer replaces it, or the game is re-read when the move is refused. The opponent's
 * moves arrive through the heartbeat.
 */
export function OnlinePlay({ game }: OnlinePlayProps) {
  const gameId = game.id ?? 0
  const lastPly = game.lastPly ?? 0
  const fen = game.currentFen ?? START_FEN
  const viewer = toSide(game.viewerColor)
  const started = game.status === 'ACTIVE' || game.status === 'COMPLETED'
  const viewerTurn = game.status === 'ACTIVE' && sideToMove(fen) === viewer

  const [error, setError] = useState<string | null>(null)
  const { mutate, isPending, variables } = useMakeMoveMutation(gameId)
  const moves = useMovesQuery(gameId, lastPly, started)
  // Shown only while it still follows the cached position; once the answer lands the server's FEN takes over.
  const optimistic = isPending && variables?.ply === lastPly + 1 ? variables.move : null
  const canMove = viewerTurn && !isPending
  const legal = useMemo(() => (viewerTurn ? legalMoves(fen) : noMoves), [viewerTurn, fen])

  const handleMove = useCallback(
    (move: string) => {
      setError(null)
      mutate({ ply: lastPly + 1, move }, { onError: (failure) => setError(rejectionMessage(failure)) })
    },
    [mutate, lastPly],
  )
  const handleIllegalMove = useCallback(() => setError(messages.moveRejected.ILLEGAL_MOVE ?? null), [])

  const result = game.status === 'COMPLETED' ? describeResult(game, viewer) : undefined

  return (
    <div className="flex flex-col gap-3">
      {game.status === 'ACTIVE' ? (
        <p className="text-lg font-medium">{canMove ? messages.yourMove : messages.opponentsMove}</p>
      ) : null}
      {result ? <p className="text-lg font-medium">{result}</p> : null}
      {error ? (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      ) : null}
      <Board
        fen={optimistic ? applyUciMove(fen, optimistic) : fen}
        movableSide={viewer}
        orientation={viewer}
        legalMoves={legal}
        locked={!canMove}
        // The viewer's move shows the moment it is played and the server's position replaces it unchanged.
        animated={false}
        onMove={handleMove}
        onIllegalMove={handleIllegalMove}
      />
      {started && moves.data ? <MoveList moves={moves.data} /> : null}
    </div>
  )
}

function rejectionMessage(failure: unknown): string {
  const known = failure instanceof ApiError ? messages.moveRejected[failure.errorCode] : undefined
  return known ?? errorMessages.generic
}

/** Endings a move can produce; the other termination reasons belong to later features. */
function describeResult(game: OnlineGame, viewer: Side): string | undefined {
  if (game.outcome === 'DRAW') {
    return messages.outcome.draw[game.terminationReason ?? '']
  }
  if (game.terminationReason === 'CHECKMATE') {
    const viewerWon = game.outcome === (viewer === 'WHITE' ? 'WHITE_WIN' : 'BLACK_WIN')
    return viewerWon ? messages.outcome.checkmateWin : messages.outcome.checkmateLoss
  }
  return undefined
}
