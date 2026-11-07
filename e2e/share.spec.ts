import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

test('single share link opens logged out with correct content and meta tags', async ({ page, browser }) => {
  await signIn(page)
  await page.goto('/places')
  await page.getByRole('link', { name: /Miller Union/ }).click()
  await page.getByRole('button', { name: 'Share rec' }).click()
  const url = await page.getByLabel('Share link').inputValue()
  expect(url).toMatch(/\/r\/[a-z0-9]{8}#d=/)

  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } }) // no storage, no session
  const pub = await ctx.newPage()
  await pub.goto(url)
  await expect(pub.getByRole('heading', { name: 'Miller Union' }).first()).toBeVisible()
  await expect(pub.getByText('West Midtown')).toBeVisible()
  await expect(pub.getByText('Calm, special, and the egg is a must')).toBeVisible()
  await expect(pub.getByText('Baked farm egg')).toBeVisible()
  await expect(pub.getByRole('link', { name: 'Open in Maps' })).toHaveAttribute('href', /google\.com\/maps/)
  await expect(pub.getByRole('link', { name: 'Reserve' })).toHaveAttribute('href', /millerunion\.com/)
  await expect(pub.getByRole('link', { name: 'Keep your own list' })).toBeVisible()
  expect(await pub.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await expect(pub).toHaveTitle(/Miller Union/)
  await expect(pub.locator('meta[property="og:title"]')).toHaveAttribute('content', /Miller Union/)
  await expect(pub.locator('meta[property="og:description"]')).toHaveAttribute('content', /egg/)
  await expect(pub.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')

  // the OG layout route renders
  await pub.goto(url.replace(/#/, '/card#'))
  await expect(pub.locator('#og-card')).toContainText('Miller Union')
  await ctx.close()
})

test('multi-place share card (up to 5)', async ({ page, browser }) => {
  await signIn(page)
  await page.goto('/asked')
  await page.getByRole('group', { name: 'Occasion' }).getByRole('button', { name: 'date night' }).click()
  for (const n of ['Miller Union', 'Bacchanalia', 'Umi']) await page.getByRole('button', { name: `Add ${n} to share card` }).click()
  await expect(page.getByText('3 of 5 selected')).toBeVisible()
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const url = await page.getByLabel('Share link').inputValue()

  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const pub = await ctx.newPage()
  await pub.goto(url)
  await expect(pub.getByRole('heading', { name: "Places I'd send you to" })).toBeVisible()
  await expect(pub.getByRole('article')).toHaveCount(3)
  await expect(pub.getByRole('article').nth(0)).toContainText('Miller Union')
  await ctx.close()
})

test('share link without payload falls back gracefully', async ({ page }) => {
  await page.goto('/r/zzzzzzzz')
  await expect(page.getByRole('heading', { name: /incomplete/ })).toBeVisible()
})
