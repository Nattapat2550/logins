// Token Validation (simple check; backend verifies fully)
function validateToken(token) {
  if (!token || typeof token !== 'string' || token.length < 10) return false;
  try {
    // Basic JWT check (no full decode; backend handles)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;  // Not expired
  } catch (e) {
    console.warn('Token validation failed:', e);
    return false;
  }
}

// API Call Helper (with auth token, error handling)
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
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        logout();  // Token invalid/expired
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API call error:', error);
    showAlert(error.message, 'error');
    throw error;
  }
}

// Show Alert (success/error; auto-hide after 5s)
function showAlert(message, type = 'error') {
  const alert = document.getElementById('alert');
  if (!alert) return;

  alert.textContent = message;
  alert.className = `alert alert-${type}`;
  alert.classList.remove('hidden');

  setTimeout(() => {
    alert.classList.add('hidden');
  }, 5000);
}

// Logout (clear storage, redirect to index)
function logout() {
  setStorage('token', null);
  setStorage('role', null);
  window.location.href = 'index.html';
}

// Check Auth (for protected pages; redirect if unauth)
async function checkAuth() {
  const token = getStorage('token');
  if (!token || !validateToken(token)) {
    window.location.href = 'login.html';
    return false;
  }

  // Refresh role from storage or API if needed
  let role = getStorage('role');
  if (!role) {
    try {
      const user = await apiCall('/api/users/profile');
      role = user.role;
      setStorage('role', role);
    } catch (e) {
      logout();  // Invalid token
      return false;
    }
  }

  return role;
}

// Get User Role (from storage or API)
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

// Export for other JS files (if using modules; here as global for simplicity)
window.mainUtils = {
  getStorage, setStorage, apiCall, showAlert, logout, checkAuth, getUserRole, validateToken
};

// Auto-init on DOM load (if called)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  });
}