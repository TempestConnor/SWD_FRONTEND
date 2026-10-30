import type { GameMove } from '../api'
import { onlineGameMessages as messages } from '../messages'

type MoveListProps = {
  moves: GameMove[]
}

/** The accepted moves in the server's ply order, one entry per ply. */
export function MoveList({ moves }: MoveListProps) {
  return (
    <ol aria-label={messages.moves} className="flex max-h-48 flex-wrap content-start gap-1.5 overflow-y-auto rounded-xl bg-surface p-3 font-mono text-sm ring-1 ring-line">
      {moves.map((move) => (
        <li key={move.ply} className="rounded-md bg-paper px-2 py-0.5">{move.san ?? move.move}</li>
      ))}
    </ol>
  )
}
