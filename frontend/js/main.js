const BASE_URL = "https://backendlogins.onrender.com";

/**
 * token storage (กันกรณี cookie ข้ามโดเมนไม่มา)
 */
function setToken(token) {
  if (token) localStorage.setItem("token", token);
}
function getToken() {
  return localStorage.getItem("token");
}
function clearToken() {
  localStorage.removeItem("token");
}

/**
 * fetch wrapper
 * - แนบ Authorization ถ้ามี token
 * - ส่ง credentials เผื่อ cookie ใช้ได้
 */
async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  let data = null;
  const text = await res.text().catch(() => "");
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * -----------------------------
 * Auth actions (ตัวอย่าง)
 * -----------------------------
 */

async function login(email, password, remember = true) {
  const data = await api("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, remember }),
  });

  // ✅ backend จะส่ง token กลับแล้ว
  if (data && data.token) setToken(data.token);

  return data;
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}

/**
 * Guard: เรียก /api/users/me ถ้าไม่ผ่านให้เด้งไป login
 */
async function guard() {
  try {
    const me = await api("/api/users/me");
    return me;
  } catch (e) {
    // ถ้า 401 ให้ clear token เผื่อเป็น token เสีย
    if (e.status === 401) clearToken();
    throw e;
  }
}

/**
 * --------------------------------
 * ตัวอย่างการใช้งานจริง (ปรับตามหน้า)
 * --------------------------------
 * - ถ้าคุณมีระบบเดิมอยู่แล้ว แค่เอา login()/guard() ไปใช้
 */

// ตัวอย่าง: ถ้าหน้าเป็น home ให้ลอง guard ตอนโหลด
// (คุณอาจมีโค้ดเดิมอยู่แล้ว ปรับตามที่คุณใช้)
window.addEventListener("DOMContentLoaded", async () => {
  const isLoginPage = location.pathname.includes("login");
  if (isLoginPage) return;

  try {
    await guard();
    // ผ่านแล้วทำงานต่อได้
  } catch {
    // ถ้าไม่ผ่าน เด้งไป login
    location.href = "/login.html";
  }
});

// export ไว้ให้ไฟล์อื่นเรียกได้ (ถ้าคุณรวมไฟล์ผ่าน bundler ไม่ต้อง)
window.api = api;
window.login = login;
window.logout = logout;
window.guard = guard;
