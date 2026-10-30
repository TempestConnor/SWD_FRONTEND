/** Every string the matchmaking feature shows. Components contain no literal copy. */
export const matchmakingMessages = {
  title: 'Play online',
  intro: 'Get paired with a player of similar rating.',
  find: 'Find opponent',
  joining: 'Joining…',
  searching: 'Searching for an opponent…',
  rating: (rating: number) => `Your rating: ${rating}`,
  keepOpen: 'Keep this page open while searching.',
  matched: 'Opponent found. Opening the game…',
  leave: 'Leave queue',
  leaving: 'Leaving…',
  left: 'You left the queue.',
  timedOut: 'Your search ended because the connection was lost.',
  connectionLost: 'Connection problem. Still trying to keep your place in the queue…',
  loading: 'Loading…',
  retry: 'Try again',
  unavailable: 'Matchmaking is not available right now. Please try again later.',
}
