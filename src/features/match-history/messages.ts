import type { Side } from '../../shared/lib/chess'
import type { RatingChange } from './api'

const sideNames: Record<Side, string> = { WHITE: 'White', BLACK: 'Black' }

/** "+12", "0" or "-12". */
function signed(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta)
}

function ratingMove({ ratingBefore = 0, ratingAfter = 0, ratingDelta = 0 }: RatingChange) {
  return `${ratingBefore} → ${ratingAfter} (${signed(ratingDelta)})`
}

/** Every string the match-history feature shows. Components contain no literal copy. */
export const matchHistoryMessages = {
  title: 'Match history',
  loading: 'Loading match history…',
  retry: 'Try again',
  empty: 'You have no finished online games yet.',
  opponent: (name: string) => `vs ${name}`,
  viewGame: (name: string) => `View game against ${name}`,
  pageStatus: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
  previousPage: 'Previous page',
  nextPage: 'Next page',
  viewerRating: (change: RatingChange) => `Rating ${ratingMove(change)}`,
  source: { INVITE: 'Invitation', MATCHMAKING: 'Matchmaking' } as Partial<Record<string, string>>,
  result: { WIN: 'Win', LOSS: 'Loss', DRAW: 'Draw' } as Partial<Record<string, string>>,
  /** Decisive endings by termination reason, from the viewer's side. */
  decisiveReason: {
    CHECKMATE: { win: 'You won by checkmate', loss: 'You lost by checkmate' },
    RESIGNATION: { win: 'Your opponent resigned', loss: 'You resigned' },
    TIMEOUT: { win: 'Your opponent ran out of time', loss: 'You ran out of time' },
    DISCONNECT: { win: 'Your opponent disconnected and forfeited', loss: 'You disconnected and forfeited' },
  } as Partial<Record<string, { win: string; loss: string }>>,
  drawReason: {
    STALEMATE: 'Stalemate',
    REPETITION: 'Threefold repetition',
    MOVE_COUNT: 'Fifty-move rule',
    INSUFFICIENT_MATERIAL: 'Insufficient material',
    AGREEMENT: 'Draw by agreement',
    MUTUAL_ABANDONMENT: 'Abandoned by agreement',
  } as Partial<Record<string, string>>,
  detail: {
    title: (white: string, black: string) => `${white} vs ${black}`,
    player: (side: Side, name: string) => `${sideNames[side]}: ${name}`,
    viewerColor: (side: Side) => `You played ${sideNames[side]}`,
    playerRating: (name: string, change: RatingChange) => `${name}: rating ${ratingMove(change)}`,
    finalPosition: 'Final position',
    back: 'Back to match history',
    notFound: 'This game was not found.',
    notInHistory: 'This game has not finished yet, so it is not in your history.',
    toGame: 'Go to the game',
  },
}

/** The ending as the viewer saw it, e.g. "You resigned"; undefined for a reason the UI does not know. */
export function describeEnding(result: string | undefined, terminationReason: string | undefined) {
  if (terminationReason === undefined) {
    return undefined
  }
  if (result === 'DRAW') {
    return matchHistoryMessages.drawReason[terminationReason]
  }
  const decisive = matchHistoryMessages.decisiveReason[terminationReason]
  return result === 'WIN' ? decisive?.win : decisive?.loss
}
