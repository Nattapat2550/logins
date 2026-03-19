// backend/__tests__/guest.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock, setupTestAccounts } = require('./testHelper.js');

let userToken = '';

describe('🧑‍💻 Guest & Public Features', () => {
  beforeAll(async () => {
    setupGlobalMock();
    const accounts = await setupTestAccounts(app);
    userToken = accounts.userToken;
  });

  it('🔓 GET /api/carousel - ผู้ใช้ทั่วไปดึงข้อมูลรูปภาพสไลด์ได้ (ไม่ต้องใช้ Token)', async () => {
    const res = await request(app).get('/api/carousel');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('🔓 GET /api/homepage/hero - ผู้ใช้ทั่วไปดึงข้อมูลเนื้อหาหน้าแรกได้', async () => {
    const res = await request(app).get('/api/homepage/hero');
    expect([200, 404]).toContain(res.statusCode);
  });

  it('🛡️ POST /api/auth/login - ป้องกัน SQL Injection จากการล็อคอินด้วยโค้ดเถื่อน', async () => {
    const res = await request(app).post('/api/auth/login').send({ 
      email: "' OR 1=1 --", 
      password: "' OR '1'='1" 
    });
    expect(res.statusCode).toEqual(401); // ต้องโดนบล็อก
  });

  it('🚪 POST /api/auth/logout - ออกจากระบบและลบ Cookie', async () => {
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
  });
});