// main.js - Shared Utilities

const apiUrl = 'https://backendlogins.onrender.com/api';

// Get cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Redirect if logged in
async function redirectIfLoggedIn() {
  try {
    const res = await fetch(`${apiUrl}/me`, { credentials: 'include' });
    if (res.ok) {
      const user = await res.json();
      if (user.role === 'admin') {
        window.location.href = '/views/admin.html';
      } else {
        window.location.href = '/views/home.html';
      }
    }
  } catch {
    // Not logged in
  }
}

// Toggle password visibility
function togglePasswordVisibility(checkboxId, inputId) {
  const checkbox = document.getElementById(checkboxId);
  const input = document.getElementById(inputId);
  if (checkbox && input) {
    checkbox.addEventListener('change', () => {
      input.type = checkbox.checked ? 'password' : 'text';
    });
  }
}

// Setup profile dropdown
function setupDropdown(profilePicId, dropdownId) {
  const profilePic = document.getElementById(profilePicId);
  const dropdown = document.getElementById(dropdownId);
  if (profilePic && dropdown) {
    profilePic.addEventListener('click', () => {
      dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    });
    window.addEventListener('click', (e) => {
      if (!profilePic.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }
}

// Toggle dark/light theme
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Load theme on page load
function loadTheme() {
  const theme = localStorage.getItem('theme') || 'light';
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  }
}

// Load user profile data (for home/admin)
async function loadUserProfile(profilePicId, titleId, contentId) {
  try {
    const res = await fetch(`${apiUrl}/me`, { credentials: 'include' });
    if (!res.ok) throw new Error('Not logged in');
    const user = await res.json();

    const profilePic = document.getElementById(profilePicId);
    if (profilePic) {
      profilePic.src = user.picture || '/public/images/User.png';
      profilePic.alt = user.username || 'User ';
    }

    if (titleId) {
      document.getElementById(titleId).textContent = `Welcome, ${user.username || user.email}`;
    }

    if (contentId) {
      document.getElementById(contentId).textContent = 'This is your personalized content.';
    }

    return user;
  } catch {
    window.location.href = '/views/login.html';
  }
}

// Logout
async function logout() {
  try {
    await fetch(`${apiUrl}/logout`, { method: 'POST', credentials: 'include' });
  } catch {}
  window.location.href = '/views/index.html';
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', loadTheme);