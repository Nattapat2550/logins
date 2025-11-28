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

  // ✅ หน้า landing (public) — เช็กสถานะแบบไม่ยิง 401
  if (page === '' || page === 'index.html') {
    // ทำเป็น background check หลังหน้าโหลดเสร็จ
    window.addEventListener('load', () => {
      fetch(`${API_BASE_URL}/api/auth/status`, {
        method: 'GET',
        credentials: 'include',
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((status) => {
          // ถ้ายังไม่ล็อกอิน ก็อยู่หน้า landing ต่อไปเฉย ๆ
          if (!status || !status.authenticated) return;

          const role = (status.role || 'user').toLowerCase();
          if (role === 'admin') location.replace('admin.html');
          else location.replace('home.html');
        })
        .catch(() => {
          // ถ้าตรวจสถานะไม่ได้ ก็อยู่หน้า landing ต่อไปเฉย ๆ
        });
    });
    return;
  }

  // ✅ หน้าอื่น ๆ: ใช้ logic เดิม (ต้องเช็ค role)
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
