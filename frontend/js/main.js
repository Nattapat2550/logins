// Shared utilities for all pages
const BACKEND_URL = 'https://backendlogins.onrender.com'; // Adjust for local: http://localhost:5000
const FRONTEND_URL = 'https://frontendlogins.onrender.com'; // Adjust for local

// Fetch wrapper with credentials and JSON handling
async function apiFetch(endpoint, options = {}) {
  const url = `${BACKEND_URL}${endpoint}`;
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }
    return data;
  } catch (err) {
    showMessage(`Error: ${err.message}`, 'error');
    throw err;
  }
}

// Show success/error message (uses #success/#error elements if present)
function showMessage(msg, type = 'success') {
  const el = document.getElementById(type);
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
  } else {
    alert(msg); // Fallback
  }
}

// Update nav (load user, show profile/logout if auth)
async function updateNav() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  try {
    const data = await apiFetch('/api/users/me');
    const user = data.data;
    const profileLi = document.createElement('li');
    profileLi.innerHTML = `<img src="${user.profile_picture || '/images/user.png'}" alt="Profile" class="profile"> <span>${user.username}</span>`;
    const logoutLi = document.createElement('li');
    logoutLi.innerHTML = `<button id="logoutBtn">Logout</button>`;
    nav.querySelector('ul').append(profileLi, logoutLi);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    // Show admin link if admin
    if (user.role === 'admin') {
      const adminLi = document.createElement('li');
      adminLi.innerHTML = `<a href="admin.html">Admin</a>`;
      nav.querySelector('ul').append(adminLi);
    }
  } catch (err) {
    // Not auth: hide nav or show login/register
    nav.innerHTML = '<ul><li><a href="login.html">Login</a></li><li><a href="register.html">Register</a></li></ul>';
  }
}

// Logout
async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('theme');
    window.location.href = '/login.html';
  } catch (err) {
    window.location.href = '/login.html'; // Force redirect
  }
}

// Theme toggle (for settings)
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Init theme on load
function initTheme() {
  const theme = localStorage.getItem('theme') || 'light';
  if (theme === 'dark') document.body.classList.add('dark');
}

// Export for other JS (vanilla, so global)
window.apiFetch = apiFetch;
window.updateNav = updateNav;
window.logout = logout;
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
window.showMessage = showMessage;

// Auto-init on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateNav();
});