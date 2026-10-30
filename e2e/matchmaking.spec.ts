import { expect, test } from '@playwright/test'
import { signedInPage } from './support.ts'

// Runs against a shared backend: a real player searching at the same rating could be paired instead.
test.describe('matchmaking (F05, F06)', () => {
  test('joins and leaves the queue', async ({ browser }) => {
    const { page, context } = await signedInPage(browser, 'EXPERT')
    await page.goto('/play')

    await page.getByRole('button', { name: 'Find opponent' }).click()
    await expect(page.getByText('Searching for an opponent…')).toBeVisible()
    await expect(page.getByText('Your rating: 1600')).toBeVisible()

    await page.getByRole('button', { name: 'Leave queue' }).click()
    await expect(page.getByText('You left the queue.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Find opponent' })).toBeVisible()

    await context.close()
  })

  test('pairs two players of similar rating into the same pending game', async ({ browser }) => {
    const first = await signedInPage(browser, 'BEGINNER')
    const second = await signedInPage(browser, 'BEGINNER')

    for (const { page } of [first, second]) {
      await page.goto('/play')
      await page.getByRole('button', { name: 'Find opponent' }).click()
      await expect(page.getByText('Searching for an opponent…')).toBeVisible()
    }

    // The pairing worker runs every couple of seconds.
    await expect(first.page).toHaveURL(/\/games\/\d+$/, { timeout: 20_000 })
    await expect(second.page).toHaveURL(first.page.url(), { timeout: 20_000 })
    for (const { page } of [first, second]) {
      await expect(page.getByText('Waiting for both players to get ready.')).toBeVisible()
      await expect(page.getByText(first.account.displayName, { exact: false }).first()).toBeVisible()
      await expect(page.getByText(second.account.displayName, { exact: false }).first()).toBeVisible()
    }

    // Leave nothing pending behind.
    await first.page.getByRole('button', { name: 'Cancel game' }).click()
    await expect(second.page.getByText('This game was cancelled before it started.', { exact: false })).toBeVisible()

    await first.context.close()
    await second.context.close()
  })
})
