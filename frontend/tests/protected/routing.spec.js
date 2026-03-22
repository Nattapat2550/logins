const { test, expect } = require('@playwright/test');

test.describe('Protected Routes (Route Guards)', () => {

  test.beforeEach(async ({ page }) => {
    // เคลียร์ LocalStorage ให้กลายเป็น Guest
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. เข้าหน้า home.html ไม่ได้ถ้ายังไม่ล็อกอิน (โดนเตะไปหน้า index.html)', async ({ page }) => {
    await page.goto('/home.html');
    
    // โค้ดจริงเตะไปหน้า index.html
    await expect(page).toHaveURL(/.*index\.html/);
  });

  test('2. เข้าหน้า settings.html ไม่ได้ถ้ายังไม่ล็อกอิน', async ({ page }) => {
    await page.goto('/settings.html');
    
    // โค้ดจริงเตะไปหน้า index.html
    await expect(page).toHaveURL(/.*index\.html/);
  });
});