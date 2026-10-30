import { useEffect, useState } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { formatClock } from '../../../shared/lib/clock'
import { Button } from '../../../shared/ui/Button'
import { GameTerms } from '../../../shared/ui/GameTerms'
import type { Invitation } from '../api'
import { useCancelInvitationMutation } from '../hooks/useCancelInvitationMutation'
import { invitationMessages } from '../messages'

const messages = invitationMessages.host

/** A cancel that lost a race with a claim or with expiry; the refreshed status shows what happened instead. */
const LOST_RACE = new Set(['INVITATION_ALREADY_CLAIMED', 'INVITATION_EXPIRED'])

type WaitingForOpponentProps = {
  invitation: Invitation
  token: string
}

/** An open invitation: the link to share, its remaining lifetime, and a way to cancel it. */
export function WaitingForOpponent({ invitation, token }: WaitingForOpponentProps) {
  const link = `${window.location.origin}/invite/${token}`
  const [copied, setCopied] = useState(false)
  const now = useNow()
  const cancel = useCancelInvitationMutation(invitation.id ?? 0)
  const remainingMs = invitation.expiresAt ? Date.parse(invitation.expiresAt) - now : 0
  const cancelFailed = cancel.isError && !(cancel.error instanceof ApiError && LOST_RACE.has(cancel.error.errorCode))

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Clipboard access can be denied; the link stays selectable in the field.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="invitation-link" className="text-sm font-medium">
          {messages.link}
        </label>
        <div className="flex gap-2">
          <input
            id="invitation-link"
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
            className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 font-mono text-sm"
          />
          <Button onClick={() => void handleCopy()}>{messages.copy}</Button>
        </div>
        {copied ? (
          <p role="status" className="text-sm text-green-700">
            {messages.copied}
          </p>
        ) : null}
      </div>
      <GameTerms rated={invitation.rated ?? false} clock={invitation.clock} />
      <p>{messages.waiting}</p>
      <p className="text-sm text-gray-700">{messages.expiresIn(formatClock(remainingMs))}</p>
      {cancelFailed ? (
        <p role="alert" className="text-red-700">
          {errorMessages.generic}
        </p>
      ) : null}
      <Button className="self-start" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
        {cancel.isPending ? messages.cancelling : messages.cancel}
      </Button>
    </div>
  )
}

/** The current time, refreshed every second for the expiry countdown. */
function useNow() {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [])

  return now
}
