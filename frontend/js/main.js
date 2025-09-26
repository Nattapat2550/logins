// Config
const API_BASE = 'https://backendlogins.onrender.com';  // Backend URL (change to http://localhost:5000 for local dev)
const BACKEND_URL = 'https://backendlogins.onrender.com';  // For Google redirect

// Get/Set localStorage helpers (global functions)
function getStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (e) {
    console.warn('localStorage not available:', e);
    return defaultValue;
  }
}

function setStorage(key, value) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn('localStorage set failed:', e);
  }
}

// Theme Management (global functions)
function initTheme() {
  const savedTheme = getStorage('theme', 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  setStorage('theme', newTheme);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  }
}

// Navbar Setup (dynamic based on auth - global function)
function setupNavbar() {
  const navLinks = document.getElementById('navLinks');
  const navbar = document.getElementById('navbar');
  if (!navLinks || !navbar) return;

  const token = getStorage('token');
  const isAuth = !!token && validateToken(token);

  // Base links (adjust based on auth state)
  let links = [];
  if (isAuth) {
    // Authenticated: Protected links
    links = [
      { href: 'home.html', text: 'Home' },
      { href: 'settings.html', text: 'Settings' }
    ];
    const role = getStorage('role');
    if (role === 'admin') {
      links.push({ href: 'admin.html', text: 'Admin' });
    }
    links.push({ id: 'logoutBtn', text: 'Logout', type: 'button' });
  } else {
    // Public: Auth links
    links = [
      { href: 'index.html', text: 'Home' },
      { href: 'about.html', text: 'About' },
      { href: 'contact.html', text: 'Contact' },
      { href: 'register.html', text: 'Register' },
      { href: 'login.html', text: 'Login' }
    ];
  }

  // Always add theme toggle
  links.push({ id: 'themeToggle', text: '', type: 'button' });

  // Render links HTML
  navLinks.innerHTML = links.map(link => {
    if (link.type === 'button') {
      const className = link.id === 'logoutBtn' ? 'secondary' : 'theme-toggle';
      return `<li><button id="${link.id}" class="${className}">${link.text}</button></li>`;
    }
    return `<li><a href="${link.href}">${link.text}</a></li>`;
  }).join('');

  // Event listeners
  const themeBtn = document.getElementById('themeToggle');
  const logoutBtn = document.getElementById('logoutBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Logo: Redirect to home/index based on auth
  const logo = navbar.querySelector('.logo');
  if (logo) {
    logo.href = isAuth ? 'home.html' : 'index.html';
  }
}

// Token Validation (simple JWT check - global function)
function validateToken(token) {
  if (!token || typeof token !== 'string' || token.length < 10) return false;
  try {
    // Basic payload decode (no secret needed; check exp)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload && payload.exp > (Date.now() / 1000);  // Not expired
  } catch (e) {
    console.warn('Token validation failed:', e);
    return false;
  }
}

// API Call Helper (with auth, error handling - global function)
async function apiCall(endpoint, options = {}) {
  const token = getStorage('token');
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (token && validateToken(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const data = response.status !== 204 ? await response.json() : {};
      if (response.status === 401) {
        logout();  // Auto-logout on unauthorized
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.status === 204 ? {} : await response.json();
  } catch (error) {
    console.error('API call error:', endpoint, error);
    const alertEl = document.getElementById('alert');
    if (alertEl) {
      showAlert(error.message, 'error');
    }
    throw error;
  }
}

// Show Alert (success/error; auto-hide - global function)
function showAlert(message, type = 'error') {
  const alertEl = document.getElementById('alert');
  if (!alertEl) {
    console.warn('No alert element found');
    return;
  }

  alertEl.textContent = message;
  alertEl.className = `alert alert-${type}`;
  alertEl.classList.remove('hidden');

  // Auto-hide after 5s
  setTimeout(() => {
    alertEl.classList.add('hidden');
  }, 5000);
}

// Logout (clear storage, redirect - global function)
function logout() {
  setStorage('token', null);
  setStorage('role', null);
  setStorage('userId', null);
  window.location.href = 'index.html';
}

// Check Auth (for protected pages; redirect if unauth - global async function)
async function checkAuth() {
  const token = getStorage('token');
  if (!token || !validateToken(token)) {
    window.location.href = 'login.html';
    return null;
  }

  // Fetch role if not stored
  let role = getStorage('role');
  if (!role) {
    try {
      const user = await apiCall('/api/users/profile');
      role = user.role;
      setStorage('role', role);
      setStorage('userId', user.id);
    } catch (e) {
      logout();
      return null;
    }
  }
  return role;
}

// Get User Role (from storage or API - global async function)
async function getUserRole() {
  const role = getStorage('role');
  if (role) return role;

  try {
    const user = await apiCall('/api/users/profile');
    setStorage('role', user.role);
    return user.role;
  } catch (e) {
    return null;
  }
}

// Expose utils globally for other JS files (e.g., register.js calls apiCall)
window.mainUtils = {
  getStorage, setStorage, apiCall, showAlert, logout, checkAuth, getUserRole, validateToken,
  initTheme, toggleTheme, setupNavbar
};

// Auto-setup theme toggle if element exists (runs on load)
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  // Note: setupNavbar() is called from HTML inline scripts, not auto here
});