import { useState, type FormEvent } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { parseClockForm } from '../../../shared/lib/clock'
import { Button } from '../../../shared/ui/Button'
import { NumberField } from '../../../shared/ui/NumberField'
import { Radio, RadioGroup } from '../../../shared/ui/RadioGroup'
import type { CreateInvitationRequest } from '../api'
import { useCreateInvitationMutation } from '../hooks/useCreateInvitationMutation'
import { invitationMessages } from '../messages'
import type { StoredInvitation } from '../storage'

const messages = invitationMessages.host

type ColorChoice = keyof typeof messages.colors

const colors: ColorChoice[] = ['WHITE', 'BLACK', 'RANDOM']

type FieldErrors = { initialMinutes?: string; incrementSeconds?: string }

type InvitationSetupProps = {
  onCreated: (invitation: StoredInvitation) => void
}

export function InvitationSetup({ onCreated }: InvitationSetupProps) {
  const [color, setColor] = useState<ColorChoice>('RANDOM')
  const [clockEnabled, setClockEnabled] = useState(true)
  const [initialMinutes, setInitialMinutes] = useState('30')
  const [incrementSeconds, setIncrementSeconds] = useState('10')
  const [errors, setErrors] = useState<FieldErrors>({})
  const create = useCreateInvitationMutation()
  // BR-GAME-009/010: only the untouched 30+10 clock is rated. The backend decides; this is a preview.
  const rated = clockEnabled && Number(initialMinutes) === 30 && Number(incrementSeconds) === 10

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (create.isPending) {
      return
    }
    const result = toRequest(color, clockEnabled, initialMinutes, incrementSeconds)
    setErrors(result.errors)
    if (!result.body) {
      return
    }
    create.mutate(result.body, {
      onSuccess: ({ token, invitation }) => {
        if (token && invitation?.id !== undefined) {
          onCreated({ id: invitation.id, token })
        }
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-sm flex-col gap-4">
      <RadioGroup legend={messages.color}>
        {colors.map((value) => (
          <Radio
            key={value}
            name="color"
            label={messages.colors[value]}
            checked={color === value}
            onChange={() => setColor(value)}
          />
        ))}
      </RadioGroup>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={clockEnabled} onChange={(event) => setClockEnabled(event.target.checked)} />
        {messages.useClock}
      </label>
      {clockEnabled ? (
        <>
          <NumberField
            label={messages.initialMinutes}
            value={initialMinutes}
            onChange={setInitialMinutes}
            min={5}
            max={120}
            error={errors.initialMinutes}
          />
          <NumberField
            label={messages.incrementSeconds}
            value={incrementSeconds}
            onChange={setIncrementSeconds}
            min={0}
            max={60}
            error={errors.incrementSeconds}
          />
        </>
      ) : null}
      <p className="text-sm text-gray-700">{rated ? messages.rated : messages.unrated}</p>
      {create.isError ? (
        <p role="alert" className="text-red-700">
          {errorMessages.generic}
        </p>
      ) : null}
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? messages.creating : messages.create}
      </Button>
    </form>
  )
}

/** Maps the shared clock validation (BR-MOVE-011/012) to the create request and its field errors. */
function toRequest(
  hostColor: ColorChoice,
  clockEnabled: boolean,
  initialMinutes: string,
  incrementSeconds: string,
): { body?: CreateInvitationRequest; errors: FieldErrors } {
  const { clock, invalid } = parseClockForm(clockEnabled, initialMinutes, incrementSeconds)
  if (invalid) {
    return {
      errors: {
        initialMinutes: invalid.initialMinutes ? messages.initialMinutesRange : undefined,
        incrementSeconds: invalid.incrementSeconds ? messages.incrementRange : undefined,
      },
    }
  }
  if (!clock.enabled) {
    return { body: { hostColor, clockEnabled: false }, errors: {} }
  }
  return {
    body: {
      hostColor,
      clockEnabled: true,
      initialMinutes: clock.initialMinutes,
      incrementSeconds: clock.incrementSeconds,
    },
    errors: {},
  }
}
