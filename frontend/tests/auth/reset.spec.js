const { test, expect } = require('@playwright/test');

test.describe('Password Reset Flow', () => {

  // ==========================================
  // 1. หมวด: ขอลิงก์รีเซ็ตรหัสผ่าน (ยังไม่มี Token)
  // ==========================================
  test.describe('Part 1: Request Reset Link', () => {
    
    test.beforeEach(async ({ page }) => {
      // เข้าหน้า reset.html แบบปกติ
      await page.goto('/reset.html');
    });

    test('1.1 แสดงฟอร์มขอลิงก์ และซ่อนฟอร์มตั้งรหัสผ่าน', async ({ page }) => {
      await expect(page.locator('#requestBox')).toBeVisible();
      await expect(page.locator('#resetBox')).toBeHidden();
    });

    test('1.2 ส่งอีเมลขอลิงก์สำเร็จ', async ({ page }) => {
      // Mock API จำลองว่าส่งอีเมลสำเร็จ
      await page.route('**/api/auth/forgot-password', async route => {
        await route.fulfill({ 
          status: 200, 
          json: { success: true, message: 'Email sent' } 
        });
      });

      await page.fill('#email', 'forgot@example.com');
      await page.click('#requestForm button[type="submit"]');

      // ตรวจสอบข้อความแจ้งเตือนตามที่ตั้งไว้ใน reset.js
      await expect(page.locator('#msg')).toHaveText('If that email exists, a reset link was sent.');
    });

    test('1.3 แสดง Error เมื่อ API มีปัญหา', async ({ page }) => {
      // Mock API จำลองว่ามี Error จากระบบ
      await page.route('**/api/auth/forgot-password', async route => {
        await route.fulfill({ 
          status: 500, 
          json: { success: false, message: 'Internal Server Error' } 
        });
      });

      await page.fill('#email', 'error@example.com');
      await page.click('#requestForm button[type="submit"]');

      await expect(page.locator('#msg')).toHaveText('Internal Server Error');
    });
  });

  // ==========================================
  // 2. หมวด: ตั้งรหัสผ่านใหม่ (มี Token แนบมาใน URL)
  // ==========================================
  test.describe('Part 2: Set New Password', () => {
    
    test.beforeEach(async ({ page }) => {
      // จำลองสถานการณ์ว่าผู้ใช้กดลิงก์มาจากในอีเมล (มี ?token=...)
      await page.goto('/reset.html?token=fake_reset_token_123');
    });

    test('2.1 ซ่อนฟอร์มขอลิงก์ และแสดงฟอร์มตั้งรหัสผ่านใหม่', async ({ page }) => {
      // โค้ดใน reset.js ต้องทำงานเพื่อสลับกล่องแสดงผล
      await expect(page.locator('#requestBox')).toBeHidden();
      await expect(page.locator('#resetBox')).toBeVisible();
    });

    test('2.2 ตั้งรหัสผ่านใหม่สำเร็จ และส่ง Token ไปถูกต้อง', async ({ page }) => {
      await page.route('**/api/auth/reset-password', async route => {
        // เช็คก่อนว่า Payload ที่ยิงไปหา API มี Token ถูกต้องตาม URL ด้านบนหรือไม่
        const postData = JSON.parse(route.request().postData());
        expect(postData.token).toBe('fake_reset_token_123');
        expect(postData.newPassword).toBe('NewPassword123!');

        // ตอบกลับว่าสำเร็จ
        await route.fulfill({ 
          status: 200, 
          json: { success: true, message: 'Password updated' } 
        });
      });

      await page.fill('#newPassword', 'NewPassword123!');
      await page.click('#resetForm button[type="submit"]');

      // ตรวจสอบข้อความว่าตั้งรหัสผ่านสำเร็จ
      await expect(page.locator('#msg')).toHaveText('Password set. You can login now.');
    });

    test('2.3 ตั้งรหัสผ่านใหม่ไม่สำเร็จ (เช่น Token หมดอายุ)', async ({ page }) => {
      await page.route('**/api/auth/reset-password', async route => {
        await route.fulfill({ 
          status: 400, 
          json: { success: false, message: 'Token is invalid or expired' } 
        });
      });

      await page.fill('#newPassword', 'NewPassword123!');
      await page.click('#resetForm button[type="submit"]');

      await expect(page.locator('#msg')).toHaveText('Token is invalid or expired');
    });
  });

});