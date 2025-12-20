// frontend/js/main.js

let API_BASE_URL = 'https://backendlogins.onrender.com';
const isLocal = location.hostname === 'localhost' || 
                location.hostname === '127.0.0.1' || 
                location.hostname.startsWith('192.168.') || 
                location.hostname.endsWith('.local');

if (isLocal) {
  API_BASE_URL = `${location.protocol}//${location.hostname}:5000`;
}

// ✅ รับ token จาก URL fragment (#token=...&role=...) แล้วเก็บลง localStorage
(function captureTokenFromHash() {
  try {
    if (!location.hash || location.hash.length < 2) return;
    const params = new URLSearchParams(location.hash.slice(1));
    const token = params.get('token');
    if (!token) return;
    localStorage.setItem('token', token);
    history.replaceState(null, document.title, location.pathname + location.search);
  } catch {}
})();

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
    credentials: 'include',
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.status === 204 ? null : res.json();
}

window.api = api;
window.API_BASE_URL = API_BASE_URL;

(function guard() {
  const page = (location.pathname.split('/').pop() || '').toLowerCase();

  const GUEST_ONLY = new Set([
    '', 'index.html',
    'login.html', 'register.html', 'reset.html',
    'check.html', 'form.html'
  ]);

  const SHARED_PAGES = new Set([
    'about.html', 'contact.html', 'download.html'
  ]);

  const ADMIN_PAGES = new Set(['admin.html']);

  const updateUI = (me) => {
    const uname = document.getElementById('uname');
    const avatar = document.getElementById('avatar');
    if (uname) uname.textContent = me.username || me.email;
    if (avatar && me.profile_picture_url) avatar.src = me.profile_picture_url;
  };

  if (GUEST_ONLY.has(page)) {
    api('/api/auth/status')
      .then(status => {
        if (status && status.authenticated) {
          const role = (status.role || 'user').toLowerCase();
          if (role === 'admin') location.replace('admin.html');
          else location.replace('home.html');
        }
      })
      .catch(() => {});
    return;
  }

  api('/api/users/me')
    .then((me) => {
      updateUI(me);
      const role = (me.role || 'user').toLowerCase();
      if (ADMIN_PAGES.has(page) && role !== 'admin') {
        location.replace('home.html');
      }
    })
    .catch(() => {
      if (SHARED_PAGES.has(page)) return;
      location.replace('index.html');
    });
})();

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
      localStorage.removeItem('token');
      location.replace('index.html');
    });
  }
});
