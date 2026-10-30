import { errorMessages } from '../../../api/errorMessages'
import { Button } from '../../../shared/ui/Button'
import type { QueueRequest } from '../api'
import { useCancelQueueMutation } from '../hooks/useCancelQueueMutation'
import { matchmakingMessages as messages } from '../messages'

type QueueSearchProps = {
  request: QueueRequest
  /** The last heartbeat failed; the server drops the request if none gets through within its grace. */
  connectionLost: boolean
}

/** An open queue request: the rating it was entered with, and a way to leave. */
export function QueueSearch({ request, connectionLost }: QueueSearchProps) {
  const cancel = useCancelQueueMutation()

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <p className="flex items-center gap-2 font-semibold">
        <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-brand" />
        {messages.searching}
      </p>
      {request.ratingAtEntry === undefined ? null : (
        <p className="text-sm text-muted">{messages.rating(request.ratingAtEntry)}</p>
      )}
      <p className="text-sm text-muted">{messages.keepOpen}</p>
      {connectionLost ? (
        <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          {messages.connectionLost}
        </p>
      ) : null}
      {cancel.isError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {errorMessages.generic}
        </p>
      ) : null}
      <Button onClick={() => cancel.mutate()} disabled={cancel.isPending}>
        {cancel.isPending ? messages.leaving : messages.leave}
      </Button>
    </div>
  )
}
