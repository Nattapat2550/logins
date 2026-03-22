// backend/__tests__/login.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock, setupTestAccounts } = require('./testHelper.js');

let userEmail = ''; 
let userPassword = ''; 

describe('🔑 Standard Login API', () => {
  beforeAll(async () => {
    // 1. ตั้งค่า Mock DB ก่อน
    setupGlobalMock();
    
    // 2. ใช้ Helper ที่มีอยู่แล้วสร้าง Account ขึ้นมาให้ถูกต้องครบ Flow
    const accounts = await setupTestAccounts(app);
    
    // 3. ดึงอีเมลและรหัสผ่านจากบัญชีจำลองมาใช้เทสต์
    userEmail = accounts.testUserConfig.email;
    userPassword = accounts.testUserConfig.password;
  });

  it('✅ POST /api/auth/login - ล็อกอินสำเร็จด้วย Email และ Password ที่ถูกต้อง', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password: userPassword
    });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', userEmail);
  });

  it('❌ POST /api/auth/login - ล็อกอินไม่สำเร็จถ้ารหัสผ่านผิด', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: userEmail,
      password: 'WrongPassword999!' // รหัสผ่านมั่ว
    });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  it('❌ POST /api/auth/login - ล็อกอินไม่สำเร็จถ้าไม่มีอีเมลนี้ในระบบ', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'notfound_anywhere@example.com',
      password: 'Password123!'
    });
    
    expect([401, 404]).toContain(res.statusCode); // API อาจจะตอบ 401 หรือ 404 ก็ได้ขึ้นอยู่กับการเขียน
  });
});