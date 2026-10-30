import { expect, test } from '@playwright/test'
import { newAccount, registerAccount } from './support.ts'

test.describe('accounts (F01)', () => {
  test('signs up, sees the starting rating, signs out and signs back in', async ({ page }) => {
    const account = newAccount('ADVANCED')

    await page.goto('/')
    await page.getByRole('link', { name: 'Sign up' }).click()
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByLabel('Display name').fill(account.displayName)
    await page.getByRole('radio', { name: /Advanced/ }).check()
    await page.getByRole('button', { name: 'Create account' }).click()

    const nav = page.getByRole('navigation')
    await expect(nav.getByText(account.displayName)).toBeVisible()
    await expect(nav.getByText('Classical 1200')).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Play online' })).toBeVisible()

    await nav.getByRole('button', { name: 'Sign out' }).click()
    await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(nav.getByText(account.displayName)).toBeHidden()

    await nav.getByRole('link', { name: 'Sign in' }).click()
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(nav.getByText(account.displayName)).toBeVisible()
  })

  test('keeps the session across a reload', async ({ page }) => {
    const account = newAccount()
    await registerAccount(page.request, account)

    await page.goto('/signin')
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('navigation').getByText(account.displayName)).toBeVisible()

    await page.reload()
    await expect(page.getByRole('navigation').getByText(account.displayName)).toBeVisible()
  })

  test('rejects a wrong password', async ({ page }) => {
    const account = newAccount()
    await registerAccount(page.request, account)

    await page.goto('/signin')
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.')
  })

  test('rejects an email and a display name that are already taken', async ({ page }) => {
    const existing = newAccount()
    await registerAccount(page.request, existing)

    await page.goto('/signup')
    await page.getByLabel('Email').fill(existing.email)
    await page.getByLabel('Password').fill(existing.password)
    await page.getByLabel('Display name').fill(newAccount().displayName)
    await page.getByRole('radio', { name: /Beginner/ }).check()
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('An account with this email already exists.')).toBeVisible()

    await page.getByLabel('Email').fill(newAccount().email)
    await page.getByLabel('Display name').fill(existing.displayName)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('This display name is already taken.')).toBeVisible()
  })

  test('sends a guest to sign in and back to the page they asked for', async ({ page }) => {
    const account = newAccount()
    await registerAccount(page.request, account)

    await page.goto('/history')
    await expect(page).toHaveURL(/\/signin$/)
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL(/\/history$/)
    await expect(page.getByRole('heading', { name: 'Match history' })).toBeVisible()
  })
})
