const { test, expect } = require('@playwright/test');

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5500',
  'Access-Control-Allow-Credentials': 'true'
};

test.describe('Register Flow UI', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/register.html'); 
  });

  test('1. สมัครสมาชิกสำเร็จ ระบบแสดงข้อความให้ไปตรวจสอบอีเมล', async ({ page }) => {
    await page.route('**/api/auth/register', async route => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      await route.fulfill({
        status: 201,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, emailSent: true })
      });
    });

    await page.fill('#email', 'new_ui_user@example.com');
    // หากมีฟิลด์รหัสผ่านด้วย ให้กรอกเพิ่มที่นี่
    // await page.fill('#password', 'Password123!');
    
    await page.click('button[type="submit"]');

    // ตรวจสอบว่าหน้าจอแสดงข้อความส่งอีเมล OTP สำเร็จ
    await expect(page.locator('#msg')).toBeVisible();
  });
});