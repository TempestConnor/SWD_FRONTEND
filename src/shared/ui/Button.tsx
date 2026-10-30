import type { ComponentProps } from 'react'

const variants = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-strong',
  secondary: 'bg-surface text-ink ring-1 ring-line hover:bg-paper',
}

const sizes = {
  md: 'px-4 py-2',
  sm: 'px-3 py-1.5 text-sm',
}

type ButtonProps = ComponentProps<'button'> & { variant?: keyof typeof variants; size?: keyof typeof sizes }

export function Button({ className = '', type = 'button', variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
