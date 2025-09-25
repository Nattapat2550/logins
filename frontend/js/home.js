// frontend/js/home.js
const API_BASE = 'https://backendlogins.onrender.com/api';  // Your backend URL
const token = localStorage.getItem('token');

// Helper: Show error message
function showError(message, isTemp = false) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  if (isTemp) {
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
  }
}

// Helper: Show success message
function showSuccess(message) {
  const successDiv = document.getElementById('successMessage');
  successDiv.textContent = message;
  successDiv.classList.remove('hidden');
  setTimeout(() => successDiv.classList.add('hidden'), 5000);
}

// Helper: Hide loading and show content
function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  showSuccess('Logged out successfully!');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1500);
}

// Load homepage data
async function loadHomepage() {
  if (!token) {
    // No token: Redirect to login
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/homepage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (res.ok && data.user) {
      // Success: Update DOM
      hideLoading();

      // Profile section
      document.getElementById('profilePic').src = data.user.profilePic;  // Backend provides default if null
      document.getElementById('usernameDisplay').textContent = data.user.username;
      document.getElementById('emailDisplay').textContent = data.user.email;
      document.getElementById('roleDisplay').textContent = `Role: ${data.user.role}`;
      document.getElementById('profileSection').classList.remove('hidden');

      // Welcome message
      document.getElementById('welcomeMessage').textContent = data.message;
      document.getElementById('welcomeMessage').classList.remove('hidden');

      // Stats
      document.getElementById('joinedDate').textContent = new Date(data.stats.joined).toLocaleDateString();
      document.getElementById('verifiedStatus').textContent = data.stats.verified ? 'Yes' : 'No';
      document.getElementById('statsSection').classList.remove('hidden');

      // Show admin link if role is admin
      if (data.user.role === 'admin') {
        document.getElementById('adminLink').classList.remove('admin-only');
        document.getElementById('adminLink').href = 'admin.html';  // Link to admin page (create if needed)
      }

      showSuccess('Dashboard loaded successfully!');
    } else if (res.status === 401) {
      // Invalid token: Auto-logout
      localStorage.removeItem('token');
      showError('Session expired. Redirecting to login...');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      // Other errors (e.g., 500, 404)
      hideLoading();
      showError(data.error || 'Failed to load dashboard. Please try again.');
      console.error('Homepage error:', data);
    }
  } catch (error) {
    hideLoading();
    showError('Network error: ' + error.message);
    console.error('Network error:', error);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadHomepage);