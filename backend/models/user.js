// backend/models/user.js
const { callPureApi } = require('../utils/pureApi');

/**
 * ใช้สำหรับเรียก Pure-API แบบ "ต้องสำเร็จเท่านั้น" (ถ้าไม่ ok ให้ throw)
 * เพื่อไม่ให้เคส delete เงียบ ๆ แล้วดูเหมือนสำเร็จแต่จริง ๆ ไม่ลบ
 */
function normalizeEndpoint(endpoint) {
  if (!endpoint) return '/';
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

async function callPureApiStrict(endpoint, method = 'POST', body) {
  const PURE_API_URL = process.env.PURE_API_BASE_URL;
  const API_KEY = process.env.PURE_API_KEY;

  if (!PURE_API_URL) {
    const err = new Error('PURE_API_BASE_URL is missing');
    err.status = 500;
    throw err;
  }
  if (!API_KEY) {
    const err = new Error('PURE_API_KEY is missing');
    err.status = 500;
    throw err;
  }

  const url = `${PURE_API_URL}/api/internal${normalizeEndpoint(endpoint)}`;
  const headers = { 'x-api-key': API_KEY };

  const init = { method: method.toUpperCase(), headers };

  const canHaveBody = !(init.method === 'GET' || init.method === 'HEAD');
  if (canHaveBody && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    // พยายามอ่าน error จาก body เพื่อ debug ง่าย
    const txt = await res.text().catch(() => '');
    const err = new Error(txt || `PureAPI request failed: ${res.status}`);
    err.status = res.status;
    err.raw = txt;
    throw err;
  }

  // delete-user ของ Rust ส่ง Json(()) ซึ่งมักจะเป็น "null"
  // ถ้า parse ไม่ได้ก็ถือว่า ok แล้ว
  const json = await res.json().catch(() => null);
  return json;
}

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
 * เปลี่ยนสถานะ Email Verified
 */
async function markEmailVerified(_userId) {
  return null;
}

/**
 * ตั้ง Username และ Password (Register แบบ Email)
 */
async function setUsernameAndPassword(email, username, password) {
  return await callPureApi('/set-username-password', { email, username, password });
}

/**
 * อัปเดตข้อมูล Profile (Username, Avatar)
 */
async function updateProfile(userId, { username, profilePictureUrl }) {
  return await callPureApi('/admin/users/update', {
    id: userId,
    username,
    profile_picture_url: profilePictureUrl,
  });
}

/**
 * ✅ ลบ User (ทำงานจริงแล้ว)
 * เรียก Pure-API: POST /api/internal/delete-user { id }
 */
async function deleteUser(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) {
    const err = new Error('Invalid user id');
    err.status = 400;
    throw err;
  }

  await callPureApiStrict('/delete-user', 'POST', { id });

  // (Optional) เช็คความชัวร์ว่าไม่เหลือจริง
  // ถ้ายังหาเจอ แปลว่าลบไม่สำเร็จ
  const still = await callPureApi('/find-user', { id });
  if (still) {
    const err = new Error('Delete failed (user still exists)');
    err.status = 500;
    throw err;
  }

  return { ok: true };
}

/**
 * ดึง User ทั้งหมด (สำหรับ Admin)
 */
async function getAllUsers() {
  return (await callPureApi('/admin/users')) || [];
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
  if (!result || result.ok === false) {
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
  createUserByEmail,
  findUserByEmail,
  findUserById,
  findUserByOAuth,
  markEmailVerified,
  setUsernameAndPassword,
  updateProfile,
  deleteUser,
  getAllUsers,
  storeVerificationCode,
  validateAndConsumeCode,
  setOAuthUser,
  createPasswordResetToken,
  consumePasswordResetToken,
  setPassword,
};
