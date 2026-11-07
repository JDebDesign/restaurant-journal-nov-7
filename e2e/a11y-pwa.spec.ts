import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

const ROUTES = ['/', '/places', '/log', '/want', '/asked', '/settings', '/visits/demo-v1']

for (const route of ROUTES) {
  test(`axe: no serious/critical violations on ${route}`, async ({ page }) => {
    await signIn(page)
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0].target}`)).toEqual([])
  })
}

test('axe: sign-in page', async ({ page }) => {
  await page.goto('/sign-in')
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(violations.map((v) => v.id)).toEqual([])
})

test('PWA: manifest, icons and service worker make the app installable', async ({ page, context }) => {
  await page.goto('/sign-in')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await page.request.get(href!)).json()
  expect(manifest).toMatchObject({ name: 'Recd', display: 'standalone', start_url: '/' })
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  for (const i of manifest.icons) expect((await page.request.get(i.src)).status()).toBe(200)

  await page.evaluate(() => navigator.serviceWorker.ready)
  const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
  expect(regs).toBeGreaterThan(0)

  const cdp = await context.newCDPSession(page)
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  expect(installabilityErrors).toEqual([])
})
