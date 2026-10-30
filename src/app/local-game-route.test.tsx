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

describe('local game route', () => {
  it('lets a guest open local hot-seat chess from the home page', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    renderWithClient(
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>,
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Play on this device' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/local'))
    expect(await screen.findByRole('heading', { name: 'Local game' })).toBeInTheDocument()
  })
})
