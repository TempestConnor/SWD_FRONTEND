import { useId, useState, type FormEvent } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { Button } from '../../../shared/ui/Button'
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
    <form onSubmit={handleSubmit} noValidate className="flex max-w-sm flex-col gap-4">
      {notice ? <p className="text-amber-800">{notice}</p> : null}
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
      {start.isError ? (
        <p role="alert" className="text-red-700">
          {errorMessages.generic}
        </p>
      ) : null}
      <Button type="submit" disabled={start.isPending}>
        {start.isPending ? messages.starting : messages.start}
      </Button>
    </form>
  )
}

type NumberFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  min: number
  max: number
  error?: string
}

function NumberField({ label, value, onChange, min, max, error }: NumberFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="rounded border border-gray-300 px-3 py-2 aria-invalid:border-red-600"
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Applies BR-MOVE-011/012: an enabled clock needs 5–120 minutes and 0–60 seconds; a disabled one sends no timing. */
function toRequest(
  clockEnabled: boolean,
  initialMinutes: string,
  incrementSeconds: string,
): { body?: StartLocalGameRequest; errors: FieldErrors } {
  if (!clockEnabled) {
    return { body: { clockEnabled: false }, errors: {} }
  }

  const minutes = Number(initialMinutes)
  const increment = Number(incrementSeconds)
  const errors: FieldErrors = {}
  if (initialMinutes.trim() === '' || !isIntegerBetween(minutes, 5, 120)) {
    errors.initialMinutes = messages.initialMinutesRange
  }
  if (incrementSeconds.trim() === '' || !isIntegerBetween(increment, 0, 60)) {
    errors.incrementSeconds = messages.incrementRange
  }
  if (errors.initialMinutes || errors.incrementSeconds) {
    return { errors }
  }
  return { body: { clockEnabled: true, initialMinutes: minutes, incrementSeconds: increment }, errors }
}

function isIntegerBetween(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max
}
