import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { Button } from '../../../shared/ui/Button'
import { useJoinQueueMutation } from '../hooks/useJoinQueueMutation'
import { matchmakingMessages as messages } from '../messages'

type JoinQueueProps = {
  /** How the last search ended, when this page saw it end. */
  notice: string | null
}

/** Out of the queue: how the last search ended, and a way to start one. */
export function JoinQueue({ notice }: JoinQueueProps) {
  const join = useJoinQueueMutation()
  const unavailable = join.error instanceof ApiError && join.error.errorCode === 'MATCHMAKING_UNAVAILABLE'

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      {notice === null ? null : <p role="status">{notice}</p>}
      {join.isError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {unavailable ? messages.unavailable : errorMessages.generic}
        </p>
      ) : null}
      <Button onClick={() => join.mutate()} disabled={join.isPending}>
        {join.isPending ? messages.joining : messages.find}
      </Button>
    </div>
  )
}
