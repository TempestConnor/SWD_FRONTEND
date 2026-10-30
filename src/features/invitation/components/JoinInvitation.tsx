import { Link } from 'react-router'
import { errorMessages } from '../../../api/errorMessages'
import { ApiError } from '../../../api/errors'
import { Button } from '../../../shared/ui/Button'
import { useClaimInvitationMutation } from '../hooks/useClaimInvitationMutation'
import { invitationMessages } from '../messages'

const messages = invitationMessages.join

type JoinInvitationProps = {
  token: string
  onJoined: (gameId: number) => void
}

/** The joiner's side of F04: claim the open seat behind a link, or learn why it cannot be claimed. */
export function JoinInvitation({ token, onJoined }: JoinInvitationProps) {
  const claim = useClaimInvitationMutation()
  const refusal = claim.error instanceof ApiError ? messages.refusals[claim.error.errorCode] : undefined

  function handleJoin() {
    if (claim.isPending) {
      return
    }
    claim.mutate(token, {
      onSuccess: (game) => {
        if (game.id !== undefined) {
          onJoined(game.id)
        }
      },
    })
  }

  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{messages.title}</h1>
      {refusal ? (
        <>
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {refusal}
          </p>
          <Link to="/" className="font-medium text-brand underline-offset-4 hover:underline">
            {messages.home}
          </Link>
        </>
      ) : (
        <>
          <p>{messages.prompt}</p>
          {claim.isError ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
              {errorMessages.generic}
            </p>
          ) : null}
          <Button onClick={handleJoin} disabled={claim.isPending}>
            {claim.isPending ? messages.joining : messages.join}
          </Button>
        </>
      )}
    </section>
  )
}
