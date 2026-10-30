import { expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

// Shared helpers for the end-to-end tests. Everything here goes through the real backend.

export type Skill = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'

export type TestAccount = { email: string; password: string; displayName: string; signupSkill: Skill }

type AuthToken = { accessToken: string; expiresAt: string; account: unknown }

/** Must match STORAGE_KEY in src/api/session.ts. */
const SESSION_KEY = 'chess.session.v1'

let counter = 0

/** A fresh account that no earlier run has registered; nothing is sent to the backend yet. */
export function newAccount(skill: Skill = 'INTERMEDIATE'): TestAccount {
  counter += 1
  const id = `${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 6)}`
  return { email: `e2e-${id}@example.test`, password: 'e2e-password-1', displayName: `e2e ${id}`, signupSkill: skill }
}

/** Registers the account through the API (signup also signs in) and returns its token. */
export async function registerAccount(request: APIRequestContext, account: TestAccount): Promise<AuthToken> {
  const response = await request.post('/api/accounts/signup', { data: account })
  expect(response.status(), await response.text()).toBe(201)
  return (await response.json()) as AuthToken
}

/** Opens the app already signed in as a newly registered account, the way a stored session would. */
export async function signedInPage(browser: Browser, skill: Skill = 'INTERMEDIATE') {
  const context = await browser.newContext()
  const page = await context.newPage()
  const account = newAccount(skill)
  const token = await registerAccount(context.request, account)
  await page.addInitScript(
    ([key, value]) => {
      // Only seed an empty store, so signing out in a test is not undone by the next navigation.
      if (!window.sessionStorage.getItem('e2e.seeded')) {
        window.localStorage.setItem(key, value)
        window.sessionStorage.setItem('e2e.seeded', '1')
      }
    },
    [SESSION_KEY, JSON.stringify(token)] as const,
  )
  return { context, page, account }
}

/** Accepts every window.confirm, e.g. for Resign or New game. */
export function acceptDialogs(page: Page) {
  page.on('dialog', (dialog) => void dialog.accept())
}

// react-chessboard gives squares no accessible names; like src/test/board.ts, these read its data attributes.

export function square(page: Page, id: string) {
  return page.locator(`[data-square="${id}"]`)
}

/** The piece on a square, e.g. 'wP' or 'bK'. */
export function pieceOn(page: Page, id: string) {
  return square(page, id).locator('[data-piece]')
}

/** The game's status line, e.g. 'White to move'; the board's drag-and-drop live region is also a status. */
export function gameStatus(page: Page) {
  return page.getByRole('status').and(page.locator('p'))
}

/** Plays a move by clicking its from-square and then its to-square, e.g. 'e2e4'. */
export async function clickMove(page: Page, uci: string) {
  await square(page, uci.slice(0, 2)).click()
  await square(page, uci.slice(2, 4)).click()
}
