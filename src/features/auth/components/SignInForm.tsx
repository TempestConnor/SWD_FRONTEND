import type { FormEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import type { Account } from '../api'
import { toFormErrors, type ErrorCodeMessages } from '../formErrors'
import { useSignInMutation } from '../hooks/useSignInMutation'
import { authMessages } from '../messages'
import { TextField } from './TextField'

type SignInFormProps = { onSignedIn: (account: Account) => void }

const FIELDS = ['email', 'password'] as const

const ERROR_CODES: ErrorCodeMessages<(typeof FIELDS)[number]> = {
  INVALID_CREDENTIALS: { message: authMessages.errors.INVALID_CREDENTIALS },
}

export function SignInForm({ onSignedIn }: SignInFormProps) {
  const signIn = useSignInMutation()
  const errors = signIn.error ? toFormErrors(signIn.error, FIELDS, ERROR_CODES) : { fields: {} }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (signIn.isPending) {
      return
    }

    const data = new FormData(event.currentTarget)
    signIn.mutate(
      { email: String(data.get('email') ?? ''), password: String(data.get('password') ?? '') },
      { onSuccess: (account) => onSignedIn(account) },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {errors.form ? (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
          {errors.form}
        </p>
      ) : null}
      <TextField
        label={authMessages.fields.email}
        name="email"
        type="email"
        autoComplete="email"
        error={errors.fields.email}
      />
      <TextField
        label={authMessages.fields.password}
        name="password"
        type="password"
        autoComplete="current-password"
        error={errors.fields.password}
      />
      <Button type="submit" disabled={signIn.isPending}>
        {authMessages.actions.signIn}
      </Button>
    </form>
  )
}
