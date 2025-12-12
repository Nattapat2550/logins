// frontend/main.js
const BASE_URL = "https://backendlogins.onrender.com";

function getToken() {
  return localStorage.getItem("token");
}
function clearToken() {
  localStorage.removeItem("token");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await res.text().catch(() => "");
  let data = null;
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

async function guard() {
  try {
    return await api("/api/users/me");
  } catch (e) {
    if (e.status === 401) clearToken();
    throw e;
  }
}

// กันไม่ให้หน้า login เรียก guard แล้วเด้งวน
window.addEventListener("DOMContentLoaded", async () => {
  const p = (location.pathname || "").toLowerCase();
  const isLoginPage = p.includes("login");

  if (isLoginPage) return;

  try {
    await guard();
  } catch (_e) {
    location.href = "/login.html";
  }
});

// expose
window.api = api;
window.guard = guard;
