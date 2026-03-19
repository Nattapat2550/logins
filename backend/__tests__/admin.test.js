// backend/__tests__/admin.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock, setupTestAccounts } = require('./testHelper.js');

let mockDb;
let adminToken = '';
let testUserId = null;

describe('👑 Admin Role & CMS Features', () => {
  beforeAll(async () => {
    mockDb = setupGlobalMock();
    const accounts = await setupTestAccounts(app);
    adminToken = accounts.adminToken;
    testUserId = accounts.testUserId;
  });

  it('📋 GET /api/admin/users - Admin สามารถดูรายชื่อสมาชิกทั้งหมดได้ (200 OK)', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('🛠️ PUT /api/admin/users/:id - Admin ปรับสิทธิ์ (Role) ของคนอื่นให้เป็นแอดมินได้', async () => {
    const res = await request(app).put(`/api/admin/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    expect(res.statusCode).toEqual(200);
    expect(mockDb.users.find(u => u.id === testUserId).role).toEqual('admin');
  });

  it('🖼️ POST /api/admin/carousel - Admin สร้างภาพสไลด์แบนเนอร์ใหม่ได้', async () => {
    const dummyImage = Buffer.from('fake-image-banner');
    const res = await request(app).post('/api/admin/carousel')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', 'Admin Super Banner')
      .attach('image', dummyImage, 'banner.jpg');
      
    expect(res.statusCode).toEqual(201);
  });

  it('🗑️ DELETE /api/admin/carousel/:id - Admin ลบแบนเนอร์ได้', async () => {
    const res = await request(app)
      .delete('/api/admin/carousel/1') // ลบ ID 1
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.statusCode).toEqual(204);
  });

  it('📝 PUT /api/homepage - Admin แก้ไขข้อความหน้าแรก (Homepage) ได้', async () => {
    const res = await request(app).put('/api/homepage')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ section_name: 'hero', content: { title: 'Updated By Admin' } });
      
    expect(res.statusCode).toEqual(200);
    expect(mockDb.homepage.hero.title).toEqual('Updated By Admin');
  });
});