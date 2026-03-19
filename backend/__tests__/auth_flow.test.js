// backend/__tests__/auth_flow.test.js
const request = require('supertest');
const { setupGlobalMock } = require('./testHelper.js');

// 🛑 1. Mock ระบบส่งอีเมล (ไม่ให้ส่งเมลหาคนจริงๆ ตอนรันเทส)
jest.mock('../utils/gmail.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

// 🛑 2. Mock ระบบ Google Auth Library
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        getToken: jest.fn().mockResolvedValue({ tokens: { access_token: 'mock_token' } }),
        setCredentials: jest.fn(),
        generateAuthUrl: jest.fn().mockReturnValue('http://mock-google-url.com')
      }))
    },
    oauth2: jest.fn().mockReturnValue({
      userinfo: {
        get: jest.fn().mockResolvedValue({ 
          data: { id: 'oauth_123', email: 'googleuser@test.com', name: 'Google User', picture: '' } 
        })
      }
    })
  }
}));

const app = require('../server.js');

describe('🔐 Auth Flows (Register, Forgot Password, OAuth)', () => {
  beforeAll(() => setupGlobalMock());

  const newEmail = `new_${Date.now()}@example.com`;

  // ==========================================
  // 📝 1. REGISTER FLOW (สมัครสมาชิก)
  // ==========================================
  it('📝 POST /api/auth/register - สมัครสมาชิกใหม่และส่ง OTP สำเร็จ', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: newEmail });
    expect(res.statusCode).toEqual(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.emailSent).toBe(true); // เช็คว่า Mock เมลทำงาน
  });

  it('✅ POST /api/auth/verify-code - ยืนยันรหัส OTP ถูกต้อง', async () => {
    const res = await request(app).post('/api/auth/verify-code').send({ email: newEmail, code: '123456' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toBe(true);
  });

  it('👤 POST /api/auth/complete-profile - ตั้งชื่อและรหัสผ่านเสร็จสิ้น (เข้าสู่ระบบอัตโนมัติ)', async () => {
    const res = await request(app).post('/api/auth/complete-profile').send({ 
      email: newEmail, 
      username: 'MyNewUser', 
      password: 'StrongPassword123!' 
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toEqual('MyNewUser');
  });

  // ==========================================
  // 🔑 2. FORGOT PASSWORD FLOW (ลืมรหัสผ่าน)
  // ==========================================
  it('🔑 POST /api/auth/forgot-password - ส่งลิงก์รีเซ็ตรหัสผ่านเข้าเมล', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: newEmail });
    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toBe(true);
  });

  it('🔓 POST /api/auth/reset-password - เปลี่ยนรหัสผ่านใหม่สำเร็จ', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ 
      token: 'mock_reset_token', 
      newPassword: 'NewStrongPassword1!' 
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toBe(true);
  });

  // ==========================================
  // 🌐 3. GOOGLE OAUTH FLOW
  // ==========================================
  it('🌐 GET /api/auth/google - สร้ง URL สำหรับล็อกอิน Google สำเร็จ', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.statusCode).toEqual(302); // Redirect status
    expect(res.headers.location).toBe('http://mock-google-url.com');
  });

  it('📱 POST /api/auth/google-mobile - ล็อกอิน Google ผ่านฝั่ง Mobile สำเร็จ', async () => {
    const res = await request(app).post('/api/auth/google-mobile').send({ authCode: 'mock_mobile_auth_code' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toEqual('googleuser@test.com');
  });
});