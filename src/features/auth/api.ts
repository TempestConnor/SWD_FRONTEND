import { api } from '../../api/client'
import { unwrap } from '../../api/errors'
import type { components } from '../../api/schema'

export type Account = components['schemas']['AccountDTO']
export type AuthToken = components['schemas']['AuthTokenDTO']
export type SignUpRequest = components['schemas']['CreateAccountDTO']
export type SignInRequest = components['schemas']['SignInDTO']

export const authKeys = {
  me: ['auth', 'me'] as const,
}

export async function signUp(body: SignUpRequest): Promise<AuthToken> {
  return unwrap(await api.POST('/api/accounts/signup', { body }))
}

export async function signIn(body: SignInRequest): Promise<AuthToken> {
  return unwrap(await api.POST('/api/accounts/signin', { body }))
}

export async function getCurrentAccount(): Promise<Account> {
  return unwrap(await api.GET('/api/accounts/me'))
}
