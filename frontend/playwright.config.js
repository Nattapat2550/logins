// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests', // ระบุโฟลเดอร์ที่เก็บไฟล์เทส Frontend
  timeout: 30000,     // ให้เวลาเทสสูงสุด 30 วินาทีต่อ 1 เทส
  fullyParallel: true,
  reporter: 'html',
  use: {
    // ตั้งค่า Base URL ให้ตรงกับพอร์ตที่เปิดไว้ใน GitHub Actions (พอร์ต 5500)
    baseURL: 'http://127.0.0.1:5500', 
    trace: 'on-first-retry',
    headless: true,   // บังคับให้รันแบบไม่เปิดหน้าต่าง UI (จำเป็นมากสำหรับ GitHub Actions)
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
});