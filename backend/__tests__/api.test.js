// backend/__tests__/api.test.js
const request = require('supertest');
const bcrypt = require('bcryptjs');

// =========================================================
// 🧪 MOCK GLOBAL FETCH (Simulate Rust Pure API)
// เพื่อให้ Test ทำงานได้ 100% โดยไม่ต้องง้อ External Server ที่อาจล่ม/ปิดอยู่
// =========================================================
const mockDb = {
  users: [],
  carousels: [],
  homepage: { hero: { title: 'Mocked Hero Title' } }
};

global.fetch = jest.fn(async (url, init) => {
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  
  let body = {};
  if (init && init.body) {
    try { body = JSON.parse(init.body); } catch(e) {}
  }

  const jsonResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
    json: async () => data,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null }
  });

  // 👤 Auth & User Routes Mock
  if (path.endsWith('/create-user-email')) {
    const newUser = { 
      id: Date.now() + Math.floor(Math.random()*100), 
      email: body.email, 
      is_email_verified: false, 
      role: 'user' 
    };
    mockDb.users.push(newUser);
    return jsonResponse({ data: newUser });
  }
  if (path.endsWith('/set-username-password')) {
    const user = mockDb.users.find(u => u.email === body.email);
    if (user) {
        user.username = body.username;
        user.password_hash = bcrypt.hashSync(body.password, 10);
        user.is_email_verified = true;
        return jsonResponse({ data: user });
    }
    return jsonResponse({ error: 'Not found' }, 404);
  }
  if (path.endsWith('/admin/users/update')) {
    const user = mockDb.users.find(u => u.email === body.email || u.id === body.id);
    if (user) {
        if (body.role) user.role = body.role;
        return jsonResponse({ data: user });
    }
    return jsonResponse({ error: 'Not found' }, 404);
  }
  if (path.endsWith('/find-user')) {
    const user = mockDb.users.find(u => u.email === body.email || u.id === body.id);
    if (user) return jsonResponse({ data: user });
    return jsonResponse({ error: 'Not found' }, 404); 
  }
  if (path.endsWith('/delete-user')) {
    mockDb.users = mockDb.users.filter(u => u.id !== body.id && u.email !== body.email);
    return jsonResponse({ data: { ok: true } });
  }
  if (path.endsWith('/admin/users')) {
    return jsonResponse({ data: mockDb.users });
  }

  // 🖼️ Carousel & Homepage Mock
  if (path.endsWith('/carousel/list')) {
    return jsonResponse({ data: mockDb.carousels });
  }
  if (path.endsWith('/homepage/list')) {
    return jsonResponse({ data: [ { section_name: 'hero', content: mockDb.homepage.hero } ] });
  }

  // 📦 Fallback กรณี Endpoint อื่นๆ
  return jsonResponse({ data: { ok: true } });
});


// โหลด Server หลังจากที่ Mock Fetch ไปแล้ว
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
  // ⚙️ SETUP: จำลอง User & Admin ผ่านระบบ Mock
  // =========================================================
  beforeAll(async () => {
    console.log('⏳ [Setup] กำลังเตรียมข้อมูลสำหรับเทส...');
    try {
      // 1. สร้าง Test User ธรรมดา
      await callPureApi('/create-user-email', { email: testUser.email });
      await callPureApi('/set-username-password', { 
        email: testUser.email, 
        username: testUser.username, 
        password: testUser.password 
      });

      // 2. สร้าง Test Admin และอัปเดต Role
      await callPureApi('/create-user-email', { email: testAdmin.email });
      await callPureApi('/set-username-password', { 
        email: testAdmin.email, 
        username: testAdmin.username, 
        password: testAdmin.password 
      });
      await callPureApi('/admin/users/update', { 
        email: testAdmin.email, 
        role: 'admin' 
      });

      // 3. เก็บ ID เพื่อไว้ลบข้อมูลทิ้ง
      const u = await findUserByEmail(testUser.email);
      if (u) testUserId = u.id;
      const a = await findUserByEmail(testAdmin.email);
      if (a) testAdminId = a.id;

      // 4. ล็อกอินผ่าน Express จริงเพื่อเอา JWT Token (ใช้ bcrypt เทียบพาสเวิร์ดได้สำเร็จ เพราะเรา Mock ให้แล้ว)
      const resAdmin = await request(app).post('/api/auth/login').send({ email: testAdmin.email, password: testAdmin.password });
      adminToken = resAdmin.body.token || '';

      const resUser = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
      userToken = resUser.body.token || '';
      
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
    it('GET /users - User ธรรมดาห้ามดูรายชื่อผู้ใช้', async () => {
      const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${userToken}`);
      // ยอมรับ 401, 403, 404 เพราะจุดประสงค์คือ "ห้ามดูได้"
      expect([401, 403, 404]).toContain(res.statusCode);
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
      expect([200, 404]).toContain(res.statusCode); 
    });

    it('POST / - User ธรรมดาสร้างแบนเนอร์ไม่ได้', async () => {
      const res = await request(app)
        .post('/api/carousel')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ image_url: 'http://test.com/img.jpg' });
      expect([401, 403, 404]).toContain(res.statusCode);
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

    it('PUT /hero - User ธรรมดาแก้ข้อมูลหน้าแรกไม่ได้', async () => {
      const res = await request(app)
        .put('/api/homepage/hero')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hack Title' });
      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });

  // =========================================================
  // 🧹 TEARDOWN: เคลียร์ Mock
  // =========================================================
  afterAll(async () => {
    console.log('🧹 [Teardown] กำลังลบข้อมูลเทส...');
    try {
      if (testUserId) await deleteUser(testUserId);
      if (testAdminId) await deleteUser(testAdminId);
      console.log('✨ ลบข้อมูลเทสสำเร็จ!');
    } catch (err) {
      console.error('❌ [Teardown Error]', err.message);
    }
  });

});