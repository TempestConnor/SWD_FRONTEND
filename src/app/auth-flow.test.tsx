import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { clearSession, getSession, saveSession } from '../api/session'
import { getCurrentAccount, signIn, signUp, type Account, type AuthToken } from '../features/auth/api'
import { renderWithClient } from '../test/utils'
import { routes } from './router'
import { SessionProvider } from './SessionProvider'

vi.mock('../features/auth/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/auth/api')>()),
  signIn: vi.fn(),
  signUp: vi.fn(),
  getCurrentAccount: vi.fn(),
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

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  renderWithClient(
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>,
  )
  return { router, user: userEvent.setup() }
}

function banner() {
  return within(screen.getByRole('banner'))
}

afterEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
})

describe('sign-in flow', () => {
  it('offers sign in and sign up to a guest without calling the account endpoint', async () => {
    renderApp()

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(banner().getByRole('link', { name: 'Sign up' })).toBeInTheDocument()
    expect(banner().queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    expect(getCurrentAccount).not.toHaveBeenCalled()
  })

  it('opens the sign-up form from the header', async () => {
    const { user } = renderApp()

    await user.click(await screen.findByRole('link', { name: 'Sign up' }))

    expect(await screen.findByLabelText('Display name')).toBeInTheDocument()
  })

  it('signs in and returns home showing the display name and rating', async () => {
    vi.mocked(signIn).mockResolvedValue(token)
    vi.mocked(getCurrentAccount).mockResolvedValue(account)
    const { router, user } = renderApp('/signin')

    await user.type(await screen.findByLabelText('Email'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await banner().findByText('Alex')).toBeInTheDocument()
    expect(banner().getByText(/800/)).toBeInTheDocument()
  })

  it('shows the starting rating 800 after a new Intermediate signup', async () => {
    vi.mocked(signUp).mockResolvedValue(token)
    vi.mocked(getCurrentAccount).mockResolvedValue(account)
    const { router, user } = renderApp('/signup')

    await user.type(await screen.findByLabelText('Email'), 'alex@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.type(screen.getByLabelText('Display name'), 'Alex')
    await user.click(screen.getByRole('radio', { name: /Intermediate/ }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await banner().findByText(/800/)).toBeInTheDocument()
  })

  it('restores the signed-in session after a refresh', async () => {
    saveSession(token)
    vi.mocked(getCurrentAccount).mockResolvedValue(account)

    renderApp()

    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(banner().getByText('Alex')).toBeInTheDocument()
  })

  it('shows the current rating from the server rather than the stored one', async () => {
    saveSession(token)
    vi.mocked(getCurrentAccount).mockResolvedValue({ ...account, ratings: [{ mode: 'CLASSICAL', rating: 812 }] })

    renderApp()

    expect(await screen.findByText(/812/)).toBeInTheDocument()
    expect(banner().queryByText(/800/)).not.toBeInTheDocument()
  })

  it('falls back to guest when the stored token is rejected', async () => {
    saveSession(token)
    // The client middleware clears the session on a rejected token; the mocked api module stands in for it.
    vi.mocked(getCurrentAccount).mockImplementation(async () => {
      clearSession()
      throw new ApiError(401, 'CURRENT_ACCOUNT_NOT_FOUND')
    })

    renderApp()

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(banner().queryByText('Alex')).not.toBeInTheDocument()
  })

  it('signs out and clears the stored session', async () => {
    saveSession(token)
    vi.mocked(getCurrentAccount).mockResolvedValue(account)
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(getSession()).toBeNull()
  })
})
