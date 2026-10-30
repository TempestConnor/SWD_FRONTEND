import { api } from '../../api/client'
import { unwrap } from '../../api/errors'
import type { components } from '../../api/schema'

export type MatchHistoryEntry = components['schemas']['MatchHistoryEntryDTO']
export type MatchHistoryPage = components['schemas']['PageResponseMatchHistoryEntryDTO']
export type HistoryGame = components['schemas']['MatchHistoryDetailDTO']
export type RatingChange = components['schemas']['RatingChangeDTO']

/** The backend's default; it clamps anything above 100. */
export const MATCH_HISTORY_PAGE_SIZE = 20

/** The caller's completed online games, newest first; `page` is zero-based. The server ignores any sort. */
export async function getMatchHistory(page: number): Promise<MatchHistoryPage> {
  return unwrap(await api.GET('/api/match-history', { params: { query: { page, size: MATCH_HISTORY_PAGE_SIZE } } }))
}

/**
 * One completed game with both players, their rating changes and the moves. A non-participant gets 404
 * ONLINE_GAME_NOT_FOUND; a participant whose game has not finished gets 404 GAME_NOT_IN_HISTORY.
 */
export async function getHistoryGame(gameId: number): Promise<HistoryGame> {
  return unwrap(await api.GET('/api/match-history/{gameId}', { params: { path: { gameId } } }))
}
