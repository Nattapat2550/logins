// backend/models/user.js
// ไม่ต้อง require('pg') หรือ pool แล้ว
// ไม่ต้อง require('bcryptjs') หรือ 'crypto' แล้ว (เพราะ Pure-API จัดการให้)
// แต่ต้องใช้ fetch (Node.js 18+ มีมาให้แล้ว หรือใช้ axios ก็ได้)

const PURE_API_URL = process.env.PURE_API_BASE_URL; // เช่น https://pure-api-pry6.onrender.com
const API_KEY = process.env.PURE_API_KEY;

// Helper function ในการยิง API
async function callPureApi(endpoint, body) {
  try {
    const res = await fetch(`${PURE_API_URL}/api/internal${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      const txt = await res.text();
      console.error(`Pure API Error [${endpoint}]:`, res.status, txt);
      return null;
    }
    
    const json = await res.json();
    return json;
  } catch (err) {
    console.error(`Call Pure API Failed [${endpoint}]:`, err);
    return null;
  }
}

async function createUserByEmail(email) {
  const json = await callPureApi('/create-user-email', { email });
  return json?.data || null;
}

async function findUserByEmail(email) {
  const json = await callPureApi('/find-user', { email });
  return json?.data || null;
}

async function findUserById(id) {
  const json = await callPureApi('/find-user', { id });
  return json?.data || null;
}

async function findUserByOAuth(provider, oauthId) {
  const json = await callPureApi('/find-user', { provider, oauthId });
  return json?.data || null;
}

// Function นี้อาจจะไม่ได้ใช้บ่อยใน auth flow เดิม แต่ใส่ไว้เผื่อ
async function markEmailVerified(userId) {
  // Pure API จะ verify ให้ใน validateAndConsumeCode แล้ว
  return null; 
}

async function setUsernameAndPassword(email, username, password) {
  const json = await callPureApi('/set-username-password', { email, username, password });
  return json?.data || null;
}

async function updateProfile(userId, { username, profilePictureUrl }) {
  // อันนี้ต้องเพิ่ม endpoint ใน pure-api ถ้าจำเป็น แต่ใน auth flow ปกติอาจไม่ได้ใช้
  // สมมติว่ายังไม่ implement หรือใช้ setOAuthUser แทน
  return null;
}

async function deleteUser(userId) {
  // Implement delete if needed
}

async function getAllUsers() {
  // Implement get all if needed
  return [];
}

async function storeVerificationCode(userId, code, expiresAt) {
  const json = await callPureApi('/store-verification-code', { userId, code, expiresAt });
  return json?.ok;
}

async function validateAndConsumeCode(email, code) {
  const json = await callPureApi('/verify-code', { email, code });
  if (!json) return { ok: false, reason: 'error' };
  return json; // { ok: true, userId: ... } or { ok: false, reason: ... }
}

async function setOAuthUser({ email, provider, oauthId, pictureUrl, name }) {
  const json = await callPureApi('/set-oauth-user', { email, provider, oauthId, pictureUrl, name });
  return json?.data || null;
}

async function createPasswordResetToken(email, token, expiresAt) {
  const json = await callPureApi('/create-reset-token', { email, token, expiresAt });
  return json?.data || null;
}

async function consumePasswordResetToken(rawToken) {
  const json = await callPureApi('/consume-reset-token', { token: rawToken });
  return json?.data || null;
}

async function setPassword(userId, newPassword) {
  const json = await callPureApi('/set-password', { userId, newPassword });
  return json?.data || null;
}

module.exports = {
  createUserByEmail, findUserByEmail, findUserById, findUserByOAuth,
  markEmailVerified, setUsernameAndPassword, updateProfile, deleteUser,
  getAllUsers, storeVerificationCode, validateAndConsumeCode, setOAuthUser,
  createPasswordResetToken, consumePasswordResetToken, setPassword
};