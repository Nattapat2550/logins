// backend/__tests__/testHelper.js
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { callPureApi } = require('../utils/pureApi.js');
const { findUserByEmail } = require('../models/user.js');

function setupGlobalMock() {
  const mockDb = {
    users: [],
    carousels: [{ id: 1, title: 'Slide 1' }],
    homepage: { hero: { title: 'Mocked Hero Title' } }
  };

  global.fetch = jest.fn(async (url, init) => {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    let body = {};
    if (init && init.body) try { body = JSON.parse(init.body); } catch(e) {}

    const jsonResponse = (data, status = 200) => ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(data),
      json: async () => data,
      headers: new Headers({ 'content-type': 'application/json' })
    });

    if (path.includes('/api/download/')) {
      return new Response(Buffer.from("dummy"), { status: 200, headers: { 'content-type': 'application/octet-stream' }});
    }

    // --- Mock สำหรับ Auth & Users ---
    if (path.endsWith('/create-user-email')) {
      const newUser = { id: Date.now() + Math.floor(Math.random()*100), email: body.email, role: 'user' };
      mockDb.users.push(newUser);
      return jsonResponse({ data: newUser });
    }
    if (path.endsWith('/set-username-password')) {
      const user = mockDb.users.find(u => u.email === body.email);
      if (user) {
          user.username = body.username;
          user.password_hash = bcrypt.hashSync(body.password, 10);
          return jsonResponse({ data: user });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    }
    if (path.endsWith('/store-verification-code')) return jsonResponse({ data: { ok: true } });
    if (path.endsWith('/verify-code')) return jsonResponse({ data: { ok: true, userId: 1 } });
    if (path.endsWith('/create-reset-token')) return jsonResponse({ data: { id: 1, email: body.email } });
    if (path.endsWith('/consume-reset-token')) return jsonResponse({ data: { id: 1 } });
    if (path.endsWith('/set-password')) return jsonResponse({ data: { ok: true } });
    if (path.endsWith('/set-oauth-user')) return jsonResponse({ data: { id: 99, email: body.email, role: 'user' } });

    // --- Mock สำหรับ Admin, Homepage, Carousel ---
    if (path.endsWith('/admin/users/update')) {
      // ✅ แก้บัค: ใช้ String() ครอบเพื่อกันบัคชนิดข้อมูล id ไม่ตรงกัน (String vs Number)
      const user = mockDb.users.find(u => u.email === body.email || String(u.id) === String(body.id));
      if (user) {
          if (body.role) user.role = body.role;
          if (body.username) user.username = body.username;
          // ✅ เพิ่มบรรทัดนี้: ให้บันทึก profile_picture_url ลงระบบจำลองด้วย
          if (body.profile_picture_url) user.profile_picture_url = body.profile_picture_url;
          return jsonResponse({ data: user });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    }
    if (path.endsWith('/find-user')) {
      const user = mockDb.users.find(u => u.email === body.email || String(u.id) === String(body.id));
      if (user) return jsonResponse({ data: user });
      return jsonResponse({ error: 'Not found' }, 404); 
    }
    if (path.endsWith('/delete-user')) {
      mockDb.users = mockDb.users.filter(u => String(u.id) !== String(body.id));
      return jsonResponse({ data: { ok: true } });
    }
    if (path.endsWith('/admin/users')) return jsonResponse({ data: mockDb.users });
    if (path.endsWith('/carousel/list')) return jsonResponse({ data: mockDb.carousels });
    if (path.endsWith('/carousel/create')) return jsonResponse({ data: { id: Date.now(), ...body } }, 201);
    if (path.endsWith('/carousel/update')) return jsonResponse({ data: { ok: true } });
    if (path.endsWith('/carousel/delete')) return jsonResponse({ data: { ok: true } }, 204);
    if (path.endsWith('/homepage/list')) return jsonResponse({ data: [ { section_name: 'hero', content: mockDb.homepage.hero } ] });
    if (path.endsWith('/homepage/update')) {
      // ✅ แก้บัค: บันทึกข้อมูลลง MockDB เพื่อให้ Admin Test เช็คค่าได้ถูกต้อง
      mockDb.homepage[body.section_name] = body.content;
      return jsonResponse({ data: { ok: true } });
    }

    return jsonResponse({ data: { ok: true } });
  });

  return mockDb;
}

async function setupTestAccounts(app) {
  const testUser = { email: `user_${Date.now()}@test.com`, password: 'Password123!', username: 'TestUser' };
  const testAdmin = { email: `admin_${Date.now()}@test.com`, password: 'Password123!', username: 'TestAdmin' };

  await callPureApi('/create-user-email', { email: testUser.email });
  await callPureApi('/set-username-password', { email: testUser.email, username: testUser.username, password: testUser.password });

  await callPureApi('/create-user-email', { email: testAdmin.email });
  await callPureApi('/set-username-password', { email: testAdmin.email, username: testAdmin.username, password: testAdmin.password });
  await callPureApi('/admin/users/update', { email: testAdmin.email, role: 'admin' });

  const u = await findUserByEmail(testUser.email);
  const a = await findUserByEmail(testAdmin.email);

  const resAdmin = await request(app).post('/api/auth/login').send({ email: testAdmin.email, password: testAdmin.password });
  const resUser = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });

  return {
    userToken: resUser.body.token,
    adminToken: resAdmin.body.token,
    testUserId: u?.id,
    testAdminId: a?.id,
    testUserConfig: testUser
  };
}

module.exports = { setupGlobalMock, setupTestAccounts };

// ✅ แก้บัคที่ 1: ใส่โค้ดนี้ไว้บรรทัดสุดท้าย เพื่อหลอกให้ Jest มองว่าไฟล์นี้มี Test อยู่ จะได้ไม่ Error
it.skip('Dummy test for helper file to prevent Jest error', () => {});