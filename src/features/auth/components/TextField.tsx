import { useId, type ComponentProps } from 'react'

type TextFieldProps = Pick<ComponentProps<'input'>, 'name' | 'type' | 'autoComplete'> & {
  label: string
  error?: string
}

/** A required labelled input whose error, when present, is its accessible description. */
export function TextField({ label, error, type = 'text', ...inputProps }: TextFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="rounded-lg border border-line bg-surface px-3 py-2 shadow-xs transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25 focus:outline-none aria-invalid:border-red-600"
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
