const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard Access & Features', () => {

  test('1. User ธรรมดาพยายามเข้าหน้า Admin จะถูกเตะออก', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.setItem('token', 'user_token');
      localStorage.setItem('role', 'user'); 
    });

    await page.goto('/admin.html');
    await expect(page).not.toHaveURL(/.*admin\.html/);
  });

  test('2. Admin สามารถเข้าหน้า Dashboard และโหลดข้อมูลผู้ใช้ได้', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.setItem('token', 'admin_token');
      localStorage.setItem('role', 'admin'); 
    });

    // 🚀 เพิ่ม Mock ดักการตรวจสอบ Token ของหน้าเว็บ
    await page.route('**/api/users/me', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { role: 'admin' } })
      });
    });

    // จำลอง API ดึงข้อมูล User
    await page.route('**/api/admin/users', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { _id: '1', email: 'user1@test.com', role: 'user' },
            { _id: '2', email: 'admin@test.com', role: 'admin' }
          ]
        })
      });
    });

    await page.goto('/admin.html');
    // รอบนี้ไม่โดนเตะแล้ว!
    await expect(page).toHaveURL(/.*admin\.html/);
    await expect(page.locator('body')).toContainText('user1@test.com');
  });
});