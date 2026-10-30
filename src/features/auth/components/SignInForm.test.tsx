import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { getSession } from '../../../api/session'
import { renderWithClient } from '../../../test/utils'
import { signIn, type Account, type AuthToken } from '../api'
import { SignInForm } from './SignInForm'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  signIn: vi.fn(),
}))

const account: Account = {
  id: 7,
  email: 'alex@example.com',
  displayName: 'Alex',
  signupSkill: 'INTERMEDIATE',
  roles: ['PLAYER'],
  ratings: [{ mode: 'CLASSICAL', rating: 800 }],
}
const token: AuthToken = { accessToken: 'jwt', tokenType: 'Bearer', expiresAt: '2999-01-01T00:00:00Z', account }

function renderForm() {
  const onSignedIn = vi.fn()
  renderWithClient(<SignInForm onSignedIn={onSignedIn} />)
  return { onSignedIn, user: userEvent.setup() }
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'alex@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret123')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

describe('SignInForm', () => {
  it('signs in with email and password and stores the session', async () => {
    vi.mocked(signIn).mockResolvedValue(token)
    const { onSignedIn, user } = renderForm()

    await fillAndSubmit(user)

    expect(signIn).toHaveBeenCalledWith({ email: 'alex@example.com', password: 'secret123' })
    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(account))
    expect(getSession()?.accessToken).toBe('jwt')
  })

  it('shows that the email or password is incorrect', async () => {
    vi.mocked(signIn).mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS'))
    const { onSignedIn, user } = renderForm()

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/email or password is incorrect/i)
    expect(onSignedIn).not.toHaveBeenCalled()
    expect(getSession()).toBeNull()
  })

  it('maps validation violations onto their fields', async () => {
    vi.mocked(signIn).mockRejectedValue(
      new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: 'email', message: 'is required' }]),
    )
    const { user } = renderForm()

    await fillAndSubmit(user)

    await vi.waitFor(() => expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(/is required/))
  })

  it('shows a generic message for unexpected errors without exposing the server detail', async () => {
    vi.mocked(signIn).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'secret stack trace'))
    const { user } = renderForm()

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i)
    expect(screen.queryByText(/secret stack trace/)).not.toBeInTheDocument()
  })

  it('submits only once while signing in', async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => {}))
    const { user } = renderForm()

    await fillAndSubmit(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(signIn).toHaveBeenCalledTimes(1)
  })
})
