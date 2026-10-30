import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearCpuGame, CPU_GAME_STORAGE_KEY, loadCpuGame, saveCpuGame, type StoredCpuGame } from './storage'

const game: StoredCpuGame = {
  difficulty: 'MEDIUM',
  playerColor: 'BLACK',
  clock: { enabled: true, initialMinutes: 30, incrementSeconds: 10 },
  moves: ['e2e4', 'e7e5', 'g7g8q'],
  remainingMs: 1_790_000,
  timedOut: false,
  savedAt: 1_700_000_000_000,
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('cpu game storage', () => {
  it('returns null when no game is stored', () => {
    expect(loadCpuGame()).toBeNull()
  })

  it('restores the game it saved', () => {
    saveCpuGame(game)

    expect(loadCpuGame()).toEqual(game)
  })

  it('restores a game without a clock', () => {
    const untimed: StoredCpuGame = { ...game, clock: { enabled: false }, remainingMs: null }
    saveCpuGame(untimed)

    expect(loadCpuGame()).toEqual(untimed)
  })

  it('keeps the CPU game apart from the local game', () => {
    saveCpuGame(game)

    expect(localStorage.getItem('chess.local-game.v1')).toBeNull()
    expect(localStorage.getItem(CPU_GAME_STORAGE_KEY)).not.toBeNull()
  })

  it('discards stored data that is not JSON', () => {
    localStorage.setItem(CPU_GAME_STORAGE_KEY, '{not json')

    expect(loadCpuGame()).toBeNull()
    expect(localStorage.getItem(CPU_GAME_STORAGE_KEY)).toBeNull()
  })

  it.each([
    ['a non-object', 42],
    ['an unknown difficulty', { ...game, difficulty: 'IMPOSSIBLE' }],
    ['an unresolved player color', { ...game, playerColor: 'RANDOM' }],
    ['missing moves', { ...game, moves: undefined }],
    ['a move that is not UCI', { ...game, moves: ['e2e4', 'Nf3'] }],
    ['a non-string move', { ...game, moves: [12] }],
    ['a missing clock', { ...game, clock: undefined }],
    ['negative remaining time', { ...game, remainingMs: -1 }],
    ['a non-boolean timeout flag', { ...game, timedOut: 'yes' }],
  ])('discards stored data with %s', (_case, value) => {
    localStorage.setItem(CPU_GAME_STORAGE_KEY, JSON.stringify(value))

    expect(loadCpuGame()).toBeNull()
    expect(localStorage.getItem(CPU_GAME_STORAGE_KEY)).toBeNull()
  })

  it('clears the stored game', () => {
    saveCpuGame(game)

    clearCpuGame()

    expect(loadCpuGame()).toBeNull()
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

    expect(loadCpuGame()).toBeNull()
    expect(() => saveCpuGame(game)).not.toThrow()
    expect(() => clearCpuGame()).not.toThrow()
  })
})
