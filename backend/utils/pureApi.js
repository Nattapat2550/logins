// backend/utils/pureApi.js
// Helper สำหรับให้ backend เรียก "pure-api" (internal routes) ด้วย x-api-key
// รองรับทั้ง GET/POST/PUT/DELETE และรองรับ call แบบเดิม:
//   callPureApi('/homepage/list', 'GET')
//   callPureApi('/homepage/update', 'POST', { section_name, content })
//   callPureApi('/find-user', { email })   // default POST

const PURE_API_URL = process.env.PURE_API_BASE_URL; // เช่น https://pure-api-pry6.onrender.com
const API_KEY = process.env.PURE_API_KEY;

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

function normalizeEndpoint(endpoint) {
  if (!endpoint) return '/';
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

async function callPureApi(endpoint, methodOrBody = 'POST', maybeBody) {
  // compatible กับโค้ดเดิม: (endpoint, 'GET') หรือ (endpoint, 'POST', body)
  let method = 'POST';
  let body = undefined;

  if (typeof methodOrBody === 'string') {
    method = methodOrBody.toUpperCase();
    body = maybeBody;
  } else {
    // callPureApi(endpoint, body)
    body = methodOrBody;
  }

  if (!HTTP_METHODS.has(method)) {
    body = methodOrBody;
    method = 'POST';
  }

  if (!PURE_API_URL) {
    console.error('PURE_API_BASE_URL is missing');
    return null;
  }
  if (!API_KEY) {
    console.error('PURE_API_KEY is missing');
    return null;
  }

  const url = `${PURE_API_URL}/api/internal${normalizeEndpoint(endpoint)}`;

  const headers = { 'x-api-key': API_KEY };
  const init = { method, headers };

  const canHaveBody = !(method === 'GET' || method === 'HEAD');
  if (canHaveBody && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);

    if (!res.ok) {
      const txt = await res.text();
      console.error(`PureAPI Error [${method} ${endpoint}]:`, res.status, txt);
      return null;
    }

    if (res.status === 204) return null;

    const json = await res.json().catch(() => null);

    // ถ้า API ส่งกลับมาเป็น { ok: true, data: ... } ให้เอา data
    if (json && typeof json === 'object' && 'data' in json) return json.data;

    return json;
  } catch (err) {
    console.error(`PureAPI Connection Failed [${method} ${endpoint}]:`, err);
    return null;
  }
}

module.exports = { callPureApi };