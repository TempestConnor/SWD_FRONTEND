import { useState, type FormEvent } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { parseClockForm } from '../../../shared/lib/clock'
import { Button } from '../../../shared/ui/Button'
import { NumberField } from '../../../shared/ui/NumberField'
import type { LocalGame, StartLocalGameRequest } from '../api'
import { useStartLocalGameMutation } from '../hooks/useStartLocalGameMutation'
import { localGameMessages } from '../messages'

const messages = localGameMessages.setup

type FieldErrors = { initialMinutes?: string; incrementSeconds?: string }

type LocalGameSetupProps = {
  /** Shown above the form, e.g. why a saved game was dropped. */
  notice?: string
  onStarted: (game: LocalGame) => void
}

export function LocalGameSetup({ notice, onStarted }: LocalGameSetupProps) {
  const [clockEnabled, setClockEnabled] = useState(true)
  const [initialMinutes, setInitialMinutes] = useState('30')
  const [incrementSeconds, setIncrementSeconds] = useState('10')
  const [errors, setErrors] = useState<FieldErrors>({})
  const start = useStartLocalGameMutation()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = toRequest(clockEnabled, initialMinutes, incrementSeconds)
    setErrors(result.errors)
    if (result.body) {
      start.mutate(result.body, { onSuccess: onStarted })
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      {notice ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">{notice}</p> : null}
      <label className="flex cursor-pointer items-center gap-2 font-medium">
        <input type="checkbox" className="size-4 accent-brand" checked={clockEnabled} onChange={(event) => setClockEnabled(event.target.checked)} />
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
      {start.isError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {errorMessages.generic}
        </p>
      ) : null}
      <Button type="submit" disabled={start.isPending}>
        {start.isPending ? messages.starting : messages.start}
      </Button>
    </form>
  )
}

/** Maps the shared clock validation (BR-MOVE-011/012) to the local start request and its field errors. */
function toRequest(
  clockEnabled: boolean,
  initialMinutes: string,
  incrementSeconds: string,
): { body?: StartLocalGameRequest; errors: FieldErrors } {
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
    return { body: { clockEnabled: false }, errors: {} }
  }
  return {
    body: { clockEnabled: true, initialMinutes: clock.initialMinutes, incrementSeconds: clock.incrementSeconds },
    errors: {},
  }
}
