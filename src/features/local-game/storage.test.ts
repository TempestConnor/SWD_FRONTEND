import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearLocalGame, loadLocalGame, LOCAL_GAME_STORAGE_KEY, saveLocalGame, type StoredLocalGame } from './storage'

const game: StoredLocalGame = {
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  moves: ['e2e4', 'e7e5', 'g7g8q'],
  remainingMs: { white: 1_790_000, black: 1_805_000 },
  timedOut: null,
  savedAt: 1_700_000_000_000,
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('local game storage', () => {
  it('returns null when no game is stored', () => {
    expect(loadLocalGame()).toBeNull()
  })

  it('restores the game it saved', () => {
    saveLocalGame(game)

    expect(loadLocalGame()).toEqual(game)
  })

  it('restores a game without a clock', () => {
    const untimed: StoredLocalGame = { ...game, clock: { enabled: false }, remainingMs: null }
    saveLocalGame(untimed)

    expect(loadLocalGame()).toEqual(untimed)
  })

  it('discards stored data that is not JSON', () => {
    localStorage.setItem(LOCAL_GAME_STORAGE_KEY, '{not json')

    expect(loadLocalGame()).toBeNull()
    expect(localStorage.getItem(LOCAL_GAME_STORAGE_KEY)).toBeNull()
  })

  it.each([
    ['a non-object', 42],
    ['missing moves', { ...game, moves: undefined }],
    ['a move that is not UCI', { ...game, moves: ['e2e4', 'Nf3'] }],
    ['a non-string move', { ...game, moves: [12] }],
    ['a missing clock', { ...game, clock: undefined }],
    ['negative remaining time', { ...game, remainingMs: { white: -1, black: 1000 } }],
    ['an unknown timed-out side', { ...game, timedOut: 'GREEN' }],
  ])('discards stored data with %s', (_case, value) => {
    localStorage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify(value))

    expect(loadLocalGame()).toBeNull()
    expect(localStorage.getItem(LOCAL_GAME_STORAGE_KEY)).toBeNull()
  })

  it('clears the stored game', () => {
    saveLocalGame(game)

    clearLocalGame()

    expect(loadLocalGame()).toBeNull()
  })

  it('does not throw when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(loadLocalGame()).toBeNull()
    expect(() => saveLocalGame(game)).not.toThrow()
    expect(() => clearLocalGame()).not.toThrow()
  })
})
