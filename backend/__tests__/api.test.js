// backend/__tests__/api.test.js
const request = require('supertest');
const app = require('../server.js');
const { callPureApi } = require('../utils/pureApi.js'); // ใช้ pureApi คุยกับ Rust แทนการต่อ DB ตรงๆ

let userToken = '';
let adminToken = '';
let createdCarouselId = null;

const testUser = {
  email: `user_${Date.now()}@example.com`,
  password: 'Password123!',
  username: 'Normal User'
};

const testAdmin = {
  email: `admin_${Date.now()}@example.com`,
  password: 'Password123!',
  username: 'Admin User'
};

describe('🚀 Full Backend API Test Suite', () => {

  // =========================================================
  // ⚙️ SETUP: จำลอง User & Admin ผ่านระบบ (ก่อนเริ่มเทส)
  // =========================================================
  beforeAll(async () => {
    console.log('⏳ [Setup] กำลังเตรียมข้อมูลสำหรับเทส...');
    
    // 1. สมัครสมาชิก User ธรรมดา (สำหรับใช้เทส)
    await request(app).post('/api/auth/register').send({ 
      email: testUser.email, 
      password: testUser.password 
    });

    // 2. สมัครสมาชิก Admin (สำหรับใช้เทส)
    await request(app).post('/api/auth/register').send({ 
      email: testAdmin.email, 
      password: testAdmin.password 
    });
    
    // 3. ขอให้ Rust เปลี่ยนสิทธิ์อีเมลของ Admin ให้เป็น Role 'ADMIN' (ยิงผ่าน Internal API)
    await callPureApi('/admin/users/update', 'POST', { 
      email: testAdmin.email, 
      role: 'ADMIN' 
    });

    // 4. ล็อกอินเข้าสู่ระบบเพื่อเอา Token ของทั้งคู่มาเก็บไว้ใช้ยิงเทส
    const resAdmin = await request(app).post('/api/auth/login').send({ email: testAdmin.email, password: testAdmin.password });
    adminToken = resAdmin.body.token || (resAdmin.body.data && resAdmin.body.data.token) || '';

    const resUser = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
    userToken = resUser.body.token || (resUser.body.data && resUser.body.data.token) || '';
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

    it('GET /api/unknown - ควรได้ 404 Not Found เมื่อเข้า Route ที่ไม่มีจริง', async () => {
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
      expect(res.body).toHaveProperty('token'); // หรือ data.token
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
      expect([200, 204, 404]).toContain(res.statusCode); 
    });
  });

  // =========================================================
  // 🟠 3. USER ROUTES
  // =========================================================
  describe('3. User Routes', () => {
    it('GET /me - ดูข้อมูลตัวเองได้เมื่อใส่ Token', async () => {
      const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toEqual(200);
    });

    it('GET /me - ดูข้อมูลตัวเองไม่ได้ถ้าไม่ใส่ Token (401)', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.statusCode).toEqual(401);
    });
  });

  // =========================================================
  // 🔴 4. ADMIN ROUTES
  // =========================================================
  describe('4. Admin Routes', () => {
    it('GET /users - User ธรรมดาห้ามดูรายชื่อผู้ใช้ (403 Forbidden)', async () => {
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
      expect(res.statusCode).toEqual(200);
    });

    it('POST / - User ธรรมดาสร้างแบนเนอร์ไม่ได้ (403)', async () => {
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
      expect(res.statusCode).toEqual(200);
    });

    it('PUT /hero - User ธรรมดาแก้ข้อมูลหน้าแรกไม่ได้ (403)', async () => {
      const res = await request(app)
        .put('/api/homepage/hero')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hack Title' });
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // =========================================================
  // 📦 7. DOWNLOAD ROUTES
  // =========================================================
  describe('7. Download Routes', () => {
    it('GET /windows - ดาวน์โหลดไฟล์ Windows', async () => {
      const res = await request(app).get('/api/download/windows');
      expect([200, 302, 404]).toContain(res.statusCode); 
    });

    it('GET /android - ดาวน์โหลดไฟล์ Android', async () => {
      const res = await request(app).get('/api/download/android');
      expect([200, 302, 404]).toContain(res.statusCode);
    });
  });

  // =========================================================
  // 🧹 TEARDOWN: ลบสแปมทิ้งอัตโนมัติ (หลังเทสจบ)
  // =========================================================
  afterAll(async () => {
    console.log('🧹 [Teardown] กำลังส่งคำสั่งไปให้ Rust ลบข้อมูลสแปม...');
    try {
      // ให้ Rust เป็นคนไปจัดการลบข้อมูลที่อยู่ใน Database ให้แทน
      await callPureApi('/delete-user', 'POST', { email: testUser.email });
      await callPureApi('/delete-user', 'POST', { email: testAdmin.email });
      console.log('✨ ลบข้อมูลเทสสำเร็จ!');
    } catch (err) {
      console.error('❌ ลบข้อมูลไม่สำเร็จ:', err.message);
    }
  });

});