// backend/utils/pureApi.js
const PURE_API_URL = process.env.PURE_API_BASE_URL; // เช่น https://pure-api-pry6.onrender.com
const API_KEY = process.env.PURE_API_KEY;

async function callPureApi(endpoint, body = {}) {
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
      console.error(`PureAPI Error [${endpoint}]:`, res.status, txt);
      return null;
    }

    const json = await res.json();
    // ถ้า API ส่งกลับมาเป็น { ok: true, data: ... } ให้เอา data
    // หรือถ้าเป็นอย่างอื่นให้ส่งกลับไปทั้งก้อน
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data;
    }
    return json;
  } catch (err) {
    console.error(`PureAPI Connection Failed [${endpoint}]:`, err);
    return null;
  }
}

module.exports = { callPureApi };