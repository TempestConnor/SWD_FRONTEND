import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { clearSession, getSession } from './session'

export const authMiddleware: Middleware = {
  onRequest({ request }) {
    const session = getSession()
    if (session) {
      request.headers.set('Authorization', `Bearer ${session.accessToken}`)
    }
    return request
  },
  onResponse({ request, response }) {
    // A rejected token means the session is no longer valid; guests never send one.
    if (response.status === 401 && request.headers.has('Authorization')) {
      clearSession()
    }
    return response
  },
}

/** The one typed client for the backend. Paths are relative; Vite proxies /api in development. */
export const api = createClient<paths>({ baseUrl: '' })

api.use(authMiddleware)
