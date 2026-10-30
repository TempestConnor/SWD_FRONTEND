import { api } from '../../api/client'
import { unwrap } from '../../api/errors'
import type { components } from '../../api/schema'

export type StartCpuGameRequest = components['schemas']['StartCpuGameDTO']
export type CpuMoveRequest = components['schemas']['CpuMoveRequestDTO']
export type CpuGameState = components['schemas']['CpuGameStateDTO']
export type CpuPosition = components['schemas']['LocalPositionDTO']

/** Resolves a RANDOM color; when the player is Black the answer already holds the CPU's opening move. */
export async function startCpuGame(body: StartCpuGameRequest): Promise<CpuGameState> {
  return unwrap(await api.POST('/api/cpu-games', { body }))
}

/** The backend is stateless for CPU games: it replays the full UCI move list and appends the CPU's reply. */
export async function playCpuMove(body: CpuMoveRequest): Promise<CpuGameState> {
  return unwrap(await api.POST('/api/cpu-games/cpu-move', { body }))
}

/** The CPU endpoints return no legal moves, so the board's legal moves come from the local-game replay. */
export async function getCpuPosition(moves: string[]): Promise<CpuPosition> {
  return unwrap(await api.POST('/api/local-games/state', { body: { moves } }))
}
