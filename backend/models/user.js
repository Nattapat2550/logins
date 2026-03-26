// backend/models/user.js
const { callPureApi } = require('../utils/pureApi');

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
    const txt = await res.text().catch(() => '');
    const err = new Error(txt || `PureAPI request failed: ${res.status}`);
    err.status = res.status;
    err.raw = txt;
    throw err;
  }

  const json = await res.json().catch(() => null);
  return json;
}

async function createUserByEmail(email) {
  return await callPureApi('/create-user-email', { email });
}

async function findUserByEmail(email) {
  return await callPureApi('/find-user', { email });
}

async function findUserById(id) {
  return await callPureApi('/find-user', { id });
}

async function findUserByOAuth(provider, oauthId) {
  return await callPureApi('/find-user', { provider, oauthId });
}

async function markEmailVerified(_userId) {
  return null;
}

async function setUsernameAndPassword(email, username, password, first_name, last_name, tel) {
  return await callPureApi('/set-username-password', { email, username, password, first_name, last_name, tel });
}

async function updateProfile(userId, { username, profilePictureUrl, first_name, last_name, tel, status }) {
  return await callPureApi('/admin/users/update', {
    id: userId,
    username,
    profile_picture_url: profilePictureUrl,
    first_name,
    last_name,
    tel,
    status
  });
}

async function deleteUser(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) {
    const err = new Error('Invalid user id');
    err.status = 400;
    throw err;
  }

  await callPureApiStrict('/delete-user', 'POST', { id });

  const still = await callPureApi('/find-user', { id });
  if (still) {
    const err = new Error('Delete failed (user still exists)');
    err.status = 500;
    throw err;
  }

  return { ok: true };
}

async function getAllUsers() {
  return (await callPureApi('/admin/users')) || [];
}

async function storeVerificationCode(userId, code, expiresAt) {
  return await callPureApi('/store-verification-code', { userId, code, expiresAt });
}

async function validateAndConsumeCode(email, code) {
  const result = await callPureApi('/verify-code', { email, code });
  if (!result || result.ok === false) {
    return { ok: false, reason: result?.reason || 'error' };
  }
  return { ok: true, userId: result.userId || result.data?.userId };
}

async function setOAuthUser(data) {
  return await callPureApi('/set-oauth-user', data);
}

async function createPasswordResetToken(email, token, expiresAt) {
  return await callPureApi('/create-reset-token', { email, token, expiresAt });
}

async function consumePasswordResetToken(rawToken) {
  return await callPureApi('/consume-reset-token', { token: rawToken });
}

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