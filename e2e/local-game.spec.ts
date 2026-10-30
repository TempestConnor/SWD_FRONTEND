import { expect, test } from '@playwright/test'
import { acceptDialogs, clickMove, gameStatus, pieceOn } from './support.ts'

test.describe('local game (F02)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/local')
    await page.getByRole('checkbox', { name: 'Use a clock' }).uncheck()
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(gameStatus(page)).toHaveText('White to move')
  })

  test('plays moves for both sides through the backend', async ({ page }) => {
    await clickMove(page, 'e2e4')
    await expect(gameStatus(page)).toHaveText('Black to move')
    await expect(pieceOn(page, 'e4')).toHaveAttribute('data-piece', 'wP')

    await clickMove(page, 'e7e5')
    await expect(gameStatus(page)).toHaveText('White to move')
    await expect(pieceOn(page, 'e5')).toHaveAttribute('data-piece', 'bP')
  })

  test('refuses an illegal move', async ({ page }) => {
    await clickMove(page, 'e2e5')

    await expect(page.getByRole('alert')).toHaveText('That move is not legal.')
    await expect(pieceOn(page, 'e2')).toHaveAttribute('data-piece', 'wP')
  })

  test('ends in checkmate', async ({ page }) => {
    for (const move of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) {
      await clickMove(page, move)
    }

    await expect(gameStatus(page)).toHaveText('Checkmate. Black wins.')
  })

  test('restores an untimed game after a reload', async ({ page }) => {
    await clickMove(page, 'd2d4')
    await expect(gameStatus(page)).toHaveText('Black to move')

    await page.reload()

    await expect(gameStatus(page)).toHaveText('Black to move')
    await expect(pieceOn(page, 'd4')).toHaveAttribute('data-piece', 'wP')
  })

  test('restores a timed game after a reload', async ({ page }) => {
    acceptDialogs(page)
    await page.getByRole('button', { name: 'New game' }).click()
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(page.getByRole('timer', { name: 'White clock' })).toBeVisible()
    await clickMove(page, 'd2d4')
    await expect(gameStatus(page)).toHaveText('Black to move')

    await page.reload()

    await expect(gameStatus(page)).toHaveText('Black to move')
    await expect(pieceOn(page, 'd4')).toHaveAttribute('data-piece', 'wP')
    await expect(page.getByRole('timer', { name: 'Black clock' })).toBeVisible()
  })

  test('starts over with New game', async ({ page }) => {
    acceptDialogs(page)
    await clickMove(page, 'e2e4')
    await expect(gameStatus(page)).toHaveText('Black to move')

    await page.getByRole('button', { name: 'New game' }).click()

    await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible()
  })
})
