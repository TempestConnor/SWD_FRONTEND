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
    <div className="flex flex-col items-start gap-2">
      <p className="font-medium">{messages.searching}</p>
      {request.ratingAtEntry === undefined ? null : (
        <p className="text-sm text-gray-600">{messages.rating(request.ratingAtEntry)}</p>
      )}
      <p className="text-sm text-gray-600">{messages.keepOpen}</p>
      {connectionLost ? (
        <p role="status" className="text-amber-700">
          {messages.connectionLost}
        </p>
      ) : null}
      {cancel.isError ? (
        <p role="alert" className="text-red-700">
          {errorMessages.generic}
        </p>
      ) : null}
      <Button onClick={() => cancel.mutate()} disabled={cancel.isPending}>
        {cancel.isPending ? messages.leaving : messages.leave}
      </Button>
    </div>
  )
}
