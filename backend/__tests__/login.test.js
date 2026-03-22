// backend/__tests__/login.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock, setupTestAccounts } = require('./testHelper.js');

let userEmail = 'testuser@example.com'; 
let userPassword = 'TestPassword123!'; 

describe('🔑 Standard Login API', () => {
  beforeAll(async () => {
    setupGlobalMock();
    
    // จำลองการสร้าง Account ก่อนทดสอบ หาก Test Helper ไม่ได้คืนรหัสผ่านมา ให้จำลองการสมัครใหม่ที่นี่
    await request(app).post('/api/auth/complete-profile').send({ 
        email: userEmail, 
        username: 'TestLoginUser', 
        password: userPassword 
    });
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
      password: 'WrongPassword999!'
    });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  it('❌ POST /api/auth/login - ล็อกอินไม่สำเร็จถ้าไม่มีอีเมลนี้ในระบบ', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'notfound_anywhere@example.com',
      password: 'Password123!'
    });
    
    expect([401, 404]).toContain(res.statusCode);
  });
});