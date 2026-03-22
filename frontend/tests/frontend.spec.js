// tests/frontend.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Frontend - Authentication & User Flow', () => {

  test('1. หน้า Register: สมัครสมาชิกใหม่สำเร็จ', async ({ page }) => {
    // ไปที่หน้า Register
    await page.goto('/register.html');
    
    // กรอกข้อมูลฟอร์ม
    await page.fill('#username', 'testuser_ui');
    await page.fill('#email', 'testuser_ui@example.com');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm_password', 'Password123!');
    
    // ดักจับ Alert ว่าขึ้นข้อความสำเร็จหรือไม่
    page.on('dialog', async dialog => {
      expect(dialog.message().toLowerCase()).toContain('success');
      await dialog.accept();
    });

    // กดปุ่ม Submit
    await page.click('button[type="submit"]');
  });

  test('2. หน้า Login: เข้าสู่ระบบสำเร็จและพาไปหน้า Home', async ({ page }) => {
    await page.goto('/login.html');
    
    await page.fill('#email', 'testuser_ui@example.com');
    await page.fill('#password', 'Password123!');
    
    // คลิก Login
    await page.click('button[type="submit"]');
    
    // เช็คว่าพาไปหน้า home.html หรือ index.html สำเร็จหรือไม่ (ภายใน 5 วินาที)
    await expect(page).toHaveURL(/.*(home|index)\.html/, { timeout: 5000 });
    
    // เช็คว่ามี Token ถูกเก็บลงใน LocalStorage แล้ว
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('3. หน้า Login: แจ้งเตือนเมื่อกรอกรหัสผ่านผิด', async ({ page }) => {
    await page.goto('/login.html');
    await page.fill('#email', 'testuser_ui@example.com');
    await page.fill('#password', 'WrongPassword!');
    
    page.on('dialog', async dialog => {
      expect(dialog.message().toLowerCase()).toContain('invalid');
      await dialog.accept();
    });

    await page.click('button[type="submit"]');
  });

  test('4. หน้า Admin: ป้องกันการเข้าถึงหากไม่ใช่ผู้ดูแลระบบ', async ({ page }) => {
    // จำลองสถานการณ์ว่ามียูสเซอร์ธรรมดาล็อกอินอยู่
    await page.goto('/login.html'); // เปิดหน้าเว็บก่อนเซ็ต Storage
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake_user_token');
      localStorage.setItem('role', 'user'); 
    });

    // พยายามเข้าหน้า Admin
    await page.goto('/admin.html');
    
    // ระบบควรจะเตะกลับไปหน้า login หรือ home (ไม่ควรอยู่หน้า admin)
    await expect(page).not.toHaveURL(/.*admin\.html/);
  });

});