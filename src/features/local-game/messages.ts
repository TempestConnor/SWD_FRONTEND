import type { Side } from './storage'

const sideNames: Record<Side, string> = { WHITE: 'White', BLACK: 'Black' }

/** Every string the local-game feature shows. Components contain no literal copy. */
export const localGameMessages = {
  title: 'Local game',
  setup: {
    useClock: 'Use a clock',
    initialMinutes: 'Initial time (minutes)',
    incrementSeconds: 'Increment (seconds)',
    start: 'Start game',
    starting: 'Starting…',
    initialMinutesRange: 'Initial time must be between 5 and 120 minutes.',
    incrementRange: 'Increment must be between 0 and 60 seconds.',
    restoreFailed: 'The saved game could not be restored.',
  },
  board: {
    loading: 'Loading game…',
    retry: 'Try again',
    toMove: (side: Side) => `${sideNames[side]} to move`,
    clock: (side: Side) => `${sideNames[side]} clock`,
    illegalMove: 'That move is not legal.',
    newGame: 'New game',
    confirmNewGame: 'Abandon this game and start a new one?',
  },
  outcome: {
    CHECKMATE: (winner: Side) => `Checkmate. ${sideNames[winner]} wins.`,
    STALEMATE: 'Draw by stalemate.',
    INSUFFICIENT_MATERIAL: 'Draw by insufficient material.',
    THREEFOLD_REPETITION: 'Draw by threefold repetition.',
    FIFTY_MOVE_RULE: 'Draw by the fifty-move rule.',
    timeout: (loser: Side) => `${sideNames[loser]} ran out of time. ${sideNames[opponent(loser)]} wins.`,
  },
  promotion: {
    title: 'Choose a promotion piece',
    cancel: 'Cancel',
    pieces: { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' },
  },
}

export function opponent(side: Side): Side {
  return side === 'WHITE' ? 'BLACK' : 'WHITE'
}
