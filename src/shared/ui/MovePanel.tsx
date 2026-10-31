import type { ReactNode } from 'react'
import type { PlayedMove } from '../lib/chess'
import { CapturedPieces } from './CapturedPieces'
import { sharedUiMessages } from './messages'
import { MoveList } from './MoveList'

const messages = sharedUiMessages.record

type MovePanelProps = {
  /** The moves in ply order, in SAN where it is known. */
  moves: string[]
  /** The same moves replayed, for the captured pieces. */
  played: PlayedMove[]
  /** The position after the played moves. */
  fen: string
}

/**
 * The side panel next to a board: captured pieces above a scrolling move log. On wide screens it takes the
 * height of the board column beside it and scrolls inside that; on narrow screens it sits below the board.
 */
export function MovePanel({ moves, played, fen }: MovePanelProps) {
  return (
    <aside className="relative h-72 lg:h-auto">
      <div className="absolute inset-0 flex flex-col gap-3 rounded-xl bg-surface p-3 shadow-sm ring-1 ring-line">
        <h2 className="font-semibold">{messages.moves}</h2>
        <CapturedPieces played={played} fen={fen} />
        <div className="flex min-h-0 flex-1 flex-col border-t border-line pt-2">
          <MoveList moves={moves} />
        </div>
      </div>
    </aside>
  )
}

type WithMovePanelProps = {
  panel: ReactNode
  children: ReactNode
}

/** The board column with the move panel on its right on wide screens, below it on narrow ones. */
export function WithMovePanel({ panel, children }: WithMovePanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
      {panel}
    </div>
  )
}
