/**
 * Pure API client (server-to-server)
 * - แนบ x-api-key ให้ทุก request
 * - แนบ Authorization: Bearer <jwt> ถ้าส่ง token เข้ามา
 *
 * Required env:
 *   PURE_API_BASE_URL=https://pure-api-pry6.onrender.com
 *   PURE_API_KEY=docker-key-123   (หรือ key ของ backend นี้)
 *
 * Notes:
 * - Node >=18 มี fetch ในตัว
 */

function required(name, value) {
  if (!value) throw new Error(`[backend] missing env: ${name}`);
  return value;
}

const BASE_URL = required('PURE_API_BASE_URL', process.env.PURE_API_BASE_URL).replace(/\/+$/, '');
const API_KEY = required('PURE_API_KEY', process.env.PURE_API_KEY);

function buildUrl(path) {
  const p = String(path || '').replace(/^\/+/, '');
  return `${BASE_URL}/${p}`;
}

async function request(method, path, { body, token, headers } = {}) {
  const url = buildUrl(path);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  const h = {
    'x-api-key': API_KEY,
    ...(body ? { 'content-type': 'application/json' } : {}),
    ...(headers || {}),
  };
  if (token) h.authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
      const err = new Error(`[pure-api] ${res.status}: ${msg}`);
      err.status = res.status;
      err.payload = json;
      throw err;
    }

    return json;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, opts) => request('POST', path, opts),
  put: (path, opts) => request('PUT', path, opts),
  patch: (path, opts) => request('PATCH', path, opts),
  del: (path, opts) => request('DELETE', path, opts),
};
