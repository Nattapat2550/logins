const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pure = require('../utils/pureApiClient');

/**
 * IMPORTANT:
 * โมดูลนี้ถูกเปลี่ยนให้ "ไม่แตะ DB ตรง" แล้ว
 * ทุกอย่างเรียกผ่าน pure-api (server-to-server) เท่านั้น
 *
 * pure-api ที่ต้องมี (api-key protected):
 * - POST  /api/internal/users/create-by-email
 * - GET   /api/internal/users/by-email?email=...
 * - GET   /api/internal/users/by-id/:id
 * - GET   /api/internal/users/by-oauth?provider=...&oauthId=...
 * - POST  /api/internal/users/mark-email-verified
 * - POST  /api/internal/users/set-username-password
 * - PATCH /api/internal/users/update-profile
 * - DELETE /api/internal/users/:id
 * - GET   /api/internal/users
 * - POST  /api/internal/verification/store-code
 * - POST  /api/internal/verification/validate-consume
 * - POST  /api/internal/oauth/set-oauth-user
 * - POST  /api/internal/password-reset/create
 * - POST  /api/internal/password-reset/consume
 * - POST  /api/internal/users/set-password
 */

function unwrap(resp) {
  return resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
}

async function createUserByEmail(email) {
  const resp = await pure.post('/api/internal/users/create-by-email', { body: { email } });
  return unwrap(resp);
}

async function findUserByEmail(email) {
  const resp = await pure.get(`/api/internal/users/by-email?email=${encodeURIComponent(email)}`);
  return unwrap(resp) || null;
}

async function findUserById(id) {
  const resp = await pure.get(`/api/internal/users/by-id/${encodeURIComponent(id)}`);
  return unwrap(resp) || null;
}

async function findUserByOAuth(provider, oauthId) {
  const qs = new URLSearchParams({ provider, oauthId }).toString();
  const resp = await pure.get(`/api/internal/users/by-oauth?${qs}`);
  return unwrap(resp) || null;
}

async function markEmailVerified(userId) {
  const resp = await pure.post('/api/internal/users/mark-email-verified', { body: { userId } });
  return unwrap(resp);
}

async function setUsernameAndPassword(email, username, password) {
  // backend ยังคง hash password ก่อนส่งไป pure-api (ปลอดภัย + ไม่เปลี่ยน flow เดิม)
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const resp = await pure.post('/api/internal/users/set-username-password', {
    body: { email, username, passwordHash: hash },
  });
  return unwrap(resp) || null;
}

async function updateProfile(userId, { username, profilePictureUrl }) {
  const resp = await pure.patch('/api/internal/users/update-profile', {
    body: {
      userId,
      username: username || null,
      profilePictureUrl: profilePictureUrl || null,
    },
  });
  return unwrap(resp) || null;
}

async function deleteUser(userId) {
  await pure.del(`/api/internal/users/${encodeURIComponent(userId)}`);
}

async function getAllUsers() {
  const resp = await pure.get('/api/internal/users');
  return unwrap(resp) || [];
}

async function storeVerificationCode(userId, code, expiresAt) {
  const resp = await pure.post('/api/internal/verification/store-code', {
    body: {
      userId,
      code,
      expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
    },
  });
  return unwrap(resp);
}

async function validateAndConsumeCode(email, code) {
  const resp = await pure.post('/api/internal/verification/validate-consume', {
    body: { email, code },
  });
  return unwrap(resp);
}

async function setOAuthUser({ email, provider, oauthId, pictureUrl, name }) {
  const resp = await pure.post('/api/internal/oauth/set-oauth-user', {
    body: { email, provider, oauthId, pictureUrl: pictureUrl || null, name: name || null },
  });
  return unwrap(resp);
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function createPasswordResetToken(email, token, expiresAt) {
  const resp = await pure.post('/api/internal/password-reset/create', {
    body: {
      email,
      tokenHash: hashToken(token),
      expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
    },
  });
  return unwrap(resp) || null;
}

async function consumePasswordResetToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const resp = await pure.post('/api/internal/password-reset/consume', {
    body: { tokenHash },
  });
  return unwrap(resp) || null;
}

async function setPassword(userId, newPassword) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  const resp = await pure.post('/api/internal/users/set-password', {
    body: { userId, passwordHash: hash },
  });
  return unwrap(resp);
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
