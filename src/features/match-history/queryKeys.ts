export const matchHistoryKeys = {
  page: (page: number) => ['match-history', 'page', page] as const,
  game: (gameId: number) => ['match-history', 'game', gameId] as const,
}
