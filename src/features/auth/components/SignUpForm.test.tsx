import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/errors'
import { getSession } from '../../../api/session'
import { renderWithClient } from '../../../test/utils'
import { signUp, type Account, type AuthToken } from '../api'
import { SignUpForm } from './SignUpForm'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  signUp: vi.fn(),
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
  const onSignedUp = vi.fn()
  renderWithClient(<SignUpForm onSignedUp={onSignedUp} />)
  return { onSignedUp, user: userEvent.setup() }
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, displayName = 'Alex') {
  await user.type(screen.getByLabelText('Email'), 'alex@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret123')
  await user.type(screen.getByLabelText('Display name'), displayName)
  await user.click(screen.getByRole('radio', { name: /Intermediate/ }))
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

describe('SignUpForm', () => {
  it('offers the four skill levels with their starting ratings', () => {
    renderForm()

    expect(screen.getByRole('radio', { name: /Beginner.*400/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Intermediate.*800/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Advanced.*1200/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Expert.*1600/ })).toBeInTheDocument()
  })

  it('registers with email, password, display name and skill, then signs in', async () => {
    vi.mocked(signUp).mockResolvedValue(token)
    const { onSignedUp, user } = renderForm()

    await fillAndSubmit(user)

    expect(signUp).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'secret123',
      displayName: 'Alex',
      signupSkill: 'INTERMEDIATE',
    })
    await vi.waitFor(() => expect(onSignedUp).toHaveBeenCalledWith(account))
    expect(getSession()?.accessToken).toBe('jwt')
  })

  it('sends the display name with its case unchanged', async () => {
    vi.mocked(signUp).mockResolvedValue(token)
    const { user } = renderForm()

    await fillAndSubmit(user, 'aLeX')

    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'aLeX' }))
  })

  it('shows an email conflict on the email field', async () => {
    vi.mocked(signUp).mockRejectedValue(new ApiError(409, 'EMAIL_ALREADY_REGISTERED'))
    const { onSignedUp, user } = renderForm()

    await fillAndSubmit(user)

    await vi.waitFor(() => expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(/already exists/i))
    expect(onSignedUp).not.toHaveBeenCalled()
    expect(getSession()).toBeNull()
  })

  it('shows a display-name conflict on the display name field', async () => {
    vi.mocked(signUp).mockRejectedValue(new ApiError(409, 'DISPLAY_NAME_TAKEN'))
    const { user } = renderForm()

    await fillAndSubmit(user)

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Display name')).toHaveAccessibleDescription(/already taken/i),
    )
  })

  it('shows a too-long password on the password field', async () => {
    vi.mocked(signUp).mockRejectedValue(new ApiError(400, 'PASSWORD_TOO_LONG'))
    const { user } = renderForm()

    await fillAndSubmit(user)

    await vi.waitFor(() => expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(/too long/i))
  })

  it('maps validation violations onto their fields', async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(400, 'VALIDATION_FAILED', 'Request validation failed.', [
        { field: 'password', message: 'must be between 8 and 72 characters' },
        { field: 'displayName', message: 'must use single spaces between words and no other whitespace' },
      ]),
    )
    const { user } = renderForm()

    await fillAndSubmit(user)

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(/must be between 8 and 72 characters/),
    )
    expect(screen.getByLabelText('Display name')).toHaveAccessibleDescription(/must use single spaces between words/)
  })

  it('shows a generic message for unexpected errors without exposing the server detail', async () => {
    vi.mocked(signUp).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'secret stack trace'))
    const { user } = renderForm()

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i)
    expect(screen.queryByText(/secret stack trace/)).not.toBeInTheDocument()
  })

  it('submits only once while registration is in progress', async () => {
    vi.mocked(signUp).mockReturnValue(new Promise(() => {}))
    const { user } = renderForm()

    await fillAndSubmit(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled()
    expect(signUp).toHaveBeenCalledTimes(1)
  })
})
