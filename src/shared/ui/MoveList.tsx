import { useEffect, useRef } from 'react'
import { sharedUiMessages } from './messages'

const messages = sharedUiMessages.record

type MoveListProps = {
  /** The moves in ply order, in SAN where it is known; White moves first. */
  moves: string[]
}

/**
 * The moves of a game as a log, one entry per ply in rows of White and Black, that keeps the newest move in view.
 * Move numbers are drawn by CSS so each entry's text is just its move.
 */
export function MoveList({ moves }: MoveListProps) {
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [moves.length])

  return (
    <ol
      ref={listRef}
      aria-label={messages.moves}
      className="grid min-h-0 flex-1 auto-rows-min grid-cols-[2.5rem_1fr_1fr] overflow-y-auto font-mono text-sm"
    >
      {moves.map((move, index) =>
        index % 2 === 0 ? (
          <li
            key={index}
            data-number={`${index / 2 + 1}.`}
            className="col-span-2 col-start-1 grid grid-cols-subgrid px-2 py-1 before:text-muted before:content-[attr(data-number)]"
          >
            {move}
          </li>
        ) : (
          <li key={index} className="col-start-3 px-2 py-1">
            {move}
          </li>
        ),
      )}
    </ol>
  )
}
