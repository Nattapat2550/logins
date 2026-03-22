const { test, expect } = require('@playwright/test');

test.describe('Protected Routes (Route Guards)', () => {

  test.beforeEach(async ({ page }) => {
    // เคลียร์ LocalStorage ให้กลายเป็น Guest (ยังไม่ล็อกอิน)
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. เข้าหน้า home.html ไม่ได้ถ้ายังไม่ล็อกอิน (โดนเตะไป login)', async ({ page }) => {
    await page.goto('/home.html');
    await expect(page).toHaveURL(/.*login\.html/);
  });

  test('2. เข้าหน้า settings.html ไม่ได้ถ้ายังไม่ล็อกอิน', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page).toHaveURL(/.*login\.html/);
  });

  test('3. เข้าหน้า download.html ไม่ได้ถ้ายังไม่ล็อกอิน', async ({ page }) => {
    await page.goto('/download.html');
    await expect(page).toHaveURL(/.*login\.html/);
  });
});