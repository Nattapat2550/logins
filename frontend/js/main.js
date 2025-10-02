const API_BASE_URL = 'https://backendlogins.onrender.com';

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
  if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
}

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

// Auth guard for private pages
(function guard() {
  const publicPages = new Set(['','index.html','about.html','contact.html','register.html','login.html','check.html','form.html','reset.html']);
  const page = location.pathname.split('/').pop();
  if (publicPages.has(page)) return;
  api('/api/users/me').then(me => {
    const isAdmin = me.role === 'admin';
    if (page === 'admin.html' && !isAdmin) location.replace('home.html');
    if ((page === 'home.html' || page === 'settings.html') && isAdmin) location.replace('admin.html');
    const uname = document.getElementById('uname');
    const avatar = document.getElementById('avatar');
    if (uname) uname.textContent = me.username || me.email;
    if (avatar && me.profile_picture_url) avatar.src = me.profile_picture_url;
  }).catch(() => location.replace('index.html'));
})();

// Dropdown toggle by click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('userMenu');
  if (!menu) return;
  const inside = menu.contains(e.target);
  if (inside) menu.classList.toggle('open'); else menu.classList.remove('open');
});
