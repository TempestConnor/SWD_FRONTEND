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
  } as Partial<Record<string, string>>,
}
