const { test, expect } = require('@playwright/test');

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5500',
  'Access-Control-Allow-Credentials': 'true'
};

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

    // 1. Mock API ดึงข้อมูลตัวเอง
    await page.route('**/api/users/me', async route => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        // ส่งเป็น Object เพียวๆ เพราะ admin.js เช็คค่า me.role
        body: JSON.stringify({ id: 'admin1', role: 'admin', username: 'admin', email: 'admin@test.com' })
      });
    });

    // 2. Mock API ดึงข้อมูลผู้ใช้งานทั้งหมด
    await page.route('**/api/admin/users', async route => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        // ส่งเป็น Array เพียวๆ เพราะ admin.js ใช้ users.forEach()
        body: JSON.stringify([
          { id: '1', email: 'user1@test.com', username: 'user1', role: 'user' },
          { id: '2', email: 'admin@test.com', username: 'admin', role: 'admin' }
        ])
      });
    });

    // 3. Mock API ดึงข้อมูล Carousel (ถ้าไม่ Mock หน้าเว็บจะ Error แล้วหยุดทำงาน)
    await page.route('**/api/admin/carousel', async route => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]) // ส่ง Array ว่างกลับไป
      });
    });

    await page.goto('/admin.html');
    
    // รอให้หน้าโหลดและมั่นใจว่ายังอยู่ที่หน้า admin.html
    await expect(page).toHaveURL(/.*admin\.html/);
    
    // เช็คข้อมูลในตารางว่าเรนเดอร์อีเมลของ user1 ออกมาได้สำเร็จ
    await expect(page.locator('body')).toContainText('user1@test.com');
  });

});