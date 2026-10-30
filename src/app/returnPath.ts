/** Where to go back to after signing in, carried in the location state of /signin and /signup. */
export type ReturnState = { from: string }

/** The page to return to after signing in; only same-site paths, so the state cannot redirect elsewhere. */
export function returnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
      return from
    }
  }
  return '/'
}
