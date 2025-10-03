const API_BASE_URL = 'https://backendlogins.onrender.com';

/* ==== Theme toggle ==== */
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
}

/* ==== API helper ==== */
async function api(path, { method='GET', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}
window.api = api;
window.API_BASE_URL = API_BASE_URL;

/* ==== PAGE ACCESS CONTROL ==== */
(function guard() {
  // หน้าที่อนุญาตเมื่อ "ยังไม่ล็อกอิน/ไม่มี token"
  const LOGGED_OUT_ALLOWED = new Set([
    '', 'index.html', 'about.html', 'contact.html', 'register.html', 'login.html',
    'check.html', 'form.html', 'reset.html' // เปิดให้ guest ตามที่ขอ
  ]);

  // หน้าที่อนุญาตให้ "user"
  const USER_ALLOWED  = new Set(['home.html', 'about.html', 'contact.html', 'settings.html']);

  // หน้าที่อนุญาตให้ "admin"
  const ADMIN_ALLOWED = new Set(['admin.html', 'about.html', 'contact.html']);

  const page = (location.pathname.split('/').pop() || '').toLowerCase();

  // เช็คสถานะผู้ใช้จาก token (cookie)
  api('/api/users/me')
    .then(me => {
      const role = (me.role || 'user').toLowerCase();

      // ใส่ชื่อ/รูป ถ้ามี element เหล่านี้ (optional-safe)
      const uname = document.getElementById('uname');
      const avatar = document.getElementById('avatar');
      if (uname) uname.textContent = me.username || me.email;
      if (avatar && me.profile_picture_url) avatar.src = me.profile_picture_url;

      if (role === 'admin') {
        if (!ADMIN_ALLOWED.has(page)) location.replace('admin.html');
      } else {
        if (!USER_ALLOWED.has(page)) location.replace('home.html');
      }
    })
    .catch(() => {
      // ไม่มี token => เข้าได้เฉพาะ LOGGED_OUT_ALLOWED
      if (!LOGGED_OUT_ALLOWED.has(page)) location.replace('index.html');
    });
})();

/* ==== Optional handlers (ไม่พบบนทุกหน้า → ต้องเช็กก่อน) ==== */
document.addEventListener('DOMContentLoaded', () => {
  // Dropdown toggle แบบคลิก
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
        await api('/api/auth/logout', { method:'POST' });
      } catch {}
      location.replace('index.html');
    });
  }
});
