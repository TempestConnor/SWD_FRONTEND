import type { ReactNode } from 'react'

type RadioGroupProps = { legend: string; children: ReactNode }

export function RadioGroup({ legend, children }: RadioGroupProps) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex gap-4">{children}</div>
    </fieldset>
  )
}

type RadioProps = { name: string; label: string; checked: boolean; onChange: () => void }

export function Radio({ name, label, checked, onChange }: RadioProps) {
  return (
    <label className="flex items-center gap-2">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}
