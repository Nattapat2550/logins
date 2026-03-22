const { test, expect } = require('@playwright/test');

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5500',
  'Access-Control-Allow-Credentials': 'true'
};

test.describe('Login Flow UI', () => {

  test.beforeEach(async ({ page }) => {
    // เปลี่ยน URL ไปยังหน้าล็อกอินของคุณ (เช่น /login.html หรือ /index.html)
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

    // ตรวจสอบว่า Route ทำการเปลี่ยนไปหน้า home.html สำเร็จ
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
        body: JSON.stringify({ error: 'Invalid email or password' })
      });
    });

    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'WrongPassword!');
    await page.click('button[type="submit"]');

    // ตรวจสอบกล่องข้อความแจ้งเตือน Error บนหน้าจอ (สมมติว่าใช้ id="msg")
    await expect(page.locator('#msg')).toContainText(/Invalid/);
  });
});