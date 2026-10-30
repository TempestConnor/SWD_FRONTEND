import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { renderWithClient } from '../test/utils'
import { routes } from './router'
import { SessionProvider } from './SessionProvider'

afterEach(() => {
  localStorage.clear()
})

describe('cpu game route', () => {
  it('lets a guest open a game against the CPU from the home page', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    renderWithClient(
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Play the computer' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/cpu'))
    expect(await screen.findByRole('heading', { name: 'Play the computer' })).toBeInTheDocument()
  })
})
