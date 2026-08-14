// GRCell — Playwright E2E smoke (Test planı 1/5: kritik public axınlar)
// İcra:  npx playwright test tests/e2e/smoke.spec.ts
// Ön şərt: npm i -D @playwright/test && npx playwright install chromium
// BASE_URL env ilə hədəfi dəyiş (default: canlı sayt).
// Bunlar public (auth-suz) səhifələrdir — canlı datanı dəyişmir.

import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'https://grcell.com'

test('landing yüklənir və CTA görünür', async ({ page }) => {
  await page.goto(BASE + '/')
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.getByText('GRCell').first()).toBeVisible()
})

test('login səhifəsində forma sahələri var', async ({ page }) => {
  await page.goto(BASE + '/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

test('qeydiyyat səhifəsi açılır (rol seçimi olmadan)', async ({ page }) => {
  await page.goto(BASE + '/register')
  await expect(page.locator('input[name="full_name"]')).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
  // RBAC qaydası: qeydiyyatda rol seçimi OLMAMALIDIR (hamı employee başlayır)
  await expect(page.locator('select')).toHaveCount(0)
})

test('qorunan səhifə auth-suz login-ə yönləndirir', async ({ page }) => {
  await page.goto(BASE + '/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
