import type { GameMove } from '../api'
import { onlineGameMessages as messages } from '../messages'

type MoveListProps = {
  moves: GameMove[]
}

/** The accepted moves in the server's ply order, one entry per ply. */
export function MoveList({ moves }: MoveListProps) {
  return (
    <ol aria-label={messages.moves} className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
      {moves.map((move) => (
        <li key={move.ply}>{move.san ?? move.move}</li>
      ))}
    </ol>
  )
}
