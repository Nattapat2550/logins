// backend/utils/pureApi.js
const PURE_API_URL = process.env.PURE_API_BASE_URL; // เช่น https://pure-api-pry6.onrender.com
const API_KEY = process.env.PURE_API_KEY;

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

function normalizeEndpoint(endpoint) {
  if (!endpoint) return '/';
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

/**
 * รองรับทั้ง:
 *  - callPureApi('/homepage/list', 'GET')
 *  - callPureApi('/carousel/create', 'POST', {...})
 *  - callPureApi('/carousel/create', {...})   // default POST
 */
async function callPureApi(endpoint, methodOrBody = 'POST', maybeBody) {
  let method = 'POST';
  let body = undefined;

  if (typeof methodOrBody === 'string') {
    method = methodOrBody.toUpperCase();
    body = maybeBody;
  } else {
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
    if (json && typeof json === 'object' && 'data' in json) return json.data;
    return json;
  } catch (err) {
    console.error(`PureAPI Connection Failed [${method} ${endpoint}]:`, err);
    return null;
  }
}

module.exports = { callPureApi };
