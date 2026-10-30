import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// React Testing Library only advances fake timers (after user-event calls and inside waitFor) when a
// global `jest` exists; without it, any interaction under vi.useFakeTimers() waits forever.
Object.assign(globalThis, { jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) } })

// jsdom has no layout. react-chessboard measures a square to animate a move and throws on a zero width,
// so board squares report a fixed size.
const getBoundingClientRect = Element.prototype.getBoundingClientRect
Element.prototype.getBoundingClientRect = function (this: Element) {
  return this.hasAttribute('data-square') ? new DOMRect(0, 0, 60, 60) : getBoundingClientRect.call(this)
}

afterEach(() => {
  cleanup()
})
