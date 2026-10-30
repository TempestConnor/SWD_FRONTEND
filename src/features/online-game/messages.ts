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
  yourMove: 'Your move',
  opponentsMove: 'Waiting for your opponent’s move',
  moves: 'Moves',
  /** Why the server refused a move, by errorCode; anything else gets the generic message. */
  moveRejected: {
    ILLEGAL_MOVE: 'That move is not legal.',
    MOVE_OUT_OF_SEQUENCE: 'The game had moved on. The board now shows the latest position.',
    NOT_YOUR_TURN: 'It is not your turn.',
    ONLINE_GAME_NOT_ACTIVE: 'This game is no longer in progress.',
    TIME_EXPIRED: 'Your clock has run out.',
    DISCONNECT_FORFEIT_DUE: 'This game has already ended.',
  } as Partial<Record<string, string>>,
  outcome: {
    checkmateWin: 'Checkmate. You win.',
    checkmateLoss: 'Checkmate. You lose.',
    /** Draws by termination reason, as the chess library detects them (decided 2026-10-15: no draw claims). */
    draw: {
      STALEMATE: 'Draw by stalemate.',
      INSUFFICIENT_MATERIAL: 'Draw by insufficient material.',
      REPETITION: 'Draw by threefold repetition.',
      MOVE_COUNT: 'Draw by the fifty-move rule.',
    } as Partial<Record<string, string>>,
  },
}
