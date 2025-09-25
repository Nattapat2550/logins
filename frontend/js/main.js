const API_BASE = 'https://backendlogins.onrender.com/api'; // Change to https://backendlogins.onrender.com/api for production

// Theme Toggle
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const newTheme = current === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Auth Check (for protected pages)
async function checkAuth(redirectIfUnauthorized = true) {
  const token = localStorage.getItem('token');
  if (!token) {
    if (redirectIfUnauthorized) window.location.href = 'login.html';
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      return user;
    } else {
      localStorage.removeItem('token');
      if (redirectIfUnauthorized) window.location.href = 'login.html';
      return null;
    }
  } catch (err) {
    console.error('Auth check failed:', err);
    if (redirectIfUnauthorized) window.location.href = 'login.html';
    return null;
  }
}

// Navbar Injection
function renderNavbar(user = null) {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let profileHtml = '';
  if (user) {
    const picSrc = user.profilePic || 'images/user.png';
    profileHtml = `
      <div class="profile" onclick="toggleDropdown()">
        <img src="${picSrc}" alt="Profile" class="profile-pic">
        <div class="dropdown" id="dropdown">
          <a href="settings.html">Settings</a>
          <a href="#" onclick="logout()">Logout</a>
        </div>
      </div>
    `;
  } else {
    profileHtml = '<span>Guest</span>';
  }

  navbar.innerHTML = `
    <div class="logo">My Website</div>
    <nav>
      <a href="about.html">About</a>
      <a href="contact.html">Contact</a>
      ${user ? `<button id="themeToggle" class="theme-toggle" onclick="toggleTheme()">🌙</button>` : ''}
      ${profileHtml}
    </nav>
  `;
}

// Toggle Dropdown
function toggleDropdown() {
  const dropdown = document.getElementById('dropdown');
  dropdown.classList.toggle('show');
}

// Logout
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

async function apiCall(url, options = {}) {
  const defaults = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  const config = { ...defaults, ...options };
  
  // Add token if present (skip for login/register)
  const token = localStorage.getItem('token');
  if (token && !url.includes('/auth/login') && !url.includes('/auth/register')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Handle body for POST/PUT (JSON.stringify if object)
  if (options.body && typeof options.body === 'object' && options.body !== null) {
    config.body = JSON.stringify(options.body);
  }
  
  try {
    const res = await fetch(url, config);
    // DO NOT throw here - return res for caller to handle status (e.g., 401 with body)
    return res;
  } catch (error) {
    console.error('API call network error:', error);
    throw error;  // Only throw true network/fetch errors (e.g., offline)
  }
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (window.location.pathname.includes('home.html') || window.location.pathname.includes('settings.html') || window.location.pathname.includes('admin.html')) {
    checkAuth().then(user => {
      renderNavbar(user);
      if (user && window.location.pathname.includes('admin.html') && user.role !== 'admin') {
        window.location.href = 'home.html';
      } else if (user && window.location.pathname.includes('home.html') && user.role === 'admin') {
        window.location.href = 'admin.html';
      }
    });
  } else {
    renderNavbar();
  }
  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.profile')) {
      document.getElementById('dropdown')?.classList.remove('show');
    }
  });
});