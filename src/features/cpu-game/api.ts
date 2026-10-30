import type { components } from '../../api/schema'

export type StartCpuGameRequest = components['schemas']['StartCpuGameDTO']
export type CpuMoveRequest = components['schemas']['CpuMoveRequestDTO']
export type CpuGameState = components['schemas']['CpuGameStateDTO']
export type CpuPosition = components['schemas']['LocalPositionDTO']

export async function startCpuGame(_body: StartCpuGameRequest): Promise<CpuGameState> {
  throw new Error('not implemented')
}

export async function playCpuMove(_body: CpuMoveRequest): Promise<CpuGameState> {
  throw new Error('not implemented')
}

export async function getCpuPosition(_moves: string[]): Promise<CpuPosition> {
  throw new Error('not implemented')
}
