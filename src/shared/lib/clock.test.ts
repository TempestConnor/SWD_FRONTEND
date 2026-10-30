import { describe, expect, it } from 'vitest'
import { formatClock } from './clock'

describe('formatClock', () => {
  it.each([
    [1_800_000, '30:00'],
    [1_810_000, '30:10'],
    [7_200_000, '120:00'],
    [300_000, '5:00'],
    [65_000, '1:05'],
    [9_000, '0:09'],
    [0, '0:00'],
  ])('shows %i ms as %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text)
  })

  it('never shows negative time', () => {
    expect(formatClock(-500)).toBe('0:00')
  })
})
