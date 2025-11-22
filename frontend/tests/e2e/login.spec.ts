import { test } from '@playwright/test'
import assert from 'node:assert'

test('login page renders', async ({ page }) => {
  await page.goto('http://localhost:4173/')
  await page.waitForURL('**/login')
  assert(await page.getByRole('heading', { name: /Sign in/i }).isVisible())
  assert(await page.getByLabel('Username').isVisible())
  assert(await page.getByLabel('Password').isVisible())
  assert(await page.getByRole('button', { name: /Sign in/i }).isVisible())
})