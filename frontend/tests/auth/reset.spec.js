const { test, expect } = require('@playwright/test');

// ตั้งค่า CORS ให้ตรงกับที่เบราว์เซอร์ต้องการเมื่อมี credentials: 'include'
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5500',
  'Access-Control-Allow-Credentials': 'true'
};

test.describe('Password Reset Flow', () => {

  test.describe('Part 1: Request Reset Link', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/reset.html');
    });

    test('1.1 แสดงฟอร์มขอลิงก์ และซ่อนฟอร์มตั้งรหัสผ่าน', async ({ page }) => {
      await expect(page.locator('#requestBox')).toBeVisible();
      await expect(page.locator('#resetBox')).toBeHidden();
    });

    test('1.2 ส่งอีเมลขอลิงก์สำเร็จ', async ({ page }) => {
      await page.route('**/api/auth/forgot-password', async route => {
        // ดักจับ Preflight (OPTIONS)
        if (route.request().method() === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: corsHeaders });
        }
        await route.fulfill({ 
          status: 200, 
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Email sent' })
        });
      });

      await page.fill('#email', 'forgot@example.com');
      await page.click('#requestForm button[type="submit"]');
      await expect(page.locator('#msg')).toHaveText('If that email exists, a reset link was sent.');
    });

    test('1.3 แสดง Error เมื่อ API มีปัญหา', async ({ page }) => {
      await page.route('**/api/auth/forgot-password', async route => {
        if (route.request().method() === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: corsHeaders });
        }
        await route.fulfill({ 
          status: 500, 
          headers: corsHeaders,
          contentType: 'application/json',
          // โค้ดใน main.js คุณใช้ j.error ในการแสดงข้อความ
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.fill('#email', 'error@example.com');
      await page.click('#requestForm button[type="submit"]');
      await expect(page.locator('#msg')).toHaveText(/(Internal Server Error|Request failed)/);
    });
  });

  test.describe('Part 2: Set New Password', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/reset.html?token=fake_reset_token_123');
    });

    test('2.1 ซ่อนฟอร์มขอลิงก์ และแสดงฟอร์มตั้งรหัสผ่านใหม่', async ({ page }) => {
      await expect(page.locator('#requestBox')).toBeHidden();
      await expect(page.locator('#resetBox')).toBeVisible();
    });

    test('2.2 ตั้งรหัสผ่านใหม่สำเร็จ', async ({ page }) => {
      await page.route('**/api/auth/reset-password', async route => {
        if (route.request().method() === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: corsHeaders });
        }
        await route.fulfill({ 
          status: 200, 
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Password updated' })
        });
      });

      await page.fill('#newPassword', 'NewPassword123!');
      await page.click('#resetForm button[type="submit"]');
      await expect(page.locator('#msg')).toHaveText('Password set. You can login now.');
    });

    test('2.3 ตั้งรหัสผ่านใหม่ไม่สำเร็จ (เช่น Token หมดอายุ)', async ({ page }) => {
      await page.route('**/api/auth/reset-password', async route => {
        if (route.request().method() === 'OPTIONS') {
          return route.fulfill({ status: 204, headers: corsHeaders });
        }
        await route.fulfill({ 
          status: 400, 
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token is invalid or expired' })
        });
      });

      await page.fill('#newPassword', 'NewPassword123!');
      await page.click('#resetForm button[type="submit"]');
      await expect(page.locator('#msg')).toHaveText(/(Token is invalid or expired|Request failed)/);
    });
  });

});