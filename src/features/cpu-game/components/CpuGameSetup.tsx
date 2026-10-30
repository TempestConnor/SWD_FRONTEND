import { useState, type FormEvent, type ReactNode } from 'react'
import { errorMessages } from '../../../api/errorMessages'
import { toSide } from '../../../shared/lib/chess'
import { initialMs, parseClockForm } from '../../../shared/lib/clock'
import { Button } from '../../../shared/ui/Button'
import { NumberField } from '../../../shared/ui/NumberField'
import { useStartCpuGameMutation } from '../hooks/useStartCpuGameMutation'
import { cpuGameMessages } from '../messages'
import type { Difficulty, StoredCpuGame } from '../storage'

const messages = cpuGameMessages.setup

type ColorChoice = keyof typeof messages.colors

const difficulties: Difficulty[] = ['EASY', 'MEDIUM', 'HARD']
const colors: ColorChoice[] = ['WHITE', 'BLACK', 'RANDOM']

type FieldErrors = { initialMinutes?: string; incrementSeconds?: string }

type CpuGameSetupProps = {
  /** Shown above the form, e.g. why a saved game was dropped. */
  notice?: string
  onStarted: (game: StoredCpuGame) => void
}

export function CpuGameSetup({ notice, onStarted }: CpuGameSetupProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM')
  const [color, setColor] = useState<ColorChoice>('WHITE')
  const [clockEnabled, setClockEnabled] = useState(true)
  const [initialMinutes, setInitialMinutes] = useState('30')
  const [incrementSeconds, setIncrementSeconds] = useState('10')
  const [errors, setErrors] = useState<FieldErrors>({})
  const start = useStartCpuGameMutation()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { clock, invalid } = parseClockForm(clockEnabled, initialMinutes, incrementSeconds)
    setErrors({
      initialMinutes: invalid?.initialMinutes ? messages.initialMinutesRange : undefined,
      incrementSeconds: invalid?.incrementSeconds ? messages.incrementRange : undefined,
    })
    if (!clock) {
      return
    }
    // The CPU endpoints know nothing about clocks; the clock lives only in the browser.
    start.mutate(
      { difficulty, playerColor: color },
      {
        onSuccess: ({ state, moves }) =>
          onStarted({
            difficulty,
            playerColor: toSide(state.playerColor),
            clock,
            moves,
            remainingMs: initialMs(clock),
            timedOut: false,
            savedAt: Date.now(),
          }),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-sm flex-col gap-4">
      {notice ? <p className="text-amber-800">{notice}</p> : null}
      <RadioGroup legend={messages.difficulty}>
        {difficulties.map((value) => (
          <Radio
            key={value}
            name="difficulty"
            label={messages.difficulties[value]}
            checked={difficulty === value}
            onChange={() => setDifficulty(value)}
          />
        ))}
      </RadioGroup>
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

function RadioGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex gap-4">{children}</div>
    </fieldset>
  )
}

type RadioProps = { name: string; label: string; checked: boolean; onChange: () => void }

function Radio({ name, label, checked, onChange }: RadioProps) {
  return (
    <label className="flex items-center gap-2">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}
