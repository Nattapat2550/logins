// backend/__tests__/system.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock } = require('./testHelper.js');

describe('⚙️ System & Core Routes', () => {
  beforeAll(() => setupGlobalMock());

  it('✅ GET /healthz - ตรวจสอบว่าเซิร์ฟเวอร์เปิดติดและพร้อมทำงาน', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toBe(true);
  });

  it('🚫 GET /api/unknown - จัดการ Route ที่ไม่มีอยู่จริง (404 Not Found)', async () => {
    const res = await request(app).get('/api/route-that-does-not-exist');
    expect(res.statusCode).toEqual(404);
  });

  it('⬇️ GET /api/download/windows - โหลดไฟล์ .exe สำเร็จ', async () => {
    const res = await request(app).get('/api/download/windows');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toContain('application/octet-stream');
  });

  it('⬇️ GET /api/download/android - โหลดไฟล์ .apk สำเร็จ', async () => {
    const res = await request(app).get('/api/download/android');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toContain('application/octet-stream');
  });
});