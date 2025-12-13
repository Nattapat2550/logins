// backend/models/user.js
const { callPureApi } = require('../utils/pureApi');

/**
 * สร้าง User ใหม่ด้วย Email (ยังไม่ Verify)
 */
async function createUserByEmail(email) {
  return await callPureApi('/create-user-email', { email });
}

/**
 * ค้นหา User ด้วย Email
 */
async function findUserByEmail(email) {
  // return object user ที่มี password_hash (ถ้ามี)
  return await callPureApi('/find-user', { email });
}

/**
 * ค้นหา User ด้วย ID
 */
async function findUserById(id) {
  return await callPureApi('/find-user', { id });
}

/**
 * ค้นหา User ด้วย OAuth Provider
 */
async function findUserByOAuth(provider, oauthId) {
  return await callPureApi('/find-user', { provider, oauthId });
}

/**
 * เปลี่ยนสถานะ Email Verified (ปกติ Pure-API ทำให้แล้วตอน Verify Code)
 */
async function markEmailVerified(userId) {
  // Pure-API จัดการให้แล้วใน validateAndConsumeCode หรือ setOAuthUser
  // จึงไม่ต้องทำอะไรเพิ่มในฝั่งนี้
  return null;
}

/**
 * ตั้ง Username และ Password (สำหรับการ Register แบบ Email)
 */
async function setUsernameAndPassword(email, username, password) {
  // Pure-API จะทำการ Hash Password ให้เอง
  return await callPureApi('/set-username-password', { email, username, password });
}

/**
 * อัปเดตข้อมูล Profile (Username, Avatar)
 */
async function updateProfile(userId, { username, profilePictureUrl }) {
  // ใช้ Endpoint Admin Update (หรือสร้าง Endpoint User Update แยกใน Pure-API ก็ได้)
  return await callPureApi('/admin/users/update', { 
    id: userId, 
    username, 
    profile_picture_url: profilePictureUrl 
  });
}

/**
 * ลบ User
 */
async function deleteUser(userId) {
  // สมมติว่ามี Endpoint delete ใน Pure-API (ถ้ายังไม่มีอาจต้องเพิ่ม)
  // แต่เบื้องต้น return null ไปก่อนเพื่อไม่ให้ error
  console.warn('deleteUser not fully implemented via Pure-API yet');
  return null;
}

/**
 * ดึง User ทั้งหมด (สำหรับ Admin)
 */
async function getAllUsers() {
  return await callPureApi('/admin/users') || [];
}

/**
 * บันทึก Verification Code
 */
async function storeVerificationCode(userId, code, expiresAt) {
  return await callPureApi('/store-verification-code', { userId, code, expiresAt });
}

/**
 * ตรวจสอบและใช้ Verification Code
 */
async function validateAndConsumeCode(email, code) {
  const result = await callPureApi('/verify-code', { email, code });
  // Pure-API ควรส่งกลับมาในรูปแบบ { ok: true, userId: ... } หรือ { ok: false, reason: ... }
  // ถ้า callPureApi คืนค่ามาแต่ data อาจต้องปรับ endpoint ให้ส่ง data wrapper
  // แต่โค้ดนี้เผื่อไว้ว่า return json raw กลับมา
  if (!result || (result.ok === false)) {
    return { ok: false, reason: result?.reason || 'error' };
  }
  return { ok: true, userId: result.userId || result.data?.userId };
}

/**
 * สร้างหรืออัปเดต User จาก OAuth (Google)
 */
async function setOAuthUser(data) {
  return await callPureApi('/set-oauth-user', data);
}

/**
 * สร้าง Token สำหรับ Reset Password
 */
async function createPasswordResetToken(email, token, expiresAt) {
  return await callPureApi('/create-reset-token', { email, token, expiresAt });
}

/**
 * ตรวจสอบและใช้ Token Reset Password
 */
async function consumePasswordResetToken(rawToken) {
  return await callPureApi('/consume-reset-token', { token: rawToken });
}

/**
 * เปลี่ยนรหัสผ่านใหม่ (Reset Password)
 */
async function setPassword(userId, newPassword) {
  return await callPureApi('/set-password', { userId, newPassword });
}

module.exports = {
  createUserByEmail, findUserByEmail, findUserById, findUserByOAuth,
  markEmailVerified, setUsernameAndPassword, updateProfile, deleteUser,
  getAllUsers, storeVerificationCode, validateAndConsumeCode, setOAuthUser,
  createPasswordResetToken, consumePasswordResetToken, setPassword
};