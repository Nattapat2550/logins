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