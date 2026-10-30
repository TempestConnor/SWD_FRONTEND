import type { Side } from '../../shared/lib/chess'
import type { Difficulty } from './storage'

/** Every string the cpu-game feature shows. Components contain no literal copy. */
export const cpuGameMessages = {
  title: 'Play the computer',
  setup: {
    difficulty: 'Difficulty',
    difficulties: { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' } satisfies Record<Difficulty, string>,
    color: 'Your color',
    colors: { WHITE: 'White', BLACK: 'Black', RANDOM: 'Random' } satisfies Record<Side | 'RANDOM', string>,
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
    yourMove: 'Your move',
    thinking: 'The CPU is thinking…',
    clock: 'Your clock',
    illegalMove: 'That move is not legal.',
    cpuFailed: 'The CPU could not move. Please try again.',
    newGame: 'New game',
    confirmNewGame: 'Abandon this game and start a new one?',
  },
  outcome: {
    playerMated: 'Checkmate. The CPU wins.',
    cpuMated: 'Checkmate. You win.',
    STALEMATE: 'Draw by stalemate.',
    INSUFFICIENT_MATERIAL: 'Draw by insufficient material.',
    THREEFOLD_REPETITION: 'Draw by threefold repetition.',
    FIFTY_MOVE_RULE: 'Draw by the fifty-move rule.',
    timeout: 'You ran out of time. The CPU wins.',
  },
}
