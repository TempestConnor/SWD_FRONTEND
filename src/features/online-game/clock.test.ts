import { describe, expect, it } from 'vitest'
import type { OnlineGame } from './api'
import { liveRemaining } from './clock'

const whiteToMove = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const blackToMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const turnStartedAt = '2026-10-31T10:06:00Z'
const turnStart = Date.parse(turnStartedAt)

const active: OnlineGame = {
  status: 'ACTIVE',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  currentFen: whiteToMove,
  turnStartedAt,
  whiteRemainingMs: 1_000_000,
  blackRemainingMs: 1_200_000,
}

describe('liveRemaining', () => {
  it('runs only the clock of the side to move, from the server’s turn start', () => {
    expect(liveRemaining(active, turnStart + 65_000)).toEqual({ white: 935_000, black: 1_200_000 })
  })

  it('runs Black’s clock when Black is to move', () => {
    expect(liveRemaining({ ...active, currentFen: blackToMove }, turnStart + 30_000)).toEqual({
      white: 1_000_000,
      black: 1_170_000,
    })
  })

  it('shows the stored times at the turn start', () => {
    expect(liveRemaining(active, turnStart)).toEqual({ white: 1_000_000, black: 1_200_000 })
  })

  it('never goes below zero once the time is used up', () => {
    expect(liveRemaining(active, turnStart + 2_000_000)).toEqual({ white: 0, black: 1_200_000 })
  })

  it('does not run a clock when the local time is behind the turn start', () => {
    expect(liveRemaining(active, turnStart - 5_000)).toEqual({ white: 1_000_000, black: 1_200_000 })
  })

  it.each(['PENDING', 'COMPLETED', 'CANCELLED'])('shows the stored times of a %s game', (status) => {
    expect(liveRemaining({ ...active, status }, turnStart + 65_000)).toEqual({ white: 1_000_000, black: 1_200_000 })
  })

  it('has no clocks when the clock is disabled', () => {
    expect(
      liveRemaining(
        { ...active, clock: { enabled: false }, whiteRemainingMs: undefined, blackRemainingMs: undefined },
        turnStart + 65_000,
      ),
    ).toBeNull()
  })
})
