const { test, expect } = require('@playwright/test');

test.describe('Frontend - Authentication & User Flow', () => {

  test('1. หน้า Register: กรอกอีเมลสำเร็จและพาไปหน้า check.html', async ({ page }) => {
    
    // 🚀 MOCK API: ดักจับ Request ที่ยิงไปหา backend และจำลองว่า "สำเร็จ"
    // เพื่อหลีกเลี่ยงปัญหา Backend ส่งอีเมลไม่ได้บน GitHub Actions
    await page.route('**/api/auth/register', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OTP sent to your email' })
      });
    });

    // 1. ไปที่หน้า Register
    await page.goto('/register.html');
    
    // 2. กรอกอีเมล
    await page.fill('#email', 'test_playwright@example.com');
    
    // 3. กดปุ่ม Submit
    await page.click('button[type="submit"]');
    
    // 4. เนื่องจากเรา Mock API ว่าสำเร็จแล้ว คราวนี้มันควรจะเปลี่ยนหน้าทันที
    await expect(page).toHaveURL(/.*check\.html/, { timeout: 5000 });
    
    // 5. เช็คว่ามีการเก็บค่าลง sessionStorage ตามโค้ดใน js
    const pendingEmail = await page.evaluate(() => sessionStorage.getItem('pendingEmail'));
    expect(pendingEmail).toBe('test_playwright@example.com');
  });

  test('2. หน้า Login: ทดสอบฟีเจอร์ Show/Hide Password', async ({ page }) => {
    await page.goto('/login.html');
    
    // พิมพ์รหัสผ่านลงไป
    await page.fill('#password', 'SecretPass123!');
    
    // เช็คว่าตอนแรก type เป็น password
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    
    // ติ๊กกล่อง Show Password
    await page.check('#showPw');
    
    // เช็คว่า type เปลี่ยนเป็น text แล้ว
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  });

  test('3. หน้า Login: แจ้งเตือนเมื่อกรอกข้อมูลผิด (User ไม่มีในระบบ)', async ({ page }) => {
    await page.goto('/login.html');
    
    await page.fill('#email', 'wrong_user@example.com');
    await page.fill('#password', 'WrongPassword!');
    
    // คลิก Login
    await page.click('button[type="submit"]');
    
    // เช็คว่ามีข้อความ Error ขึ้นที่แท็ก <p id="msg"></p> 
    // โดยข้อความต้องไม่เป็นค่าว่าง (แปลว่ามี Error จาก Backend ส่งมา)
    const msgLocator = page.locator('#msg');
    await expect(msgLocator).not.toBeEmpty({ timeout: 5000 });
  });

  test('4. หน้า Admin: ป้องกันการเข้าถึงหากไม่ใช่ผู้ดูแลระบบ', async ({ page }) => {
    // ไปที่หน้าเว็บเพื่อเซ็ต LocalStorage จำลอง
    await page.goto('/index.html'); 
    
    // จำลองสถานการณ์ว่ามียูสเซอร์ธรรมดาล็อกอินอยู่ (role = user)
    await page.evaluate(() => {
      localStorage.setItem('token', 'fake_user_token');
      localStorage.setItem('role', 'user'); 
    });

    // พยายามเข้าหน้า Admin
    await page.goto('/admin.html');
    
    // ตามลอจิกของ admin.js ถ้าไม่ใช่แอดมิน จะโดนเตะออก
    // เราก็เช็คว่า URL ต้องไม่ใช่หน้า admin.html
    await expect(page).not.toHaveURL(/.*admin\.html/);
  });

});