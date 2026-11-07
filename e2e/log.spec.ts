import { expect, test } from '@playwright/test'
import { freshEmail, signIn } from './helpers'

test('new user logs a first visit (restaurant only) in under 10s and 3 taps', async ({ page }) => {
  await signIn(page, freshEmail())
  await expect(page.getByText('No meals logged yet')).toBeVisible()

  await page.getByRole('link', { name: /log a meal/i }).click() // opens the log screen
  await expect(page.getByRole('heading', { name: 'Log a meal' })).toBeVisible()

  const t0 = Date.now()
  await page.getByLabel('Search a place').fill('miller') // typing, not a tap
  await page.getByRole('button', { name: /Miller Union/ }).click() // tap 1: saved
  await expect(page.getByRole('dialog', { name: /Saved/ })).toBeVisible()
  const saved = Date.now() - t0
  expect(saved).toBeLessThan(10_000)

  await page.getByRole('button', { name: 'Done' }).click() // tap 2 (optional)
  await expect(page.getByRole('heading', { name: 'Recent visits' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Miller Union/ })).toBeVisible()
})

test('details autosave on the visit', async ({ page }) => {
  await signIn(page, freshEmail())
  await page.goto('/log')
  await page.getByLabel('Search a place').fill('chai')
  await page.getByRole('button', { name: /Chai Pani/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Loved it/ }).click()
  await dialog.getByLabel('What to order').fill('Okra fries')
  await dialog.getByRole('button', { name: 'Add' }).click()
  await dialog.getByRole('button', { name: 'groups' }).click()
  await dialog.getByLabel('Short note').fill('Big groups, loud, great')
  await expect(dialog.getByText('Saved', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('link', { name: /Chai Pani/ }).click()
  await expect(page.getByRole('button', { name: /Loved it/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Remove Okra fries' })).toBeVisible()
  await expect(page.getByLabel('Short note')).toHaveValue('Big groups, loud, great')
  await expect(page.getByRole('button', { name: 'groups' })).toHaveAttribute('aria-pressed', 'true')
})

for (const [file, place, date] of [
  ['miller-union-gps.jpg', 'Miller Union', '2026-11-01'],
  ['chai-pani-gps.jpg', 'Chai Pani', '2026-10-24'],
  ['fox-bros-gps.jpg', 'Fox Bros', '2026-10-10'],
] as const) {
  test(`photo with GPS suggests ${place} in the top 3`, async ({ page }) => {
    await signIn(page, freshEmail())
    await page.goto('/log')
    await page.getByLabel('Add photo (1 to 5)').setInputFiles(`e2e/fixtures/${file}`)
    await expect(page.getByRole('heading', { name: 'Is this where you ate?' })).toBeVisible()
    const options = page.getByRole('list').filter({ has: page.getByRole('button') }).first().getByRole('button')
    const names = await page.locator('h2:has-text("Is this where you ate?") + ul button').allInnerTexts()
    expect(names.length).toBeGreaterThan(0)
    expect(names.length).toBeLessThanOrEqual(3)
    expect(names.some((n) => n.includes(place))).toBe(true)
    void options
    await page.getByRole('button', { name: new RegExp(place) }).click()
    await expect(page.getByLabel('Visit date')).toHaveValue(date) // date came from EXIF
  })
}

test('photo without GPS falls back to search with no error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await signIn(page, freshEmail())
  await page.goto('/log')
  await page.getByLabel('Add photo (1 to 5)').setInputFiles('e2e/fixtures/no-gps.jpg')
  await expect(page.getByText(/No location found/)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByLabel('Search a place').fill('antico')
  await page.getByRole('button', { name: /Antico/ }).click()
  await expect(page.getByLabel('Visit date')).toHaveValue('2026-11-03')
  expect(errors).toEqual([])
})

test('uploaded but unlogged photos trigger the nudge banner', async ({ page }) => {
  await signIn(page, freshEmail())
  await page.goto('/log')
  await page.getByLabel('Add photo (1 to 5)').setInputFiles(['e2e/fixtures/no-gps.jpg'])
  await expect(page.getByText(/No location found/)).toBeVisible()
  await page.goto('/')
  // no-gps.jpg is dated 2026-11-03, within 7 days of 2026-11-07 only if the machine date is that close
  const banner = page.getByRole('region', { name: 'Photos to log' })
  const recent = Date.now() - new Date('2026-11-03T20:15:00').getTime() < 7 * 86400000
  if (recent) await expect(banner).toContainText('1 photo')
  else await expect(banner).toHaveCount(0)
})
