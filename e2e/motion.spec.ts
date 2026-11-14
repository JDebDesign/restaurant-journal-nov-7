import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

// Reads the running CSS animations on the Log button's circle and plus icon.
const READ = `(() => {
  const nav = document.querySelector('nav[aria-label=Main]')
  const circle = nav.querySelector('.press-pop')
  const icon = nav.querySelector('.press-spin')
  const info = (el) => el.getAnimations().map((a) => ({
    name: a.animationName,
    duration: a.effect.getTiming().duration,
    iterations: a.effect.getTiming().iterations,
    keyframes: a.effect.getKeyframes().map((k) => ({ offset: k.offset, scale: k.scale, translate: k.translate, rotate: k.rotate, easing: k.easing })),
    currentTime: a.currentTime,
  }))
  return { circle: info(circle), icon: info(icon) }
})()`

test('pressing Log plays the Figma pop + lift + spin motion', async ({ page }) => {
  await signIn(page)
  const log = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log', exact: true })
  const box = (await log.boundingBox())!

  // idle: nothing animating
  const idle = (await page.evaluate(READ)) as { circle: unknown[]; icon: unknown[] }
  expect(idle.circle).toHaveLength(0)
  expect(idle.icon).toHaveLength(0)

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  const m = (await page.evaluate(READ)) as {
    circle: { name: string; duration: number; iterations: number; keyframes: Record<string, unknown>[] }[]
    icon: { name: string; duration: number; iterations: number; keyframes: Record<string, unknown>[] }[]
  }

  expect(m.circle.map((a) => a.name).sort()).toEqual(['log-press-lift', 'log-press-scale'])
  expect(m.icon.map((a) => a.name)).toEqual(['log-press-spin'])
  for (const a of [...m.circle, ...m.icon]) {
    expect(a.duration).toBe(2000)
    expect(a.iterations).toBe(1) // plays once per press, not a loop
  }

  const at = (a: { keyframes: Record<string, unknown>[] }, offset: number) => a.keyframes.find((k) => Math.abs((k.offset as number) - offset) < 1e-6)
  const scale = m.circle.find((a) => a.name === 'log-press-scale')!
  expect(scale.keyframes.map((k) => k.offset)).toEqual([0, 0.04, 0.115, 0.2, 0.425, 0.54, 1])
  expect(at(scale, 0.04)!.scale).toBe('1.06 0.96') // anticipation squash
  expect(at(scale, 0.115)!.scale).toBe('1.13') // pop (the browser reports equal x/y as one value)
  expect(at(scale, 0.2)!.scale).toBe('1.08') // settle and hold
  expect(at(scale, 0.54)!.scale).toBe('1') // release

  const lift = m.circle.find((a) => a.name === 'log-press-lift')!
  expect(lift.keyframes.map((k) => k.offset)).toEqual([0, 0.115, 0.2, 0.425, 0.54, 1])
  expect(at(lift, 0.115)!.translate).toBe('0px -3px')

  const spin = m.icon[0]
  expect(spin.keyframes.map((k) => k.offset)).toEqual([0, 0.05, 0.14, 0.22, 0.425, 0.54, 1])
  expect(at(spin, 0.14)!.rotate).toBe('100deg') // overshoot
  expect(at(spin, 0.22)!.rotate).toBe('90deg') // settle
  expect(at(spin, 0)!.easing).toBe('cubic-bezier(0.5, 0, 0.5, 1)')
  await page.mouse.up()

  // the tap still navigates
  await expect(page).toHaveURL(/\/log$/)
})

test('a second press restarts the motion', async ({ page }) => {
  await signIn(page)
  const log = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log', exact: true })
  await log.dispatchEvent('pointerdown')
  await page.waitForTimeout(400)
  const t1 = ((await page.evaluate(READ)) as { circle: { currentTime: number }[] }).circle[0].currentTime
  expect(t1).toBeGreaterThan(300)
  await log.dispatchEvent('pointerdown')
  const t2 = ((await page.evaluate(READ)) as { circle: { currentTime: number }[] }).circle[0].currentTime
  expect(t2).toBeLessThan(200) // restarted from the beginning
})

test('keyboard activation plays the motion too', async ({ page }) => {
  await signIn(page)
  const log = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log', exact: true })
  await log.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/log$/)
  const m = (await page.evaluate(READ)) as { circle: unknown[]; icon: unknown[] }
  expect(m.circle).toHaveLength(2)
  expect(m.icon).toHaveLength(1)
})

test('prefers-reduced-motion: no animation on press', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page)
  const log = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log', exact: true })
  await log.dispatchEvent('pointerdown')
  const m = (await page.evaluate(READ)) as { circle: unknown[]; icon: unknown[] }
  expect(m.circle).toHaveLength(0)
  expect(m.icon).toHaveLength(0)
  await log.click()
  await expect(page).toHaveURL(/\/log$/)
})
