import { type Page, expect } from '@playwright/test'

export const DEMO = 'alanna@example.com'
export const PASSWORD = 'correct horse battery'

let n = 0
export const freshEmail = () => `tester${Date.now()}${n++}@example.com`

/** Creates a brand-new account through the UI (browser-only test mode: nothing leaves the machine). */
export async function createAccount(page: Page, email: string, password = PASSWORD) {
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Create account' }).first().click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).last().click()
  await expect(page.getByRole('link', { name: /log a meal/i })).toBeVisible()
}

/** Demo email: the pre-seeded journal. Any other email: a fresh, empty account. */
export async function signIn(page: Page, email = DEMO) {
  if (email !== DEMO) return createAccount(page, email)
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Try the demo journal' }).click()
  await expect(page.getByRole('link', { name: /log a meal/i })).toBeVisible()
}
