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
}
