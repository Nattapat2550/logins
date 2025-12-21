// backend/utils/pureApi.js

const API_KEY = process.env.PURE_API_KEY;

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

function normalizeEndpoint(endpoint) {
  if (!endpoint) return '/';
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function looksLikeCloudflareChallenge(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    t.includes('just a moment') ||
    t.includes('enable javascript and cookies to continue') ||
    t.includes('_cf_chl_opt') ||
    t.includes('cdn-cgi/challenge-platform')
  );
}

/**
 * รองรับทั้ง:
 *  - callPureApi('/homepage/list', 'GET')
 *  - callPureApi('/carousel/create', 'POST', {...})
 *  - callPureApi('/carousel/create', {...})   // default POST
 *
 * env รองรับ:
 * - PURE_API_INTERNAL_URL=http://pure-api:10000   (แนะนำ ถ้ามี)
 * - PURE_API_BASE_URL=https://pure-api.onrender.com
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

  const baseCandidates = [process.env.PURE_API_INTERNAL_URL, process.env.PURE_API_BASE_URL].filter(Boolean);

  if (baseCandidates.length === 0) {
    console.error('PURE_API_INTERNAL_URL / PURE_API_BASE_URL is missing');
    return null;
  }
  if (!API_KEY) {
    console.error('PURE_API_KEY is missing');
    return null;
  }

  const path = `/api/internal${normalizeEndpoint(endpoint)}`;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const base of baseCandidates) {
      const url = `${base}${path}`;

      const headers = {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'docker-backend/1.0',
      };

      const init = { method, headers };

      const canHaveBody = !(method === 'GET' || method === 'HEAD');
      if (canHaveBody && body !== undefined) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }

      try {
        const res = await fetch(url, init);

        // ✅ /find-user 404 = ปกติ (ไม่ต้อง log เป็น error)
        if (res.status === 404 && endpoint === '/find-user') {
          return null;
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          const contentType = (res.headers.get('content-type') || '').toLowerCase();
          const isHtml = contentType.includes('text/html') || looksLikeCloudflareChallenge(txt);

          // 429 / challenge -> retry
          if (res.status === 429 || isHtml) {
            const ra = res.headers.get('retry-after');
            const waitMs = ra && /^\d+$/.test(ra) ? Math.min(Number(ra) * 1000, 5000) : Math.min(400 * attempt, 1200);
            console.warn(`PureAPI throttled/blocked [${method} ${endpoint}] via ${base} status=${res.status} attempt=${attempt}/${maxAttempts}`);
            if (attempt < maxAttempts) await sleep(waitMs);
            continue;
          }

          console.error(`PureAPI Error [${method} ${endpoint}] via ${base}:`, res.status, txt);
          return null;
        }

        // ✅ สำคัญ: endpoint แบบ void มักคืน 204 หรือ body ว่าง หรือ "null"
        if (res.status === 204) return true;

        const raw = await res.text().catch(() => '');
        if (!raw || raw.trim() === '') return true;

        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          // ถ้าไม่ใช่ JSON ก็คืน string ไปเลย
          return raw;
        }

        // ถ้าเป็น null จริง ให้ถือว่าสำเร็จ (void)
        if (parsed === null) return true;

        if (parsed && typeof parsed === 'object' && 'data' in parsed) return parsed.data;
        return parsed;
      } catch (err) {
        console.error(`PureAPI Connection Failed [${method} ${endpoint}] via ${base}:`, err);
        // ลอง base ตัวถัดไป
      }
    }

    if (attempt < maxAttempts) await sleep(Math.min(500 * attempt, 1500));
  }

  return null;
}

module.exports = { callPureApi };
