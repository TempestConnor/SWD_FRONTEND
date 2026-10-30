import { useState } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { Button } from '../../../shared/ui/Button'
import { Countdown } from '../../../shared/ui/Countdown'
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
  const cancel = useCancelInvitationMutation(invitation.id ?? 0)
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
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
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
            className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none"
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
      <p className="flex items-center gap-2 font-medium">
        <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-brand" />
        {messages.waiting}
      </p>
      <Countdown until={invitation.expiresAt} label={messages.expiresIn} />
      {cancelFailed ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {errorMessages.generic}
        </p>
      ) : null}
      <Button className="self-start" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
        {cancel.isPending ? messages.cancelling : messages.cancel}
      </Button>
    </div>
  )
}
