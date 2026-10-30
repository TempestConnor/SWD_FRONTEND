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
  clock: (side: Side) => `${sideNames[side]} clock`,
  opponentDisconnected: (name: string, remaining: string) =>
    `${name} has lost connection. If they do not return, they forfeit in ${remaining}.`,
  connectionLost:
    'Connection to the server lost. Reconnecting… If you stay away for three minutes, you forfeit the game.',
  resign: 'Resign',
  confirmResign: 'Resign this game? It counts as a loss.',
  proposeAbandon: 'Propose abandoning',
  confirmProposeAbandon:
    'Propose abandoning this game? Your proposal cannot be withdrawn. If your opponent agrees, the game ends in a draw.',
  agreeAbandon: 'Agree to abandon',
  confirmAgreeAbandon: 'Agree to abandon this game? It ends in a draw.',
  viewerProposedAbandon: 'You proposed abandoning the game. Waiting for your opponent to agree.',
  opponentProposedAbandon: (name: string) => `${name} proposes abandoning the game. If you agree, it ends in a draw.`,
  /** Why the server refused a resignation or vote, by errorCode; anything else gets the generic message. */
  endingRejected: {
    ONLINE_GAME_NOT_ACTIVE: 'This game is no longer in progress.',
  } as Partial<Record<string, string>>,
  outcome: {
    /** Wins and losses by termination reason, from the viewer's side. */
    decisive: {
      CHECKMATE: { win: 'Checkmate. You win.', loss: 'Checkmate. You lose.' },
      // Running out of time always loses, even against insufficient material (decided 2026-10-15).
      TIMEOUT: { win: 'Your opponent ran out of time. You win.', loss: 'You ran out of time. You lose.' },
      RESIGNATION: { win: 'Your opponent resigned. You win.', loss: 'You resigned. You lose.' },
      DISCONNECT: {
        win: 'Your opponent did not reconnect in time. You win.',
        loss: 'You were disconnected for too long. You lose.',
      },
    } as Partial<Record<string, { win: string; loss: string }>>,
    /** Draws by termination reason, as the chess library detects them (decided 2026-10-15: no draw claims). */
    draw: {
      STALEMATE: 'Draw by stalemate.',
      INSUFFICIENT_MATERIAL: 'Draw by insufficient material.',
      REPETITION: 'Draw by threefold repetition.',
      MOVE_COUNT: 'Draw by the fifty-move rule.',
      MUTUAL_ABANDONMENT: 'The game was abandoned by agreement. It is a draw.',
    } as Partial<Record<string, string>>,
  },
}
