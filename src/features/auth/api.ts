import type { components } from '../../api/schema'

export type Account = components['schemas']['AccountDTO']
export type AuthToken = components['schemas']['AuthTokenDTO']
export type SignUpRequest = components['schemas']['CreateAccountDTO']
export type SignInRequest = components['schemas']['SignInDTO']

export const authKeys = {
  me: ['auth', 'me'] as const,
}

export async function signUp(_body: SignUpRequest): Promise<AuthToken> {
  throw new Error('not implemented')
}

export async function signIn(_body: SignInRequest): Promise<AuthToken> {
  throw new Error('not implemented')
}

export async function getCurrentAccount(): Promise<Account> {
  throw new Error('not implemented')
}
