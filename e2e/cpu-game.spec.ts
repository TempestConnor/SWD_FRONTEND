import { expect, test, type Page } from '@playwright/test'
import { clickMove, gameStatus, pieceOn, square } from './support.ts'

async function startAsWhite(page: Page) {
  await page.goto('/cpu')
  await page.getByRole('radio', { name: 'Easy' }).check()
  await page.getByRole('radio', { name: 'White' }).check()
  await page.getByRole('checkbox', { name: 'Use a clock' }).uncheck()
  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(gameStatus(page)).toHaveText('Your move')
}

/** How many of Black's pawns and knights have left their starting squares; each opening move moves one. */
async function blackPiecesMoved(page: Page) {
  const home = ['a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'b8', 'g8']
  const counts = await Promise.all(home.map((id) => square(page, id).locator('[data-piece]').count()))
  return counts.filter((count) => count === 0).length
}

// Needs the backend started with STOCKFISH_PATH; without it CPU moves return 503.
test.describe('CPU game (F03)', () => {
  test('the engine answers the player’s move', async ({ page }) => {
    await startAsWhite(page)

    await clickMove(page, 'e2e4')

    await expect(pieceOn(page, 'e4')).toHaveAttribute('data-piece', 'wP')
    await expect(gameStatus(page)).toHaveText('Your move', { timeout: 20_000 })
    await expect.poll(() => blackPiecesMoved(page)).toBe(1)
  })

  test('restores the game after a reload', async ({ page }) => {
    await startAsWhite(page)
    await clickMove(page, 'e2e4')
    await expect(gameStatus(page)).toHaveText('Your move', { timeout: 20_000 })
    await expect.poll(() => blackPiecesMoved(page)).toBe(1)

    await page.reload()

    await expect(gameStatus(page)).toHaveText('Your move')
    await expect(pieceOn(page, 'e4')).toHaveAttribute('data-piece', 'wP')
    await expect.poll(() => blackPiecesMoved(page)).toBe(1)
  })

  test('plays Black with the engine opening', async ({ page }) => {
    await page.goto('/cpu')
    await page.getByRole('radio', { name: 'Easy' }).check()
    await page.getByRole('radio', { name: 'Black' }).check()
    await page.getByRole('checkbox', { name: 'Use a clock' }).uncheck()
    await page.getByRole('button', { name: 'Start game' }).click()

    await expect(gameStatus(page)).toHaveText('Your move', { timeout: 20_000 })
  })
})
