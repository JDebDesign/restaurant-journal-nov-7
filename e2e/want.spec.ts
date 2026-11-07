import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

test('convert a want-to-try into a visit', async ({ page }) => {
  await signIn(page)
  await page.goto('/want')
  await expect(page.getByRole('heading', { name: 'Your list (4)' })).toBeVisible()
  await page.getByRole('button', { name: 'I went to Ecco' }).click()
  await expect(page).toHaveURL(/\/visits\//)
  await expect(page.getByText('Ecco', { exact: true }).first()).toBeVisible()
  await page.goto('/want')
  await expect(page.getByRole('heading', { name: 'Your list (3)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'I went to Ecco' })).toHaveCount(0)
  // it is now in the journal
  await page.goto('/places')
  await page.getByLabel('Search places, dishes and notes').fill('ecco')
  await expect(page.getByRole('link', { name: /Ecco/ })).toBeVisible()
})

test('save an Instagram link and pick the place', async ({ page }) => {
  await signIn(page)
  await page.goto('/want')
  await page.getByLabel('Paste an Instagram, TikTok or Maps link').fill('https://www.instagram.com/p/XYZ123/')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(/Instagram/).first()).toBeVisible()
  await page.getByLabel('Pick the place').fill('lawrence')
  await page.getByRole('button', { name: /The Lawrence/ }).click()
  await expect(page.getByRole('heading', { name: 'Your list (5)' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'The Lawrence' }).getByRole('link', { name: /Instagram post/ })).toHaveAttribute('href', 'https://www.instagram.com/p/XYZ123/')
})
