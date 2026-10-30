import { expect, test, type Browser, type Page } from '@playwright/test'
import { acceptDialogs, clickMove, pieceOn, signedInPage } from './support.ts'

/** The host creates an unrated, untimed invitation as White and returns its link. */
async function createInvitation(host: Page) {
  await host.goto('/invite')
  await host.getByRole('radio', { name: 'White' }).check()
  await host.getByRole('checkbox', { name: 'Use a clock' }).uncheck()
  await expect(host.getByText('Unrated game')).toBeVisible()
  await host.getByRole('button', { name: 'Create invitation' }).click()
  await expect(host.getByText('Waiting for your opponent to join…')).toBeVisible()
  return host.getByLabel('Invitation link').inputValue()
}

/** Two signed-in players in one pending game: the host plays White, the guest Black. */
async function startInvitedGame(browser: Browser) {
  const white = await signedInPage(browser)
  const black = await signedInPage(browser)
  const link = await createInvitation(white.page)

  await black.page.goto(link)
  await black.page.getByRole('button', { name: 'Join game' }).click()

  // The guest opens the game at once; the host follows when polling sees the claim.
  await expect(black.page).toHaveURL(/\/games\/\d+$/)
  await expect(white.page).toHaveURL(black.page.url())
  for (const player of [white, black]) {
    await expect(player.page.getByText('Waiting for both players to get ready.')).toBeVisible()
  }
  return { white, black }
}

async function readyUp(white: Page, black: Page) {
  await white.getByRole('button', { name: 'Ready' }).click()
  await expect(white.getByText('You are ready. Waiting for your opponent.')).toBeVisible()
  await black.getByRole('button', { name: 'Ready' }).click()
  for (const page of [white, black]) {
    await expect(page.getByText('The game has started.')).toBeVisible()
  }
}

test.describe('invitations and online play (F04, F07, F08, F10, F13)', () => {
  test('a friend joins by link, both get ready, play, and the resignation reaches history', async ({ browser }) => {
    const { white, black } = await startInvitedGame(browser)
    await expect(white.page.getByText('You play White')).toBeVisible()
    await expect(black.page.getByText('You play Black')).toBeVisible()

    await readyUp(white.page, black.page)
    await expect(white.page.getByText('Your move', { exact: true })).toBeVisible()
    await expect(black.page.getByText('Waiting for your opponent’s move')).toBeVisible()

    // Each move reaches the other player through polling.
    await clickMove(white.page, 'e2e4')
    await expect(pieceOn(black.page, 'e4')).toHaveAttribute('data-piece', 'wP')
    await expect(black.page.getByText('Your move', { exact: true })).toBeVisible()
    await clickMove(black.page, 'c7c5')
    await expect(pieceOn(white.page, 'c5')).toHaveAttribute('data-piece', 'bP')
    for (const page of [white.page, black.page]) {
      await expect(page.getByRole('list', { name: 'Moves' }).getByRole('listitem')).toHaveText(['e4', 'c5'])
    }

    acceptDialogs(black.page)
    await black.page.getByRole('button', { name: 'Resign' }).click()
    await expect(black.page.getByText('You resigned. You lose.')).toBeVisible()
    await expect(white.page.getByText('Your opponent resigned. You win.')).toBeVisible()
    await expect(white.page.getByText('This game was unrated, so ratings did not change.')).toBeVisible()

    await white.page.getByRole('link', { name: 'Match history' }).click()
    const entry = white.page.getByRole('list', { name: 'Match history' }).getByRole('listitem').first()
    await expect(entry).toContainText(`vs ${black.account.displayName}`)
    await expect(entry).toContainText('Your opponent resigned')
    await entry.getByRole('link', { name: `View game against ${black.account.displayName}` }).click()
    await expect(
      white.page.getByRole('heading', { name: `${white.account.displayName} vs ${black.account.displayName}` }),
    ).toBeVisible()

    await white.context.close()
    await black.context.close()
  })

  test('both players agree to abandon and the game is drawn', async ({ browser }) => {
    const { white, black } = await startInvitedGame(browser)
    await readyUp(white.page, black.page)
    acceptDialogs(white.page)
    acceptDialogs(black.page)

    await white.page.getByRole('button', { name: 'Propose abandoning' }).click()
    await expect(white.page.getByText('You proposed abandoning the game. Waiting for your opponent to agree.')).toBeVisible()
    await expect(black.page.getByText(`${white.account.displayName} proposes abandoning the game.`, { exact: false })).toBeVisible()

    await black.page.getByRole('button', { name: 'Agree to abandon' }).click()
    for (const page of [white.page, black.page]) {
      await expect(page.getByText('The game was abandoned by agreement. It is a draw.')).toBeVisible()
    }

    await white.context.close()
    await black.context.close()
  })

  test('cancelling a pending game cancels it for both players', async ({ browser }) => {
    const { white, black } = await startInvitedGame(browser)

    await black.page.getByRole('button', { name: 'Cancel game' }).click()

    for (const page of [white.page, black.page]) {
      await expect(page.getByText('This game was cancelled before it started.', { exact: false })).toBeVisible()
    }

    await white.context.close()
    await black.context.close()
  })

  test('a cancelled invitation can no longer be joined', async ({ browser }) => {
    const host = await signedInPage(browser)
    const guest = await signedInPage(browser)
    const link = await createInvitation(host.page)

    await host.page.getByRole('button', { name: 'Cancel invitation' }).click()
    await expect(host.page.getByText('Invitation cancelled.')).toBeVisible()

    await guest.page.goto(link)
    await guest.page.getByRole('button', { name: 'Join game' }).click()
    await expect(guest.page.getByRole('alert')).toHaveText('The host cancelled this invitation.')

    await host.context.close()
    await guest.context.close()
  })

  test('the host cannot join their own invitation', async ({ browser }) => {
    const host = await signedInPage(browser)
    const link = await createInvitation(host.page)

    await host.page.goto(link)
    await host.page.getByRole('button', { name: 'Join game' }).click()

    await expect(host.page.getByRole('alert')).toHaveText('You cannot join your own invitation.')
    await host.context.close()
  })
})
