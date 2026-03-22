const { test, expect } = require('@playwright/test');

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5500',
  'Access-Control-Allow-Credentials': 'true'
};

test.describe('Register Flow UI', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/register.html'); 
  });

  test('1. สมัครสมาชิกสำเร็จ ระบบเด้งไปหน้า check.html เพื่อตรวจสอบอีเมล', async ({ page }) => {
    // 1. Mock API ข้ามการเช็ค Preview
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

    // 2. กรอกอีเมลและกดปุ่ม
    await page.fill('#email', 'new_ui_user@example.com');
    await page.click('button[type="submit"]');

    // ✅ แก้ไขตรงนี้: เช็คว่า URL ถูกเปลี่ยนไปที่ check.html แทนการดักรอข้อความ
    await expect(page).toHaveURL(/.*check\.html/);
  });
});