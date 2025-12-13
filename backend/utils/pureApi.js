// backend/utils/pureApi.js
const PURE_API_URL = process.env.PURE_API_BASE_URL; // e.g. https://pure-api-pry6.onrender.com
const API_KEY = process.env.PURE_API_KEY;

async function callPureApi(endpoint, method = 'POST', body = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    };
    
    if (method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${PURE_API_URL}/api/internal${endpoint}`, options);
    
    if (!res.ok) {
      const txt = await res.text();
      console.error(`PureAPI Error [${endpoint}]:`, res.status, txt);
      return null;
    }
    
    const json = await res.json();
    // ถ้า PureAPI ส่ง { ok: true, data: ... } กลับมา ให้ return data
    // แต่ถ้าส่ง array หรือ object ตรงๆ ก็ return ไปเลย
    return json.data !== undefined ? json.data : json;
  } catch (err) {
    console.error(`PureAPI Connection Failed [${endpoint}]:`, err);
    return null;
  }
}

module.exports = { callPureApi };