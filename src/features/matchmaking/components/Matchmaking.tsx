import { useEffect, useEffectEvent } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { Button } from '../../../shared/ui/Button'
import { GameTerms } from '../../../shared/ui/GameTerms'
import { useQueueRequestQuery } from '../hooks/useQueueRequestQuery'
import { matchmakingMessages as messages } from '../messages'
import { JoinQueue } from './JoinQueue'
import { QueueSearch } from './QueueSearch'

/** The only queue at launch, so its terms are fixed (BR-MOVE-014). */
const QUEUE_CLOCK = { enabled: true, initialMinutes: 30, incrementSeconds: 10 }

type MatchmakingProps = {
  /** Called once the queue request is paired into a pending game. */
  onMatched?: (gameId: number) => void
}

/**
 * F05: join the rated classical queue, keep the place with heartbeats, and leave it.
 * F06: the heartbeat (or a cancel that lost the race) reports the pairing, and the pending game opens.
 */
export function Matchmaking({ onMatched }: MatchmakingProps) {
  const query = useQueueRequestQuery()
  const request = query.data
  const matchedGameId = request?.status === 'MATCHED' ? request.gameId : undefined

  const openGame = useEffectEvent((gameId: number) => onMatched?.(gameId))
  useEffect(() => {
    if (matchedGameId !== undefined) {
      openGame(matchedGameId)
    }
  }, [matchedGameId])

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">{messages.title}</h1>
      <p>{messages.intro}</p>
      <GameTerms rated clock={QUEUE_CLOCK} />
      {request === undefined ? (
        query.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-red-700">
              {errorMessages.generic}
            </p>
            <Button onClick={() => void query.refetch()}>{messages.retry}</Button>
          </div>
        ) : (
          <p>{messages.loading}</p>
        )
      ) : request?.status === 'MATCHED' ? (
        <p role="status" className="font-medium">
          {messages.matched}
        </p>
      ) : request?.status === 'QUEUED' ? (
        <QueueSearch request={request} connectionLost={query.isError} />
      ) : (
        <JoinQueue
          notice={
            request?.status === 'CANCELLED' ? messages.left : request?.status === 'TIMED_OUT' ? messages.timedOut : null
          }
        />
      )}
    </section>
  )
}
