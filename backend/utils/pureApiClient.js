/**
 * Pure API client (Node 18+ มี fetch ในตัว)
 * - ใส่ x-api-key อัตโนมัติ
 * - แนบ Authorization: Bearer <jwt> ถ้ามี PURE_API_JWT
 */

function required(name, value) {
  if (!value) throw new Error(`[projectdocker] missing env: ${name}`);
  return value;
}

const PURE_API_BASE_URL = required("PURE_API_BASE_URL", process.env.PURE_API_BASE_URL);
const PURE_API_KEY = required("PURE_API_KEY", process.env.PURE_API_KEY);

function buildUrl(path) {
  const base = PURE_API_BASE_URL.replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${base}/${p}`;
}

async function request(method, path, { body, jwt, headers } = {}) {
  const url = buildUrl(path);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  const h = {
    "x-api-key": PURE_API_KEY,
    "content-type": "application/json",
    ...(headers || {})
  };

  const token = jwt || process.env.PURE_API_JWT;
  if (token) h["authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }

    if (!res.ok) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      const code = json?.error?.code || "PURE_API_ERROR";
      const err = new Error(`[pure-api] ${code}: ${msg}`);
      err.status = res.status;
      err.code = code;
      err.payload = json;
      throw err;
    }

    return json;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  get: (path, opts) => request("GET", path, opts),
  post: (path, opts) => request("POST", path, opts),
  put: (path, opts) => request("PUT", path, opts),
  patch: (path, opts) => request("PATCH", path, opts),
  del: (path, opts) => request("DELETE", path, opts)
};
