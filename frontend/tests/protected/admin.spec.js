const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard Access & Features', () => {

  test('1. User ธรรมดาพยายามเข้าหน้า Admin จะถูกเตะออก', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.setItem('token', 'user_token');
      localStorage.setItem('role', 'user'); 
    });

    await page.goto('/admin.html');
    // ต้องถูกเตะกลับไปหน้า Login หรือ Home (ตามโค้ดใน js ของคุณ)
    await expect(page).not.toHaveURL(/.*admin\.html/);
  });

  test('2. Admin สามารถเข้าหน้า Dashboard และโหลดข้อมูลผู้ใช้ได้', async ({ page }) => {
    // จำลองว่าเราเป็น Admin
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.setItem('token', 'admin_token');
      localStorage.setItem('role', 'admin'); 
    });

    // จำลอง API ดึงข้อมูล User ทั้งหมด
    await page.route('**/api/admin/users', async route => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            { _id: '1', email: 'user1@test.com', role: 'user' },
            { _id: '2', email: 'admin@test.com', role: 'admin' }
          ]
        }
      });
    });

    await page.goto('/admin.html');
    await expect(page).toHaveURL(/.*admin\.html/);
    
    // ตรวจสอบว่ามีการเรนเดอร์ข้อมูลผู้ใช้ลงในตาราง (สมมติว่าตารางใช้แท็ก tr)
    // หรือเช็คว่ามีอีเมลแสดงบนหน้าจอ
    await expect(page.locator('body')).toContainText('user1@test.com');
  });
});