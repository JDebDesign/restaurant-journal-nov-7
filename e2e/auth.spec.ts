import { expect, test } from '@playwright/test'
import { PASSWORD, createAccount, freshEmail } from './helpers'

test('create a new account, sign out, sign back in', async ({ page }) => {
  const email = freshEmail()
  await createAccount(page, email)

  // lands on an empty journal, greeted by name derived from the email
  await expect(page.getByRole('heading', { name: /^Hi Tester/ })).toBeVisible()
  await expect(page.getByText('No meals logged yet')).toBeVisible()

  await page.goto('/settings')
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in/)

  // a signed-out visitor is bounced from app pages
  await page.goto('/places')
  await expect(page).toHaveURL(/\/sign-in/)

  // sign back in with the same credentials
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'My places' })).toBeVisible() // back on the page they originally asked for
  await expect(page).toHaveURL(/\/places$/)
})

test('session survives a reload', async ({ page }) => {
  await createAccount(page, freshEmail())
  await page.reload()
  await expect(page.getByRole('link', { name: /log a meal/i })).toBeVisible()
})

test('wrong password and unknown email show the same error', async ({ page }) => {
  const email = freshEmail()
  await createAccount(page, email)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('not the password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.')

  await page.getByLabel('Email').fill(freshEmail())
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click()
  await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.')
})

test('creating an account validates input and rejects duplicates', async ({ page, context }) => {
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Create account' }).first().click()

  await page.getByRole('button', { name: 'Create account' }).last().click()
  await expect(page.getByRole('alert')).toHaveText('Enter a valid email address.')

  await page.getByLabel('Email').fill('nobody@example.com')
  await page.getByLabel('Password').fill('short')
  await page.getByRole('button', { name: 'Create account' }).last().click()
  await expect(page.getByRole('alert')).toContainText('at least 8 characters')
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')

  // duplicate email
  const email = freshEmail()
  await createAccount(page, email)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('button', { name: 'Create account' }).first().click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).last().click()
  await expect(page.getByRole('alert')).toContainText('already exists')
  void context
})

test('accounts are separate: one user never sees another user\'s journal', async ({ page }) => {
  const a = freshEmail()
  await createAccount(page, a)
  await page.goto('/log')
  await page.getByLabel('Search a place').fill('chai')
  await page.getByRole('button', { name: /Chai Pani/ }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('link', { name: /Chai Pani/ })).toBeVisible()

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await createAccount(page, freshEmail())
  await expect(page.getByText('No meals logged yet')).toBeVisible()
  await expect(page.getByRole('link', { name: /Chai Pani/ })).toHaveCount(0)
})

test('password can be shown and hidden', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByLabel('Password').fill('hunter2hunter2')
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
})
