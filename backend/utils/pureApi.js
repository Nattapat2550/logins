// backend/utils/pureApi.js

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
 * callPureApi(endpoint, 'GET')
 * callPureApi(endpoint, 'POST', body)
 * callPureApi(endpoint, body) // default POST
 *
 * env ที่รองรับ:
 * - PURE_API_INTERNAL_URL=http://service:port   (แนะนำบน Render private network)
 * - PURE_API_BASE_URL=https://xxxx.onrender.com (fallback)
 * - PURE_API_KEY=...
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

  const INTERNAL = process.env.PURE_API_INTERNAL_URL;
  const PUBLIC = process.env.PURE_API_BASE_URL;
  const API_KEY = process.env.PURE_API_KEY;

  if (!API_KEY) {
    console.error('PURE_API_KEY is missing');
    return null;
  }

  // internal ก่อน แล้วค่อย fallback public
  const baseCandidates = [INTERNAL, PUBLIC].filter(Boolean);
  if (baseCandidates.length === 0) {
    console.error('PURE_API_INTERNAL_URL / PURE_API_BASE_URL is missing');
    return null;
  }

  const path = `/api/internal${normalizeEndpoint(endpoint)}`;

  // retry แบบนุ่ม ๆ กัน 429/edge block ชั่วคราว
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const base of baseCandidates) {
      const url = `${base}${path}`;
      const headers = {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
        // ใส่ UA ให้ดูเป็น service ปกติ (ช่วยบางกรณี)
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

        if (!res.ok) {
          const txt = await res.text().catch(() => '');

          // ถ้าโดน Cloudflare challenge หรือได้ HTML → ถือว่า blocked ชั่วคราว
          const contentType = (res.headers.get('content-type') || '').toLowerCase();
          const isHtml = contentType.includes('text/html') || looksLikeCloudflareChallenge(txt);

          if (res.status === 429 || isHtml) {
            // เคารพ Retry-After ถ้ามี
            const ra = res.headers.get('retry-after');
            const waitMs =
              ra && /^\d+$/.test(ra) ? Math.min(Number(ra) * 1000, 5000) : Math.min(400 * attempt, 1200);

            console.warn(
              `PureAPI throttled/blocked [${method} ${endpoint}] via ${base} (status=${res.status}) attempt=${attempt}/${maxAttempts}`,
            );
            if (attempt < maxAttempts) await sleep(waitMs);
            continue;
          }

          console.error(`PureAPI Error [${method} ${endpoint}] via ${base}:`, res.status, txt);
          return null;
        }

        if (res.status === 204) return null;

        const json = await res.json().catch(() => null);
        if (json && typeof json === 'object' && 'data' in json) return json.data;
        return json;
      } catch (err) {
        console.error(`PureAPI Connection Failed [${method} ${endpoint}] via ${base}:`, err);
        // ลอง base ตัวถัดไป
      }
    }

    // ถ้าลองทุก base แล้วยังไม่ผ่าน และยังมี attempt เหลือ ให้หน่วงก่อนวน attempt รอบใหม่
    if (attempt < maxAttempts) await sleep(Math.min(500 * attempt, 1500));
  }

  return null;
}

module.exports = { callPureApi };
