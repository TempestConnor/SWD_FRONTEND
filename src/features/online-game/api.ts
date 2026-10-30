import { api } from '../../api/client'
import { unwrap } from '../../api/errors'
import type { components } from '../../api/schema'

export type OnlineGame = components['schemas']['OnlineGameDTO']

/** Participant-only: anyone else gets 404 ONLINE_GAME_NOT_FOUND. */
export async function getOnlineGame(gameId: number): Promise<OnlineGame> {
  return unwrap(await api.GET('/api/online-games/{gameId}', { params: { path: { gameId } } }))
}

/** Idempotent; the second Ready before the deadline starts the game. A non-pending game comes back unchanged. */
export async function markReady(gameId: number): Promise<OnlineGame> {
  return unwrap(await api.POST('/api/online-games/{gameId}/ready', { params: { path: { gameId } } }))
}

/** Pre-start only: a started game answers 409 ONLINE_GAME_ALREADY_STARTED. */
export async function cancelOnlineGame(gameId: number): Promise<OnlineGame> {
  return unwrap(await api.POST('/api/online-games/{gameId}/cancel', { params: { path: { gameId } } }))
}

/** Tells the server the viewer is still here and returns the game, so it doubles as the poll. */
export async function heartbeatOnlineGame(gameId: number): Promise<OnlineGame> {
  return unwrap(await api.POST('/api/online-games/{gameId}/heartbeat', { params: { path: { gameId } } }))
}

export type GameMove = components['schemas']['GameMoveDTO']
export type MoveSubmission = components['schemas']['MakeMoveDTO']

/**
 * `ply` must be the game's `lastPly + 1`. Resending the move already accepted at that ply returns the game;
 * any other rejection (ILLEGAL_MOVE, NOT_YOUR_TURN, MOVE_OUT_OF_SEQUENCE, ...) changes nothing on the server.
 */
export async function makeMove(gameId: number, submission: MoveSubmission): Promise<OnlineGame> {
  return unwrap(
    await api.POST('/api/online-games/{gameId}/moves', { params: { path: { gameId } }, body: submission }),
  )
}

/** The accepted moves in ply order. */
export async function getMoves(gameId: number): Promise<GameMove[]> {
  return unwrap(await api.GET('/api/online-games/{gameId}/moves', { params: { path: { gameId } } }))
}

/** Ends an active game as the caller's loss, on either turn. A game whose flag already fell comes back as that timeout. */
export async function resignOnlineGame(gameId: number): Promise<OnlineGame> {
  return unwrap(await api.POST('/api/online-games/{gameId}/resign', { params: { path: { gameId } } }))
}

/**
 * Proposes abandoning an active game, or agrees to the opponent's proposal, which ends it as a draw. A vote is
 * permanent; repeating it returns the game.
 */
export async function voteToAbandon(gameId: number): Promise<OnlineGame> {
  return unwrap(await api.POST('/api/online-games/{gameId}/abandon', { params: { path: { gameId } } }))
}
