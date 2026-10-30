import { useId, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import type { Account } from '../api'
import { toFormErrors, type ErrorCodeMessages } from '../formErrors'
import { useSignUpMutation } from '../hooks/useSignUpMutation'
import { authMessages } from '../messages'
import { TextField } from './TextField'

type SignUpFormProps = { onSignedUp: (account: Account) => void }

// TODO(backend gap): the backend exposes no list of skills; this copies SkillLevel.java (BR-ACC-010).
const SKILLS = [
  { value: 'BEGINNER', rating: 400 },
  { value: 'INTERMEDIATE', rating: 800 },
  { value: 'ADVANCED', rating: 1200 },
  { value: 'EXPERT', rating: 1600 },
] as const

const FIELDS = ['email', 'password', 'displayName', 'signupSkill'] as const

const ERROR_CODES: ErrorCodeMessages<(typeof FIELDS)[number]> = {
  EMAIL_ALREADY_REGISTERED: { field: 'email', message: authMessages.errors.EMAIL_ALREADY_REGISTERED },
  DISPLAY_NAME_TAKEN: { field: 'displayName', message: authMessages.errors.DISPLAY_NAME_TAKEN },
  PASSWORD_TOO_LONG: { field: 'password', message: authMessages.errors.PASSWORD_TOO_LONG },
}

export function SignUpForm({ onSignedUp }: SignUpFormProps) {
  const signUp = useSignUpMutation()
  const errors = signUp.error ? toFormErrors(signUp.error, FIELDS, ERROR_CODES) : { fields: {} }
  const skillErrorId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (signUp.isPending) {
      return
    }

    const data = new FormData(event.currentTarget)
    signUp.mutate(
      {
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
        displayName: String(data.get('displayName') ?? ''),
        signupSkill: String(data.get('signupSkill') ?? ''),
      },
      { onSuccess: (account) => onSignedUp(account) },
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
        autoComplete="new-password"
        error={errors.fields.password}
      />
      <TextField
        label={authMessages.fields.displayName}
        name="displayName"
        autoComplete="username"
        error={errors.fields.displayName}
      />
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors.fields.signupSkill ? skillErrorId : undefined}
      >
        <legend className="mb-1 text-sm font-medium">{authMessages.fields.signupSkill}</legend>
        {SKILLS.map((skill) => (
          <label key={skill.value} className="flex items-center gap-2">
            <input type="radio" name="signupSkill" value={skill.value} required />
            <span>{authMessages.skills[skill.value]}</span>
            <span className="text-sm text-gray-500">{skill.rating}</span>
          </label>
        ))}
        {errors.fields.signupSkill ? (
          <p id={skillErrorId} className="text-sm text-red-700">
            {errors.fields.signupSkill}
          </p>
        ) : null}
      </fieldset>
      <Button type="submit" disabled={signUp.isPending}>
        {authMessages.actions.createAccount}
      </Button>
    </form>
  )
}
