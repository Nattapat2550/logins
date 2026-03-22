const { test, expect } = require('@playwright/test');

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5500',
  'Access-Control-Allow-Credentials': 'true'
};

test.describe('Login Flow UI', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html'); 
  });

  test('1. ล็อกอินสำเร็จและพาผู้ใช้ไปหน้า Home', async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock_token_123', user: { id: 'user1', role: 'user' } })
      });
    });

    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'ValidPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*home\.html/);
  });

  test('2. ล็อกอินไม่สำเร็จ (รหัสผ่านผิด)', async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      await route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        // api() wrapper ของคุณอาจจะไม่ได้ใช้ error field นี้ แต่เรา mock ไว้เผื่อ
        body: JSON.stringify({ error: 'Invalid email or password' })
      });
    });

    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'WrongPassword!');
    await page.click('button[type="submit"]');

    // ✅ แก้ไขตรงนี้: เช็คให้ตรงกับสิ่งที่ frontend api() สร้างออกมา (Unauthorized หรือ Invalid)
    await expect(page.locator('#msg')).toContainText(/(Invalid|Unauthorized)/i);
  });
});