// frontend/js/main.js
// Common utilities: Theme toggle, navbar, auth check, logout, and API helper

// API base URL: Relative for same-domain (production); update for local dev
const API_BASE = 'https://backendlogins.onrender.com'; // e.g., 'http://localhost:5000' if backend on different port

// Theme toggle
const toggleTheme = () => {
  const body = document.body;
  body.classList.toggle('dark-mode');
  const isDark = body.classList.contains('dark-mode');
  localStorage.setItem('dark-mode', isDark);
  
  // Update button text
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = isDark ? 'Light' : 'Dark';
  }
};

// Load theme on init
document.addEventListener('DOMContentLoaded', () => {
  // Load saved theme
  const isDark = localStorage.getItem('dark-mode') === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
  }
  
  // Setup theme toggle button
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
    toggleBtn.textContent = document.body.classList.contains('dark-mode') ? 'Light' : 'Dark';
  }
  
  // Setup navbar (auth-dependent)
  setupNavbar();
  
  // Auth check for protected pages
  const protectedPages = ['home.html', 'settings.html', 'admin.html'];
  const currentPage = window.location.pathname.split('/').pop();
  if (protectedPages.includes(currentPage)) {
    checkAuth();
  }
});

// Setup navbar (dynamic login/logout and admin link)
const setupNavbar = async () => {
  const authButtons = document.getElementById('auth-buttons');
  if (!authButtons) return;

  try {
    const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
    if (res.ok) {
      const user = await res.json();
      authButtons.innerHTML = `
        <button onclick="showProfile()">Profile</button>
        <button onclick="logout()">Logout</button>
      `;
      
      // Show/hide admin link based on role
      const adminLink = document.getElementById('admin-link');
      if (adminLink) {
        adminLink.style.display = user.role === 'admin' ? 'block' : 'none';
      }
    } else {
      authButtons.innerHTML = `
        <a href="login.html">Login</a>
        <a href="register.html">Register</a>
      `;
      
      // Hide admin link if not logged in
      const adminLink = document.getElementById('admin-link');
      if (adminLink) {
        adminLink.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Navbar auth check error:', err);
    authButtons.innerHTML = `
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
    `;
    
    // Hide admin link on error
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
      adminLink.style.display = 'none';
    }
  }
};

// Check auth and redirect if needed (for protected pages)
const checkAuth = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
    if (!res.ok) {
      window.location.href = 'login.html?error=unauthorized';
      return;
    }
    
    const user = await res.json();
    
    // Special check for admin page
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'admin.html' && user.role !== 'admin') {
      window.location.href = 'home.html?error=not_admin';
      return;
    }
    
    // Update UI with user info if needed (e.g., welcome message)
    const welcomeEl = document.getElementById('welcome-user');
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${user.username}!`;
    }
  } catch (err) {
    console.error('Auth check error:', err);
    window.location.href = 'login.html?error=auth_failed';
  }
};

// Fetch current user role (helper)
const fetchUserRole = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
    if (res.ok) {
      const user = await res.json();
      return user.role;
    }
    return null;
  } catch (err) {
    console.error('Fetch role error:', err);
    return null;
  }
};

// Logout: Clear cookie and redirect
const logout = async () => {
  try {
    // Optional: Call backend logout if implemented (clears server-side if needed)
    await fetch(`${API_BASE}/api/auth/logout`, { 
      method: 'POST', 
      credentials: 'include' 
    }).catch(() => {}); // Ignore if endpoint doesn't exist
    
    // Client-side cookie clear (httpOnly limits full effect, but helps)
    document.cookie = 'jwt=; Max-Age=0; path=/; domain=' + window.location.hostname;
  } catch (err) {
    console.error('Logout error:', err);
  }
  
  // Redirect to index
  window.location.href = 'index.html';
};

// Show profile (e.g., alert username or update navbar)
const showProfile = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
    if (res.ok) {
      const user = await res.json();
      alert(`Logged in as: ${user.username} (${user.role})\nEmail: ${user.email}`);
      // Optional: Redirect to settings
      // window.location.href = 'settings.html';
    } else {
      alert('Profile fetch failed. Please log in again.');
      logout();
    }
  } catch (err) {
    console.error('Show profile error:', err);
    alert('Error loading profile.');
  }
};

// Generic fetch helper with robust error handling (prevents "Unexpected end of JSON input")
const apiFetch = async (url, options = {}) => {
  const defaults = { 
    credentials: 'include', 
    headers: { 'Content-Type': 'application/json' } 
  };
  
  try {
    const res = await fetch(`${API_BASE}${url}`, { ...defaults, ...options });
    
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: Request failed`;
      
      // Try to parse error as JSON if possible
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (parseErr) {
          console.error('Error parsing JSON error response:', parseErr);
        }
      } else {
        // Non-JSON error (e.g., HTML error page from server)
        try {
          const text = await res.text();
          console.error(`Non-JSON error response for ${url}:`, text.substring(0, 500)); // Log first 500 chars
          errorMsg = 'Server error (check console for details)';
        } catch (textErr) {
          console.error('Failed to read error text:', textErr);
        }
      }
      
      throw new Error(errorMsg);
    }
    
    // Handle success response
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // Safely parse JSON
      try {
        return await res.json();
      } catch (jsonErr) {
        console.error(`JSON parse error for ${url}:`, jsonErr);
        throw new Error('Invalid JSON response from server');
      }
    } else {
      // Non-JSON success (e.g., empty body or plain text)
      const text = await res.text();
      console.warn(`Non-JSON success response for ${url}:`, text || '(empty)');
      return text ? { raw: text } : { message: 'OK' }; // Fallback object
    }
  } catch (err) {
    console.error(`API fetch error for ${url}:`, err);
    throw err; // Re-throw for caller to handle (e.g., alert)
  }
};

// Export for use in other JS files (if using modules; otherwise global)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { apiFetch, toggleTheme, checkAuth, setupNavbar };
}
// Globals are already available in browser scope