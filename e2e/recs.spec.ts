import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

const resultNames = (page: import('@playwright/test').Page) =>
  page.locator('section[aria-labelledby="res"] ul > li a.inline-flex').allInnerTexts()

test('find a rec: ordered by feeling then recency', async ({ page }) => {
  await signIn(page)
  await page.goto('/asked')
  await page.getByRole('group', { name: 'Occasion' }).getByRole('button', { name: 'date night' }).click()
  // loved first (most recent first), then liked
  expect(await resultNames(page)).toEqual(['Miller Union', 'Octopus Bar', 'Bacchanalia', 'Ticonderoga Club', 'Umi'])
})

test('find a rec: occasion + price + area', async ({ page }) => {
  await signIn(page)
  await page.goto('/asked')
  await page.getByRole('group', { name: 'Occasion' }).getByRole('button', { name: 'date night' }).click()
  await page.getByRole('group', { name: 'Price' }).getByRole('button', { name: '3 of 4 dollar signs' }).click()
  await page.getByRole('group', { name: 'Area' }).getByRole('button', { name: 'West Midtown' }).click()
  expect(await resultNames(page)).toEqual(['Miller Union'])
  await expect(page.getByRole('heading', { name: '1 match' })).toBeVisible()
})

test('empty state suggests loosening a filter', async ({ page }) => {
  await signIn(page)
  await page.goto('/asked')
  await page.getByRole('group', { name: 'Occasion' }).getByRole('button', { name: 'brunch' }).click()
  await page.getByRole('group', { name: 'Price' }).getByRole('button', { name: '3 of 4 dollar signs' }).click()
  await page.getByRole('group', { name: 'Area' }).getByRole('button', { name: 'Kirkwood' }).click()
  await expect(page.getByText('No matches for that combination')).toBeVisible()
  await expect(page.getByText(/Try loosening the price/)).toBeVisible()
  await page.getByRole('button', { name: /Drop “\$\$\$”/ }).click()
  expect(await resultNames(page)).toEqual(['Sun in My Belly'])
})

test('my places: search and combined filters', async ({ page }) => {
  await signIn(page)
  await page.goto('/places')
  await expect(page.getByRole('status').filter({ hasText: 'places' })).toContainText('16 places')

  await page.getByLabel('Search places, dishes and notes').fill('brisket')
  await expect(page.getByRole('link', { name: /Fox Bros/ })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /place/ })).toContainText('1 place')

  await page.getByLabel('Search places, dishes and notes').fill('')
  await page.getByRole('button', { name: /Filters/ }).click()
  const d = page.getByRole('dialog', { name: 'Filters' })
  await d.getByRole('group', { name: 'Occasion' }).getByRole('button', { name: 'brunch' }).click()
  await d.getByRole('group', { name: 'Feeling' }).getByRole('button', { name: /Liked it/ }).click()
  await d.getByRole('button', { name: /Show 2 places/ }).click()
  await expect(page.getByRole('link', { name: /Home Grown/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Sun in My Belly/ })).toBeVisible()

  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('dialog', { name: 'Filters' }).getByLabel('Neighborhood').selectOption('Kirkwood')
  await page.getByRole('dialog', { name: 'Filters' }).getByRole('button', { name: /Show 1 place$/ }).click()
  await expect(page.getByRole('link', { name: /Sun in My Belly/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Home Grown/ })).toHaveCount(0)
})
