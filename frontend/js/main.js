// frontend/js/main.js

// กำหนด API_BASE_URL
let API_BASE_URL = 'https://backendlogins.onrender.com';
const isLocal = location.hostname === 'localhost' || 
                location.hostname === '127.0.0.1' || 
                location.hostname.startsWith('192.168.') || 
                location.hostname.endsWith('.local'); // รองรับ mDNS เช่น computer.local

if (isLocal) {
  // สร้าง URL โดยใช้ hostname ปัจจุบันที่เปิดอยู่ และระบุ Port ของ Backend (5000)
  // วิธีนี้มือถือจะวิ่งไปที่เครื่องคอมพิวเตอร์ของคุณโดยอัตโนมัติ
  API_BASE_URL = `${location.protocol}//${location.hostname}:5000`;
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
  const token = localStorage.getItem('token');

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include', // ยังเก็บไว้ (เดสก์ท็อป/บางมือถือใช้ cookie ได้)
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // ถ้า token หมดอายุ/ไม่ถูกต้อง ให้ลบทิ้ง ป้องกัน loop
    localStorage.removeItem('token');
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return res.status === 204 ? null : res.json();
}

window.api = api;
window.API_BASE_URL = API_BASE_URL;

/**
 * Global guard: ควบคุมการเข้าถึงหน้าเว็บ
 */
(function guard() {
  const page = (location.pathname.split('/').pop() || '').toLowerCase();

  // 1. หน้าที่ "ห้ามเข้า" ถ้าล็อกอินแล้ว (Guest Only)
  const GUEST_ONLY = new Set([
    '', 'index.html', 
    'login.html', 'register.html', 'reset.html', 
    'check.html', 'form.html'
  ]);

  // 2. หน้าที่ "เข้าได้ทุกคน" (Public/Shared)
  const SHARED_PAGES = new Set([
    'about.html', 'contact.html', 'download.html'
  ]);

  // 3. หน้าที่ "ต้องล็อกอิน" (Protected)
  // แบ่งตาม Role
  const USER_PAGES = new Set(['home.html', 'settings.html']);
  const ADMIN_PAGES = new Set(['admin.html']);

  // ฟังก์ชันอัปเดต UI (รูปโปรไฟล์/ชื่อ)
  const updateUI = (me) => {
    const uname = document.getElementById('uname');
    const avatar = document.getElementById('avatar');
    if (uname) uname.textContent = me.username || me.email;
    if (avatar && me.profile_picture_url) {
      avatar.src = me.profile_picture_url;
    }
  };

  // --- Logic การตรวจสอบ ---

  // A. ถ้าเป็นหน้า GUEST ONLY -> เช็คว่าล็อกอินหรือยัง ถ้าล็อกอินแล้วให้เด้งไป Home/Admin
  if (GUEST_ONLY.has(page)) {
    fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' })
      .then(r => r.json())
      .then(status => {
        if (status.authenticated) {
          const role = (status.role || 'user').toLowerCase();
          if (role === 'admin') location.replace('admin.html');
          else location.replace('home.html');
        }
      })
      .catch(() => {}); // ถ้า error ก็ปล่อยให้อยู่หน้านี้ต่อไป
    return;
  }

  // B. ถ้าเป็นหน้า SHARED หรือ PROTECTED -> ลองดึงข้อมูล User
  api('/api/users/me')
    .then((me) => {
      // -- กรณี: ล็อกอินอยู่ --
      updateUI(me); // อัปเดตหน้าตาเว็บ

      const role = (me.role || 'user').toLowerCase();

      // ถ้าพยายามเข้าหน้า Admin แต่ไม่ใช่ Admin
      if (ADMIN_PAGES.has(page) && role !== 'admin') {
        location.replace('home.html');
      }
      // ถ้า Admin พยายามเข้าหน้า User (Home) ก็ปล่อยเข้าได้ หรือจะ redirect ก็ได้ตาม design
      // แต่ปกติ Admin เข้า home.html ได้ไม่มีปัญหา
    })
    .catch(() => {
      // -- กรณี: ไม่ได้ล็อกอิน (หรือ Token หมดอายุ) --
      
      // ถ้าอยู่ในหน้า SHARED (About, Contact, Download) -> ปล่อยให้อยู่ต่อได้ (ในฐานะ Guest)
      if (SHARED_PAGES.has(page)) {
        return; 
      }

      // ถ้าเป็นหน้า Protected (Home, Admin, Settings) -> ดีดไปหน้า Login/Index
      location.replace('index.html');
    });
})();

/* ==== Optional handlers ==== */
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('userMenu');
  if (menu) {
    document.addEventListener('click', (e) => {
      if (menu.contains(e.target)) menu.classList.toggle('open');
      else menu.classList.remove('open');
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
      localStorage.removeItem('token'); // ✅ เพิ่ม
      location.replace('index.html');
    });
  }
});