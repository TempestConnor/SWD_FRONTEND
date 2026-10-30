import { memo, useState, type CSSProperties } from 'react'
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import type { Side } from '../storage'
import { PromotionDialog, type PromotionPiece } from './PromotionDialog'

const selectedStyle: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.55)' }
const targetStyle: CSSProperties = { boxShadow: 'inset 0 0 0 4px rgba(22, 163, 74, 0.7)' }

type LocalBoardProps = {
  fen: string
  sideToMove: Side
  /** The backend's UCI legal moves; empty once the game is over. */
  legalMoves: string[]
  /** True while a move is being checked or after the game ended. */
  locked: boolean
  onMove: (uci: string) => void
  onIllegalMove: () => void
}

/**
 * Click-to-move and drag-to-move board. Legality comes from the backend's legal-move list, not a local engine.
 * Memoized because the clock re-renders its parent many times a second.
 */
export const LocalBoard = memo(function LocalBoard({
  fen,
  sideToMove,
  legalMoves,
  locked,
  onMove,
  onIllegalMove,
}: LocalBoardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [promotion, setPromotion] = useState<string | null>(null)
  const color = sideToMove === 'WHITE' ? 'w' : 'b'

  function attempt(from: string, to: string) {
    setSelected(null)
    const candidates = legalMoves.filter((move) => move.startsWith(from + to))
    if (candidates.length === 0) {
      onIllegalMove()
    } else if (candidates.length > 1) {
      // Only promotions have several legal moves between the same two squares.
      setPromotion(from + to)
    } else {
      onMove(candidates[0])
    }
  }

  function handleSquareClick({ square, piece }: SquareHandlerArgs) {
    if (locked || promotion) {
      return
    }
    if (selected === null) {
      setSelected(square)
    } else if (square === selected) {
      setSelected(null)
    } else if (piece?.pieceType.startsWith(color)) {
      setSelected(square)
    } else {
      attempt(selected, square)
    }
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    if (!locked && targetSquare && targetSquare !== sourceSquare) {
      attempt(sourceSquare, targetSquare)
    }
    // The board snaps back; the backend's answer moves the piece.
    return false
  }

  function handlePromotion(piece: PromotionPiece) {
    if (promotion) {
      onMove(promotion + piece)
    }
    setPromotion(null)
  }

  const squareStyles: Record<string, CSSProperties> = {}
  if (selected !== null) {
    for (const move of legalMoves) {
      if (move.startsWith(selected)) {
        squareStyles[selected] = selectedStyle
        squareStyles[move.slice(2, 4)] = targetStyle
      }
    }
  }

  return (
    <div className="w-full">
      <Chessboard
        options={{
          id: 'local-game',
          position: fen,
          squareStyles,
          onSquareClick: handleSquareClick,
          onPieceDrop: handlePieceDrop,
          canDragPiece: ({ piece }) => !locked && !promotion && piece.pieceType.startsWith(color),
        }}
      />
      {promotion ? <PromotionDialog onChoose={handlePromotion} onCancel={() => setPromotion(null)} /> : null}
    </div>
  )
})
