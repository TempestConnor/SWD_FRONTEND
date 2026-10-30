import type { components } from '../../api/schema'

export type OnlineGame = components['schemas']['OnlineGameDTO']

export async function getOnlineGame(_gameId: number): Promise<OnlineGame> {
  throw new Error('not implemented')
}
