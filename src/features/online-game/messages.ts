import type { Side } from '../../shared/lib/chess'

const sideNames: Record<Side, string> = { WHITE: 'White', BLACK: 'Black' }

/** Every string the online-game feature shows. Components contain no literal copy. */
export const onlineGameMessages = {
  title: 'Online game',
  loading: 'Loading game…',
  retry: 'Try again',
  notFound: 'This game was not found.',
  player: (side: Side, name: string) => `${sideNames[side]}: ${name}`,
  viewerColor: (side: Side) => `You play ${sideNames[side]}`,
  status: {
    PENDING: 'Waiting for both players to get ready.',
    ACTIVE: 'The game has started.',
    CANCELLED:
      'This game was cancelled before it started. It has no result and does not count toward your rating or history.',
  } as Partial<Record<string, string>>,
  ready: 'Ready',
  cancel: 'Cancel game',
  playerReady: (name: string) => `${name} is ready`,
  playerNotReady: (name: string) => `${name} is not ready yet`,
  viewerReady: 'You are ready. Waiting for your opponent.',
  readyCountdown: (remaining: string) => `Time left to get ready: ${remaining}`,
  alreadyStarted: 'The game had already started, so it was not cancelled.',
}
