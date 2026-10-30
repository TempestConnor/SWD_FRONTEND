import { api } from '../../api/client'
import { unwrap } from '../../api/errors'
import type { components } from '../../api/schema'

export type StartLocalGameRequest = components['schemas']['StartLocalGameDTO']
export type LocalGame = components['schemas']['LocalGameDTO']
export type ClockSettings = components['schemas']['ClockSettingsDTO']
export type LocalPosition = components['schemas']['LocalPositionDTO']

/** Validates clock settings and returns the effective clock with the initial position. Nothing is persisted. */
export async function startLocalGame(body: StartLocalGameRequest): Promise<LocalGame> {
  return unwrap(await api.POST('/api/local-games', { body }))
}

/** The backend is stateless for local games: it replays the full UCI move list on every call. */
export async function getLocalPosition(moves: string[]): Promise<LocalPosition> {
  return unwrap(await api.POST('/api/local-games/state', { body: { moves } }))
}
