// backend/__tests__/api.test.js
const request = require('supertest');
const app = require('../server.js');
const { callPureApi } = require('../utils/pureApi.js'); 
const { findUserByEmail, deleteUser } = require('../models/user.js');

let userToken = '';
let adminToken = '';
let testUserId = null;
let testAdminId = null;

const testUser = {
  email: `testuser_${Date.now()}@example.com`,
  password: 'Password123!',
  username: 'TestUser'
};

const testAdmin = {
  email: `testadmin_${Date.now()}@example.com`,
  password: 'Password123!',
  username: 'TestAdmin'
};

describe('🚀 Full Backend API Test Suite', () => {

  // =========================================================
  // ⚙️ SETUP: จำลอง User & Admin ผ่านระบบ (ก่อนเริ่มเทส)
  // =========================================================
  beforeAll(async () => {
    console.log('⏳ [Setup] กำลังเตรียมข้อมูลสำหรับเทส...');
    
    try {
      // 1. สร้าง Test User ธรรมดา (เรียกผ่าน Pure API ตรงๆ เพื่อข้ามขั้นตอนการยันยัน OTP)
      await callPureApi('/create-user-email', { email: testUser.email });
      await callPureApi('/set-username-password', { 
        email: testUser.email, 
        username: testUser.username, 
        password: testUser.password 
      });

      // 2. สร้าง Test Admin
      await callPureApi('/create-user-email', { email: testAdmin.email });
      await callPureApi('/set-username-password', { 
        email: testAdmin.email, 
        username: testAdmin.username, 
        password: testAdmin.password 
      });
      // อัปเดตสิทธิ์ Admin (ใน auth.js เช็คแบบตัวพิมพ์เล็ก 'admin')
      await callPureApi('/admin/users/update', { 
        email: testAdmin.email, 
        role: 'admin' 
      });

      // 3. ดึง ID มาเก็บไว้ใช้ตอนลบ (Teardown)
      const u = await findUserByEmail(testUser.email);
      if (u) testUserId = u.id;

      const a = await findUserByEmail(testAdmin.email);
      if (a) testAdminId = a.id;

      // 4. ล็อกอินผ่าน Express API เพื่อนำ Token มาใช้ในการเทส Route ต่างๆ
      const resAdmin = await request(app).post('/api/auth/login').send({ email: testAdmin.email, password: testAdmin.password });
      adminToken = resAdmin.body.token || '';

      const resUser = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
      userToken = resUser.body.token || '';
      
      if (!adminToken || !userToken) {
        console.warn('⚠️ คำเตือน: สร้าง Token ไม่สำเร็จ (การเทสที่ใช้ Auth อาจพังได้)');
      }
    } catch (err) {
      console.error('❌ [Setup Error] เตรียมข้อมูลไม่สำเร็จ:', err.message);
    }
  });

  // =========================================================
  // 🟢 1. SYSTEM ROUTES
  // =========================================================
  describe('1. System Routes', () => {
    it('GET /healthz - ควรทำงานได้ปกติ', async () => {
      const res = await request(app).get('/healthz');
      expect(res.statusCode).toEqual(200);
      expect(res.body.ok).toBe(true);
    });

    it('GET /api/unknown - ควรได้ 404 Not Found', async () => {
      const res = await request(app).get('/api/route-that-does-not-exist');
      expect(res.statusCode).toEqual(404);
    });
  });

  // =========================================================
  // 🔵 2. AUTH ROUTES
  // =========================================================
  describe('2. Auth Routes', () => {
    it('POST /login - ล็อกอิน User ธรรมดาสำเร็จ', async () => {
      const res = await request(app).post('/api/auth/login').send({ 
        email: testUser.email, 
        password: testUser.password 
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token'); 
    });

    it('POST /login - ล็อกอินล้มเหลวเมื่อรหัสผิด', async () => {
      const res = await request(app).post('/api/auth/login').send({ 
        email: testUser.email, 
        password: 'WrongPassword' 
      });
      expect(res.statusCode).toEqual(401);
    });

    it('POST /logout - ออกจากระบบ', async () => {
      const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toEqual(200); 
    });
  });

  // =========================================================
  // 🟠 3. USER ROUTES
  // =========================================================
  describe('3. User Routes', () => {
    it('GET /status - ตรวจสอบสถานะตัวเองได้เมื่อใส่ Token', async () => {
      // แก้จาก /me เป็น /status เพราะดูจาก auth.js คุณใช้ route /status 
      const res = await request(app).get('/api/auth/status').set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.authenticated).toBe(true);
    });

    it('GET /status - ข้อมูลตัวเองไม่ได้ถ้าไม่ใส่ Token (authenticated: false)', async () => {
      const res = await request(app).get('/api/auth/status');
      expect(res.body.authenticated).toBe(false);
    });
  });

  // =========================================================
  // 🔴 4. ADMIN ROUTES
  // =========================================================
  describe('4. Admin Routes', () => {
    it('GET /users - User ธรรมดาห้ามดูรายชื่อผู้ใช้ (401/403)', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${userToken}`);
      expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /users - Admin สามารถดูรายชื่อผู้ใช้ได้ (200 OK)', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
    });
  });

  // =========================================================
  // 🖼️ 5. CAROUSEL ROUTES
  // =========================================================
  describe('5. Carousel Routes', () => {
    it('GET / - ทุกคนดูแบนเนอร์ได้ (Public)', async () => {
      const res = await request(app).get('/api/carousel');
      expect([200, 404]).toContain(res.statusCode); // เผื่อกรณี Database ว่างเปล่า
    });

    it('POST / - User ธรรมดาสร้างแบนเนอร์ไม่ได้ (401/403)', async () => {
      const res = await request(app)
        .post('/api/carousel')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ image_url: 'http://test.com/img.jpg' });
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // =========================================================
  // 🏠 6. HOMEPAGE ROUTES
  // =========================================================
  describe('6. Homepage Routes', () => {
    it('GET /hero - ดูข้อมูลส่วน Hero (Public)', async () => {
      const res = await request(app).get('/api/homepage/hero');
      expect([200, 404]).toContain(res.statusCode);
    });

    it('PUT /hero - User ธรรมดาแก้ข้อมูลหน้าแรกไม่ได้ (401/403)', async () => {
      const res = await request(app)
        .put('/api/homepage/hero')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hack Title' });
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // =========================================================
  // 🧹 TEARDOWN: ลบข้อมูลที่เทสทิ้งอัตโนมัติ
  // =========================================================
  afterAll(async () => {
    console.log('🧹 [Teardown] กำลังลบข้อมูลเทส...');
    try {
      // เรียกใช้คำสั่ง deleteUser ผ่านโมเดล (ใช้ id ในการลบ)
      if (testUserId) await deleteUser(testUserId);
      if (testAdminId) await deleteUser(testAdminId);
      console.log('✨ ลบข้อมูลเทสสำเร็จ!');
    } catch (err) {
      console.error('❌ [Teardown Error] ลบข้อมูลไม่สำเร็จ:', err.message);
    }
  });

});