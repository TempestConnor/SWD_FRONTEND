import { useId } from 'react'

type NumberFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  min: number
  max: number
  error?: string
}

export function NumberField({ label, value, onChange, min, max, error }: NumberFieldProps) {
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
        className="rounded-lg border border-line bg-surface px-3 py-2 shadow-xs transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none aria-invalid:border-red-600"
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
