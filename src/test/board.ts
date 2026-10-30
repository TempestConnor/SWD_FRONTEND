import type { UserEvent } from '@testing-library/user-event'

// react-chessboard gives squares and pieces no accessible names, so these helpers read its data attributes.
// They are the only place tests depend on the board's DOM.

export function square(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-square="${id}"]`)
  if (!element) {
    throw new Error(`Square ${id} is not on the board`)
  }
  return element
}

/** The piece code on a square, e.g. 'wP' or 'bK', or null when it is empty. */
export function pieceOn(id: string): string | null {
  return square(id).querySelector('[data-piece]')?.getAttribute('data-piece') ?? null
}

/** Plays a move by clicking its from-square and then its to-square, e.g. 'e2e4'. */
export async function clickMove(user: UserEvent, uci: string) {
  await user.click(square(uci.slice(0, 2)))
  await user.click(square(uci.slice(2, 4)))
}
