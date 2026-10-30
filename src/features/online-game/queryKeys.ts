export const onlineGameKeys = {
  detail: (gameId: number) => ['online-game', gameId] as const,
  heartbeat: (gameId: number) => ['online-game', gameId, 'heartbeat'] as const,
}
