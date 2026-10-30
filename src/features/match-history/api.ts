import type { components } from '../../api/schema'

export type MatchHistoryEntry = components['schemas']['MatchHistoryEntryDTO']
export type MatchHistoryPage = components['schemas']['PageResponseMatchHistoryEntryDTO']
export type HistoryGame = components['schemas']['MatchHistoryDetailDTO']
export type RatingChange = components['schemas']['RatingChangeDTO']

export const MATCH_HISTORY_PAGE_SIZE = 20

export async function getMatchHistory(_page: number): Promise<MatchHistoryPage> {
  throw new Error('not implemented')
}

export async function getHistoryGame(_gameId: number): Promise<HistoryGame> {
  throw new Error('not implemented')
}
