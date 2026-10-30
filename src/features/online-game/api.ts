import { api } from '../../api/client'
import { unwrap } from '../../api/errors'
import type { components } from '../../api/schema'

export type OnlineGame = components['schemas']['OnlineGameDTO']

/** Participant-only: anyone else gets 404 ONLINE_GAME_NOT_FOUND. */
export async function getOnlineGame(gameId: number): Promise<OnlineGame> {
  return unwrap(await api.GET('/api/online-games/{gameId}', { params: { path: { gameId } } }))
}

export async function markReady(_gameId: number): Promise<OnlineGame> {
  throw new Error('not implemented')
}

export async function cancelOnlineGame(_gameId: number): Promise<OnlineGame> {
  throw new Error('not implemented')
}

export async function heartbeatOnlineGame(_gameId: number): Promise<OnlineGame> {
  throw new Error('not implemented')
}
