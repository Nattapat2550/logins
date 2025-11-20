const API_BASE_URL = 'https://backendlogins.onrender.com';

/* ==== Theme toggle ==== */
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
  }
});

/* ==== API helper ==== */
async function api(path, { method = 'GET', body } = {}) {
  const options = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(
    path.startsWith('http') ? path : `${API_BASE_URL}${path}`,
    options
  );

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && data.error
        ? data.error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/**
 * guard({ requireAuth, redirectIfAuthed })
 * - requireAuth: ถ้า true แล้ว /api/users/me fail → เด้งไปหน้า login
 * - redirectIfAuthed: ถ้าเซ็ต เช่น 'home.html' แล้ว user login อยู่ → เด้งไปหน้านั้น
 */
async function guard({ requireAuth = false, redirectIfAuthed } = {}) {
  try {
    const me = await api('/api/users/me');
    if (redirectIfAuthed) {
      location.replace(redirectIfAuthed);
      return null;
    }
    return me;
  } catch (_err) {
    if (requireAuth) {
      location.replace('login.html');
    }
    return null;
  }
}

/* ==== Navbar, dropdown, logout ==== */
document.addEventListener('DOMContentLoaded', () => {
  // highlight current nav
  const current = location.pathname.split('/').pop();
  document.querySelectorAll('nav a[data-page]').forEach((a) => {
    if (a.dataset.page === current) {
      a.classList.add('active');
    }
  });

  // profile dropdown
  const avatarBtn = document.getElementById('avatarBtn');
  const menu = document.getElementById('avatarMenu');
  if (avatarBtn && menu) {
    avatarBtn.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('open')) return;
      const inside =
        avatarBtn.contains(e.target) || menu.contains(e.target);
      if (!inside) {
        menu.classList.remove('open');
      }
    });
  }

  // Logout button (บางหน้าอาจไม่มี)
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
