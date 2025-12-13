// frontend/js/main.js

// กำหนด API_BASE_URL ให้รองรับทั้ง dev (localhost) และ production (Render)
let API_BASE_URL = 'https://backendlogins.onrender.com';
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  API_BASE_URL = 'http://localhost:5000';
}

/* ==== Theme toggle ==== */
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      localStorage.setItem(
        'theme',
        document.body.classList.contains('dark') ? 'dark' : 'light'
      );
    });
  }
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
  }
});

/* ==== API helper ==== */
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  // ถ้า status 401 ให้ throw error ออกไป เพื่อให้ catch ข้างล่างจัดการ
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.status === 204 ? null : res.json();
}

window.api = api;
window.API_BASE_URL = API_BASE_URL;

/**
 * Global guard สำหรับควบคุมว่าใครเข้าแต่ละหน้าได้บ้าง
 */
(function guard() {
  // หน้าที่อนุญาตเมื่อ "ยังไม่ล็อกอิน/ไม่มี token"
  const LOGGED_OUT_ALLOWED = new Set([
    '',
    'index.html',
    'about.html',
    'contact.html',
    'register.html',
    'login.html',
    'check.html',
    'form.html',
    'reset.html',
    'download.html',
  ]);

  // หน้าที่อนุญาตให้ "user"
  const USER_ALLOWED = new Set([
    'home.html',
    'about.html',
    'contact.html',
    'settings.html',
    'download.html',
  ]);

  // หน้าที่อนุญาตให้ "admin"
  const ADMIN_ALLOWED = new Set([
    'admin.html',
    'about.html',
    'contact.html',
    'download.html',
  ]);

  const page = (location.pathname.split('/').pop() || '').toLowerCase();

  // 1. ถ้าเป็นหน้า Public (เช่น หน้าแรก, login) ให้เช็คสถานะแบบเงียบๆ
  if (LOGGED_OUT_ALLOWED.has(page)) {
    // ใช้ /status แทน /me เพื่อไม่ให้เกิด 401 error ใน console ถ้ายังไม่ login
    fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' })
      .then(r => r.json())
      .then(status => {
        if (status.authenticated) {
          // ถ้า Login แล้ว แต่ดันมาหน้า index/login -> ให้เด้งไปหน้า home/admin
          const role = (status.role || 'user').toLowerCase();
          if (role === 'admin') location.replace('admin.html');
          else location.replace('home.html');
        }
        // ถ้า authenticated = false ก็ปล่อยให้อยู่หน้านี้ต่อ (ไม่ทำอะไร)
      })
      .catch(() => { /* ignore network error */ });
    return;
  }

  // 2. ถ้าเป็นหน้า Protected (home, admin, settings) -> บังคับ Login
  api('/api/users/me')
    .then((me) => {
      const role = (me.role || 'user').toLowerCase();

      // ใส่ชื่อ/รูป ถ้ามี element เหล่านี้
      const uname = document.getElementById('uname');
      const avatar = document.getElementById('avatar');
      if (uname) uname.textContent = me.username || me.email;
      if (avatar && me.profile_picture_url) {
        avatar.src = me.profile_picture_url;
      }

      // เช็คสิทธิ์ตาม Role
      if (role === 'admin') {
        if (!ADMIN_ALLOWED.has(page)) location.replace('admin.html');
      } else {
        if (!USER_ALLOWED.has(page)) location.replace('home.html');
      }
    })
    .catch((err) => {
      // กรณี 401 Unauthorized หรือ Error อื่นๆ -> ดีดกลับไปหน้าแรก
      if (err.message === 'Unauthorized' || !LOGGED_OUT_ALLOWED.has(page)) {
        location.replace('index.html');
      }
    });
})();

/* ==== Optional handlers (เช็ก element ก่อนเสมอ) ==== */
document.addEventListener('DOMContentLoaded', () => {
  // Dropdown toggle แบบคลิก (มีเฉพาะบางหน้า)
  const menu = document.getElementById('userMenu');
  if (menu) {
    document.addEventListener('click', (e) => {
      const inside = menu.contains(e.target);
      if (inside) menu.classList.toggle('open');
      else menu.classList.remove('open');
    });
  }

  // Logout (มีเฉพาะบางหน้า)
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await api('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore
      }
      location.replace('index.html');
    });
  }
});