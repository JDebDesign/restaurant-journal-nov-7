import { type Page, expect } from '@playwright/test'

export const DEMO = 'alanna@example.com'

let n = 0
export const freshEmail = () => `tester${Date.now()}${n++}@example.com`

/** Uses the prototype magic-link callback (see src/pages/AuthCallback.tsx). */
export async function signIn(page: Page, email = DEMO) {
  await page.goto(`/auth/callback?email=${encodeURIComponent(email)}`)
  await expect(page.getByRole('link', { name: /log a meal/i })).toBeVisible()
}
