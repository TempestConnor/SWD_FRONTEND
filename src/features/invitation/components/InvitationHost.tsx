import { useEffect, useEffectEvent, useState } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { Button } from '../../../shared/ui/Button'
import { useInvitationQuery } from '../hooks/useInvitationQuery'
import { invitationMessages } from '../messages'
import { clearInvitation, loadInvitation, saveInvitation, type StoredInvitation } from '../storage'
import { InvitationSetup } from './InvitationSetup'
import { WaitingForOpponent } from './WaitingForOpponent'

const messages = invitationMessages.host

type InvitationHostProps = {
  onClaimed: (gameId: number) => void
}

/** The host's side of F04: create a link, wait for a claim by polling, cancel, or start over. */
export function InvitationHost({ onClaimed }: InvitationHostProps) {
  const [current, setCurrent] = useState<StoredInvitation | null>(loadInvitation)
  const query = useInvitationQuery(current?.id ?? null)
  // A 404 means the invitation is gone or belongs to another account (e.g. after switching accounts in this tab).
  const unknown = query.error instanceof ApiError && query.error.errorCode === 'INVITATION_NOT_FOUND'
  const status = unknown ? undefined : query.data?.status
  const claimedGameId = status === 'CLAIMED' ? query.data?.gameId : undefined
  const finished = unknown || (status !== undefined && status !== 'OPEN')

  // Only an open invitation is worth restoring after a refresh.
  useEffect(() => {
    if (finished) {
      clearInvitation()
    }
  }, [finished])

  const openGame = useEffectEvent((gameId: number) => onClaimed(gameId))
  useEffect(() => {
    if (claimedGameId !== undefined) {
      openGame(claimedGameId)
    }
  }, [claimedGameId])

  function handleCreated(invitation: StoredInvitation) {
    saveInvitation(invitation)
    setCurrent(invitation)
  }

  function startOver() {
    clearInvitation()
    setCurrent(null)
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{messages.title}</h1>
      {current === null || unknown ? (
        <InvitationSetup onCreated={handleCreated} />
      ) : query.data ? (
        status === 'OPEN' ? (
          <WaitingForOpponent invitation={query.data} token={current.token} />
        ) : status === 'CLAIMED' ? null : (
          <div className="flex flex-col items-start gap-2">
            <p>{status === 'CANCELLED' ? messages.cancelled : messages.expired}</p>
            <Button onClick={startOver}>{messages.createNew}</Button>
          </div>
        )
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {errorMessages.generic}
          </p>
          <Button onClick={() => void query.refetch()}>{messages.retry}</Button>
        </div>
      ) : (
        <p>{messages.loading}</p>
      )}
    </section>
  )
}
