// Common utilities: Theme toggle, navbar, auth check, logout

const API_BASE = ''; // Relative to same domain; change to 'http://localhost:5000' for local dev if separate

// Theme toggle
const toggleTheme = () => {
  const body = document.body;
  const isDark = body.classList.contains('dark-mode');
  body.classList.toggle('dark-mode');
  localStorage.setItem('dark-mode', !isDark);
};

// Load theme on init
document.addEventListener('DOMContentLoaded', () => {
  const isDark = localStorage.getItem('dark-mode') === 'true';
  if (isDark) document.body.classList.add('dark-mode');
  
  // Navbar setup
  setupNavbar();
  
  // Theme toggle button
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
    toggleBtn.textContent = document.body.classList.contains('dark-mode') ? 'Light' : 'Dark';
  }
  
  // Auth check for protected pages
  const protectedPages = ['home.html', 'settings.html', 'admin.html'];
  if (protectedPages.includes(window.location.pathname.split('/').pop())) {
    checkAuth();
  }
});

// Setup navbar (dynamic login/logout)
const setupNavbar = () => {
  const authButtons = document.getElementById('auth-buttons');
  if (!authButtons) return;

  // Check if logged in
  fetch(`${API_BASE}/api/users/me`, { credentials: 'include' })
    .then(res => {
      if (res.ok) {
        authButtons.innerHTML = `
          <button onclick="showProfile()">Profile</button>
          <button onclick="logout()">Logout</button>
        `;
        // Show admin link if admin
        fetchUserRole().then(role => {
          const adminLink = document.getElementById('admin-link');
            if (adminLink) adminLink.style.display = role === 'admin' ? 'block' : 'none';
        });
      } else {
        authButtons.innerHTML = `
          <a href="login.html">Login</a>
          <a href="register.html">Register</a>
        `;
      }
    })
    .catch(() => {
      authButtons.innerHTML = `
        <a href="login.html">Login</a>
        <a href="register.html">Register</a>
      `;
    });
};

// Check auth and redirect if needed
const checkAuth = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
    if (!res.ok) {
      window.location.href = 'login.html';
      return;
    }
    const user = await res.json();
    // For admin.html, check role
    if (window.location.pathname.includes('admin.html') && user.role !== 'admin') {
      window.location.href = 'home.html';
    }
  } catch (err) {
    window.location.href = 'login.html';
  }
};

// Fetch current user role
const fetchUserRole = async () => {
  const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
  if (res.ok) {
    const user = await res.json();
    return user.role;
  }
  return null;
};

// Logout: Clear cookie by setting maxAge=0 or backend endpoint if added
const logout = () => {
  fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }) // Optional backend logout
    .catch(() => {}); // Ignore errors
  document.cookie = 'jwt=; Max-Age=0; path=/;'; // Client-side clear (works for httpOnly in some cases; better via backend)
  window.location.href = 'index.html';
};

// Show profile (e.g., username in navbar)
const showProfile = async () => {
  const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
  if (res.ok) {
    const user = await res.json();
    alert(`Logged in as: ${user.username}`);
  }
};

// Generic fetch helper with error handling
const apiFetch = async (url, options = {}) => {
  const defaults = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };
  const res = await fetch(`${API_BASE}${url}`, { ...defaults, ...options });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
};