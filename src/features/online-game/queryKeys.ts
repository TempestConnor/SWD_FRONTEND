export const onlineGameKeys = {
  detail: (gameId: number) => ['online-game', gameId] as const,
  heartbeat: (gameId: number) => ['online-game', gameId, 'heartbeat'] as const,
  moves: (gameId: number, lastPly: number) => ['online-game', gameId, 'moves', lastPly] as const,
}
