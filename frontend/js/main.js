// Backend URL configuration
const getBackendUrl = () => {
    // Detect production (Render) or local
    if (window.location.hostname.includes('onrender.com') || window.location.hostname.includes('render')) {
        return 'https://backendlogins.onrender.com';  // Update to your Render backend URL
    }
    return 'http://localhost:5000';
};

const BACKEND_URL = getBackendUrl();

// Token management
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// API fetch wrapper (handles FormData)
const apiFetch = async (url, options = {}) => {
    const token = getToken();
    const headers = { ...options.headers };
    if (options.body instanceof FormData) {
        // Don't set Content-Type for FormData (let browser/multer handle)
        delete headers['Content-Type'];
    } else if (!options.headers || !options.headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BACKEND_URL}${url}`, {
        ...options,
        headers
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Request failed');
    }
    return response.json();
};

// Google OAuth redirect
const googleOAuthRedirect = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
};

// Theme toggle
const toggleTheme = () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
};

// Load theme and handle OAuth callback
document.addEventListener('DOMContentLoaded', () => {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    // Navbar dropdown (if present)
    const profilePic = document.querySelector('.profile-pic');
    if (profilePic) {
        profilePic.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.querySelector('.dropdown-content');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
        // Close on outside click
        document.addEventListener('click', () => {
            const dropdown = document.querySelector('.dropdown-content');
            if (dropdown) dropdown.style.display = 'none';
        });
    }

    // Theme toggle button (if present)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Handle Google OAuth callback params
    const urlParams = new URLSearchParams(window.location.search);
    const callbackToken = urlParams.get('token');
    const callbackRedirect = urlParams.get('redirect') || '/home.html';
    const googleUsername = urlParams.get('username');

    if (callbackToken) {
        setToken(callbackToken);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Prefill username if on form.html
        if (window.location.pathname.includes('form.html') && googleUsername) {
            const usernameField = document.getElementById('username');
            if (usernameField) usernameField.value = googleUsername;
            // Hide password for Google users
            const passwordField = document.getElementById('password');
            if (passwordField) {
                passwordField.style.display = 'none';
                const passwordLabel = passwordField.closest('label') || document.querySelector('label[for="password"]');
                if (passwordLabel) passwordLabel.style.display = 'none';
            }
        }
        // Redirect
        setTimeout(() => {
            window.location.href = callbackRedirect;
        }, 500);
        return;  // Don't load user yet
    }

    // Load user if on protected page (call loadUser  () in page JS)
});

// Logout
const logout = () => {
    removeToken();
    window.location.href = '/index.html';
};

// Load user info (for protected pages)
const loadUser   = async (redirectOnFail = true) => {
    const token = getToken();
    console.log('loadUser  called. Token:', token ? `eyJ... (length: ${token.length})` : 'MISSING');  // Debug: Token value (truncated)
    if (!token) {
        console.log('No token found, redirecting to login');
        if (redirectOnFail) window.location.href = '/login.html';
        return null;
    }
    try {
        console.log('Attempting to fetch /users/profile...');
        const user = await apiFetch('/users/profile');
        console.log('User  profile loaded successfully:', { id: user.id, email: user.email, role: user.role });  // Debug: User details
        // Set navbar elements if present
        const usernameEl = document.getElementById('username');
        if (usernameEl) usernameEl.textContent = user.username || user.email;
        const profilePic = document.getElementById('profile-pic');
        if (profilePic) {
            // Fix: Use full backend URL for uploaded pics (e.g., /uploads/filename)
            const picSrc = user.profilePic && user.profilePic !== 'user.png' 
                ? `${BACKEND_URL}/uploads/${user.profilePic}` 
                : (user.profilePic.startsWith('http') ? user.profilePic : '/images/user.png');
            profilePic.src = picSrc;
            profilePic.alt = user.username || 'Profile';
            console.log('Profile pic set to:', picSrc);  // Debug
        }
        return user;
    } catch (err) {
        console.error('loadUser  failed - Error message:', err.message);
        console.error('Full loadUser  error:', err);  // Debug: Stack trace
        removeToken();
        console.log('Token removed due to profile fetch failure');
        if (redirectOnFail) {
            console.log('Redirecting to login due to failure');
            window.location.href = '/login.html';
        }
        return null;
    }
};