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
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-bold">{messages.title}</h1>
      {refusal ? (
        <>
          <p role="alert" className="text-red-700">
            {refusal}
          </p>
          <Link to="/" className="underline">
            {messages.home}
          </Link>
        </>
      ) : (
        <>
          <p>{messages.prompt}</p>
          {claim.isError ? (
            <p role="alert" className="text-red-700">
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
