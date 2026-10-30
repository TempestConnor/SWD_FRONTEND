import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearInvitation, INVITATION_STORAGE_KEY, loadInvitation, saveInvitation } from './storage'

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('invitation storage', () => {
  it('saves and loads the open invitation for this tab', () => {
    saveInvitation({ id: 3, token: 'tok_abc' })

    expect(loadInvitation()).toEqual({ id: 3, token: 'tok_abc' })
    expect(sessionStorage.getItem(INVITATION_STORAGE_KEY)).not.toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(loadInvitation()).toBeNull()
  })

  it('clears the stored invitation', () => {
    saveInvitation({ id: 3, token: 'tok_abc' })

    clearInvitation()

    expect(loadInvitation()).toBeNull()
  })

  it.each([
    ['corrupt JSON', '{not json'],
    ['a missing token', JSON.stringify({ id: 3 })],
    ['a non-numeric id', JSON.stringify({ id: '3', token: 'tok_abc' })],
    ['an empty token', JSON.stringify({ id: 3, token: '' })],
  ])('discards %s', (_case, raw) => {
    sessionStorage.setItem(INVITATION_STORAGE_KEY, raw)

    expect(loadInvitation()).toBeNull()
    expect(sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBeNull()
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(loadInvitation()).toBeNull()
    expect(() => saveInvitation({ id: 3, token: 'tok_abc' })).not.toThrow()
    expect(() => clearInvitation()).not.toThrow()
  })
})
