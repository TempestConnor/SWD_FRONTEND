import { describeEnding, matchHistoryMessages as messages } from '../messages'

type HistoryResultProps = {
  /** The viewer's WIN, LOSS or DRAW, as the server computed it. */
  result: string | undefined
  terminationReason: string | undefined
}

/** The result from the viewer's side and how the game ended. */
export function HistoryResult({ result, terminationReason }: HistoryResultProps) {
  const ending = describeEnding(result, terminationReason)

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      {result === undefined ? null : <span className="font-bold">{messages.result[result] ?? result}</span>}
      {ending === undefined ? null : <span className="text-muted">{ending}</span>}
    </div>
  )
}
