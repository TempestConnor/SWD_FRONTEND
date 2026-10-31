import { defaultPieces } from 'react-chessboard'
import { materialLead, opponent, type PieceKind, type PlayedMove, type Side } from '../lib/chess'
import { sharedUiMessages } from './messages'

const messages = sharedUiMessages.record
const sides: Side[] = ['WHITE', 'BLACK']
const order: PieceKind[] = ['q', 'r', 'b', 'n', 'p', 'k']
const spriteStyle = { width: '100%', height: '100%' }

type CapturedPiecesProps = {
  played: PlayedMove[]
  /** The position after the played moves, which the material lead is counted from. */
  fen: string
}

/** The pieces each side has taken, most valuable first, drawn with the board's sprites, and the material lead. */
export function CapturedPieces({ played, fen }: CapturedPiecesProps) {
  const lead = materialLead(fen)

  return (
    <div className="flex flex-col gap-1 text-sm">
      {sides.map((side) => {
        const taken = played
          .flatMap((move) => (move.side === side && move.captured ? [move.captured] : []))
          .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        return (
          <div key={side} role="group" aria-label={messages.capturedBy(side)} className="flex min-h-6 items-center gap-2">
            <span aria-hidden="true" className="w-12 shrink-0 text-muted">{messages.side(side)}</span>
            <ul className="flex flex-wrap items-center">
              {taken.map((piece, index) => (
                // Overlapping like a stack keeps a long row of pawns compact.
                <li key={index} title={messages.pieces[piece]} className="-mr-1.5 size-6">
                  <span aria-hidden="true">{sprite(opponent(side), piece)}</span>
                  <span className="sr-only">{messages.pieces[piece]}</span>
                </li>
              ))}
            </ul>
            {lead?.side === side ? <span className="ml-1 font-semibold text-muted">{messages.lead(lead.points)}</span> : null}
          </div>
        )
      })}
    </div>
  )
}

function sprite(color: Side, piece: PieceKind) {
  const render = defaultPieces[`${color === 'WHITE' ? 'w' : 'b'}${piece.toUpperCase()}`]
  return render ? render({ svgStyle: spriteStyle }) : null
}
