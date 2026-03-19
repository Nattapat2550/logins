// backend/__tests__/user.test.js
const request = require('supertest');
const app = require('../server.js');
const { setupGlobalMock, setupTestAccounts } = require('./testHelper.js');

let mockDb;
let userToken = '';
let testUserId = null;

describe('👤 User Features & Profile Management', () => {
  beforeAll(async () => {
    mockDb = setupGlobalMock();
    const accounts = await setupTestAccounts(app);
    userToken = accounts.userToken;
    testUserId = accounts.testUserId;
  });

  it('👤 GET /api/users/me - ดึงข้อมูลส่วนตัวของตัวเองได้สำเร็จ', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('email');
  });

  it('✏️ PUT /api/users/me - อัปเดตชื่อผู้ใช้ (Username) ตัวเองได้', async () => {
    const res = await request(app).put('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ username: 'NewUserName123' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.username).toEqual('NewUserName123');
  });

  it('🖼️ POST /api/users/me/avatar - อัปโหลดรูปโปรไฟล์ใหม่ได้สำเร็จ', async () => {
    const dummyImage = Buffer.from('fake-image-data-for-avatar');
    const res = await request(app).post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', dummyImage, 'my-avatar.png');
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty('profile_picture_url');
  });

  it('🚫 POST /api/users/me/avatar - ระบบบล็อกการอัปโหลดไฟล์ที่ไม่ใช่รูปภาพ (เช่น .txt)', async () => {
    const dummyTextFile = Buffer.from('this is a text file');
    const res = await request(app).post('/api/users/me/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', dummyTextFile, { filename: 'virus.txt', contentType: 'text/plain' });
      
    expect(res.statusCode).toEqual(400); 
    expect(res.body.error).toContain('Unsupported file type');
  });

  it('🗑️ DELETE /api/users/me - ผู้ใช้สามารถลบบัญชีตัวเองทิ้งได้', async () => {
    const res = await request(app).delete('/api/users/me').set('Authorization', `Bearer ${userToken}`);
    expect([200, 204]).toContain(res.statusCode);
    
    // ตรวจสอบใน Mock ว่าถูกลบไปจริง
    const checkUser = mockDb.users.find(u => u.id === testUserId);
    expect(checkUser).toBeUndefined();
  });
});