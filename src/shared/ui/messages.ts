import type { Side } from '../lib/chess'

/** Every string the shared UI components show. */
export const sharedUiMessages = {
  promotion: {
    title: 'Choose a promotion piece',
    cancel: 'Cancel',
    pieces: { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' },
  },
  terms: {
    rated: 'Rated game',
    unrated: 'Unrated game',
    noClock: 'No clock',
    clock: (initialMinutes: number, incrementSeconds: number) => `${initialMinutes} min + ${incrementSeconds} s`,
  },
  record: {
    moves: 'Moves',
    side: (side: Side) => (side === 'WHITE' ? 'White' : 'Black'),
    capturedBy: (side: Side) => `Captured by ${side === 'WHITE' ? 'White' : 'Black'}`,
    pieces: { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' },
    lead: (points: number) => `+${points}`,
  },
}
