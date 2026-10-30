import type { ReactNode } from 'react'

type RadioGroupProps = { legend: string; children: ReactNode }

export function RadioGroup({ legend, children }: RadioGroupProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

type RadioProps = { name: string; label: string; checked: boolean; onChange: () => void }

export function Radio({ name, label, checked, onChange }: RadioProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-line transition-colors hover:bg-paper has-checked:bg-brand-soft has-checked:ring-brand has-focus-visible:outline-2 has-focus-visible:outline-brand">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-brand" />
      {label}
    </label>
  )
}
