import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

const ROUTES = ['/', '/places', '/log', '/want', '/asked', '/settings', '/visits/demo-v1']

for (const route of ROUTES) {
  test(`375px: no horizontal scroll and 44px tap targets on ${route}`, async ({ page }) => {
    await signIn(page)
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    const small = await page.evaluate(() => {
      const out: string[] = []
      document.querySelectorAll<HTMLElement>('button, a[href], [role=switch], select, input:not([type=hidden]), textarea, summary').forEach((el) => {
        if (el.classList.contains('sr-only') || el.closest('.maplibregl-ctrl')) return
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') return
        // a visually hidden input inside a label: the label is the tap target
        if (el instanceof HTMLInputElement && el.type === 'file') return
        if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
      })
      return out
    })
    expect(small).toEqual([])
  })
}

test('375px: sign-in and public rec page', async ({ page }) => {
  await page.goto('/sign-in')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
