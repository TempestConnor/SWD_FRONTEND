import type { components } from '../../api/schema'

export type StartLocalGameRequest = components['schemas']['StartLocalGameDTO']
export type LocalGame = components['schemas']['LocalGameDTO']
export type ClockSettings = components['schemas']['ClockSettingsDTO']
export type LocalPosition = components['schemas']['LocalPositionDTO']

export async function startLocalGame(_body: StartLocalGameRequest): Promise<LocalGame> {
  throw new Error('not implemented')
}

export async function getLocalPosition(_moves: string[]): Promise<LocalPosition> {
  throw new Error('not implemented')
}
