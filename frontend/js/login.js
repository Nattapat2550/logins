// frontend/login.js
const BASE_URL = "https://backendlogins.onrender.com";

function setToken(token) {
  if (token) localStorage.setItem("token", token);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
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

document.getElementById("loginBtn").onclick = async () => {
  try {
    const email = document.getElementById("email").value?.trim();
    const password = document.getElementById("password").value || "";
    const remember = document.getElementById("remember")?.checked ?? true;

    if (!email || !password) {
      alert("กรุณากรอก email และ password");
      return;
    }

    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });

    // ✅ สำคัญ: backend ต้องส่ง token กลับ (ตามไฟล์ backend/routes/auth.js ที่ให้ไป)
    if (data && data.token) setToken(data.token);

    // ไปหน้าหลักตาม role
    if (data.role === "admin") {
      location.href = "/admin.html";
    } else {
      location.href = "/home.html";
    }
  } catch (e) {
    console.error(e);
    alert(e.data?.error || e.message || "Login failed");
  }
};
