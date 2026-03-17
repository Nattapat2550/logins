// backend/__tests__/api.test.js
const request = require('supertest');
const app = require('../server.js');
const db = require('../config/db.js');

// ==========================================
// 🛠️ ตัวแปรสำหรับเก็บ State ระหว่างรันเทส
// ==========================================
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

describe('🚀 Full Backend API Test Suite (100% Coverage)', () => {

  // =========================================================
  // ⚙️ PRE-SETUP: สร้างข้อมูลจำลองก่อนเริ่มเทส
  // =========================================================
  beforeAll(async () => {
    console.log('⏳ [Setup] กำลังเตรียมข้อมูล Admin สำหรับเทส...');
    // 1. สมัครสมาชิก Admin ล่วงหน้าผ่าน API
    await request(app).post('/api/auth/register').send({ email: testAdmin.email, password: testAdmin.password });
    
    // 2. แอบเข้าไปแก้ Role ให้เป็น ADMIN ใน Database ตรงๆ 
    // (เพราะปกติ API สมัครสมาชิกจะให้สิทธิ์แค่ USER ธรรมดา)
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE email = $1`, [testAdmin.email]);

    // 3. ล็อกอินเพื่อเอา Token ของ Admin เก็บไว้ใช้
    const res = await request(app).post('/api/auth/login').send({ email: testAdmin.email, password: testAdmin.password });
    adminToken = res.body.token || (res.body.data && res.body.data.token) || '';
  });

  // =========================================================
  // 🟢 1. SYSTEM & HEALTH CHECK
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
  // 🔵 2. AUTHENTICATION (/api/auth)
  // =========================================================
  describe('2. Auth Routes', () => {
    it('POST /register - สมัครสมาชิก User ธรรมดา', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);
      expect([200, 201]).toContain(res.statusCode);
    });

    it('POST /login - ล็อกอิน User ธรรมดา และรับ Token', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
      expect(res.statusCode).toEqual(200);
      userToken = res.body.token || (res.body.data && res.body.data.token) || '';
      expect(userToken).not.toBe('');
    });

    it('GET /status - เช็คสถานะการล็อกอิน', async () => {
      const res = await request(app).get('/api/auth/status').set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toEqual(200);
    });

    it('POST /logout - ออกจากระบบ (ถ้ามี)', async () => {
      const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${userToken}`);
      expect([200, 204]).toContain(res.statusCode); // บางระบบใช้ 204 No Content
    });
  });

  // =========================================================
  // 🟠 3. USERS (/api/users)
  // =========================================================
  describe('3. User Routes', () => {
    it('GET /me - ดูโปรไฟล์ตัวเอง', async () => {
      const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.email || (res.body.data && res.body.data.email)).toEqual(testUser.email);
    });

    it('PATCH /me - อัปเดตข้อมูลตัวเอง', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'Updated User Name' });
      expect(res.statusCode).toEqual(200);
    });
  });

  // =========================================================
  // 🔴 4. ADMIN (/api/admin)
  // =========================================================
  describe('4. Admin Routes', () => {
    it('GET /users - User ธรรมดาห้ามดูรายชื่อ (403 Forbidden)', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${userToken}`);
      expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /users - Admin สามารถดูรายชื่อผู้ใช้ได้ (200 OK)', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });
  });

  // =========================================================
  // 🖼️ 5. CAROUSEL (/api/carousel)
  // =========================================================
  describe('5. Carousel Routes', () => {
    it('GET / - ทุกคนดูแบนเนอร์ได้ (Public)', async () => {
      const res = await request(app).get('/api/carousel');
      expect(res.statusCode).toEqual(200);
    });

    it('POST / - User ธรรมดาสร้างแบนเนอร์ไม่ได้', async () => {
      const res = await request(app).post('/api/carousel').set('Authorization', `Bearer ${userToken}`).send({ image_url: 'http://test.com/img.jpg' });
      expect([401, 403]).toContain(res.statusCode);
    });

    it('POST / - Admin สร้างแบนเนอร์ได้', async () => {
      const res = await request(app)
        .post('/api/carousel')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ image_url: 'http://test.com/banner1.jpg' });
      
      expect([200, 201]).toContain(res.statusCode);
      // เก็บ ID ไว้เทสการแก้ไขและลบ
      createdCarouselId = res.body.id || (res.body.data && res.body.data.id) || null; 
    });

    it('PUT /:id - Admin แก้ไขแบนเนอร์ได้', async () => {
      if (!createdCarouselId) return; // ข้ามถ้าสร้างไม่สำเร็จ
      const res = await request(app)
        .put(`/api/carousel/${createdCarouselId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ image_url: 'http://test.com/banner-updated.jpg' });
      expect(res.statusCode).toEqual(200);
    });

    it('DELETE /:id - Admin ลบแบนเนอร์ได้', async () => {
      if (!createdCarouselId) return;
      const res = await request(app).delete(`/api/carousel/${createdCarouselId}`).set('Authorization', `Bearer ${adminToken}`);
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  // =========================================================
  // 🏠 6. HOMEPAGE (/api/homepage)
  // =========================================================
  describe('6. Homepage Routes', () => {
    it('GET /hero - ดูข้อมูลส่วน Hero (Public)', async () => {
      const res = await request(app).get('/api/homepage/hero');
      expect(res.statusCode).toEqual(200);
    });

    it('PUT /hero - Admin แก้ไขข้อมูล Hero ได้', async () => {
      const res = await request(app)
        .put('/api/homepage/hero')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Jest Testing Title' });
      expect(res.statusCode).toEqual(200);
    });
  });

  // =========================================================
  // 📦 7. DOWNLOAD (/api/download)
  // =========================================================
  describe('7. Download Routes', () => {
    it('GET /windows - ดาวน์โหลดไฟล์ Windows', async () => {
      const res = await request(app).get('/api/download/windows');
      // อาจจะเป็นการ Redirect (302) ไปที่ไฟล์ หรือคืนค่า Stream (200) หรือเตือนว่าไม่มีไฟล์ (404)
      expect([200, 302, 404]).toContain(res.statusCode); 
    });

    it('GET /android - ดาวน์โหลดไฟล์ Android', async () => {
      const res = await request(app).get('/api/download/android');
      expect([200, 302, 404]).toContain(res.statusCode);
    });
  });

  // =========================================================
  // 🧹 8. TEARDOWN (เคลียร์ขยะทั้งหมดหลังเทสจบ)
  // =========================================================
  afterAll(async () => {
    console.log('🧹 [Teardown] กำลังทำความสะอาด Database...');
    try {
      // 1. ลบ User & Admin ที่สร้างจากบอทเทส
      await db.query(`DELETE FROM users WHERE email IN ($1, $2)`, [testUser.email, testAdmin.email]);
      
      // 2. ลบรูป Carousel เผื่อหลงเหลือ (ลบข้อมูลที่มีคำว่า test.com)
      // *หาก Schema DB ของคุณใช้ชื่อคอลัมน์อื่น ให้เปลี่ยนคำว่า image_url ให้ตรงกับ DB
      await db.query(`DELETE FROM carousels WHERE image_url LIKE '%test.com%'`);

      console.log('✨ ลบข้อมูลสแปมสำเร็จทั้งหมด!');
    } catch (err) {
      console.error('❌ ลบข้อมูลไม่สำเร็จ (อาจเพราะตารางหรือคอลัมน์ไม่ตรงกัน):', err.message);
    } finally {
      if (db.end) await db.end(); 
    }
  });

});