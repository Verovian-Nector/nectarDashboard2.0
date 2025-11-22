import { test } from '@playwright/test'
import assert from 'node:assert'

test('home redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('http://localhost:4173/')
  await page.waitForURL('**/login')
  assert(await page.getByRole('heading', { name: /Sign in/i }).isVisible())
})