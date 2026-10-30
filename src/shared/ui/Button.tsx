import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<'button'>

export function Button({ className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
