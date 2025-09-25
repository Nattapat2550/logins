const API_BASE = 'https://backendlogins.onrender.com/api'; // Update to your Render backend URL

// API helper with auth
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...options
  };
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'API error');
  }
  return res.json();
};

// Auth check for protected pages
const checkAuth = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (!token || !userStr) {
    window.location.href = '/login';
    return false;
  }
  return JSON.parse(userStr);
};

// Navbar renderer (call on each page load)
const renderNavbar = (user) => {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const profilePic = user.profile_pic.startsWith('http') ? user.profile_pic : 
                     user.profile_pic === 'user.png' ? '/assets/user.png' : `${API_BASE.replace('/api', '')}${user.profile_pic}`;

  navbar.innerHTML = `
    <div class="navbar">
      <div class="site-name">My Website</div>
      <div class="dropdown">
        <img src="${profilePic}" alt="Profile" class="profile-pic" id="profile-pic">
        <div class="dropdown-content">
          <a href="/settings">Settings</a>
          <a href="#" id="logout">Logout</a>
        </div>
      </div>
    </div>
  `;

  // Logout
  document.getElementById('logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/';
  });

  // Dark mode (if on settings/home)
  const darkBtn = document.getElementById('dark-toggle');
  if (darkBtn) {
    darkBtn.addEventListener('click', toggleDarkMode);
  }
};

// Apply dark mode on load
const applyDarkMode = () => {
  const isDark = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark-mode', isDark);
};

// Export for other JS
window.common = { apiCall, checkAuth, renderNavbar, applyDarkMode };