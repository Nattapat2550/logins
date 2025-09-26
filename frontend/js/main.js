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

// API fetch wrapper (handles FormData, with logging for debug)
const apiFetch = async (url, options = {}) => {
    const token = getToken();
    console.log('apiFetch called:', url, 'Token present?', !!token);  // Debug: Log each call
    if (!token && (url.includes('/users/') || url.includes('/admin/') || url.includes('/homepage/'))) {
        console.warn('Protected API called without token:', url);
    }

    const headers = { ...options.headers };
    if (options.body instanceof FormData) {
        // Don't set Content-Type for FormData (let browser/multer handle)
        delete headers['Content-Type'];
    } else if (!options.headers || !options.headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Sending Authorization header with token length:', token.length);  // Debug: Confirm header
    }
    console.log('Full headers:', headers);  // Debug: See all headers (optional, remove if noisy)

    try {
        const response = await fetch(`${BACKEND_URL}${url}`, {
            ...options,
            headers
        });
        console.log('apiFetch response status:', response.status, 'for URL:', url);  // Debug: Status
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('apiFetch error data:', errorData);  // Debug: Error details
            if (response.status === 404) {
                console.error('404 Error: Route not found. Check if /api prefix is missing.');
            }
            throw new Error(errorData.message || `HTTP ${response.status}: Request failed`);
        }
        const data = await response.json();
        console.log('apiFetch success data preview:', data.email || data);  // Debug: Response preview (optional)
        return data;
    } catch (err) {
        console.error('apiFetch full error:', err);  // Debug: Network/fetch errors
        throw err;
    }
};

// Helper to ensure /api prefix for protected routes (prevents 404s)
const getProtectedUrl = (path) => {
    if (path.startsWith('/api/')) return path;
    return `/api${path.startsWith('/') ? path : `/${path}`}`;
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

// Load user info (for protected pages) - Full updated version with /api fix, validation, logging
const loadUser  = async (redirectOnFail = true) => {
    const token = getToken();
    console.log('loadUser  called. Token:', token ? `eyJ... (length: ${token.length})` : 'MISSING');  // Debug
    if (!token) {
        console.log('No token found, redirecting to login');
        if (redirectOnFail) window.location.href = '/login.html';
        return null;
    }
    try {
        console.log('Attempting to fetch /api/users/profile...');
        const user = await apiFetch(getProtectedUrl('users/profile'));  // Fixed: /api prefix
        console.log('Raw user from API:', user);  // Debug: Full object

        // Validate: Ensure user has required fields (prevents null/empty issues)
        if (!user || !user.id || !user.email) {
            console.error('load:User  Invalid user data from API:', user);
            throw new Error('Invalid user profile received');
        }

        console.log('User  profile loaded successfully:', { id: user.id, email: user.email, role: user.role });  // Debug

        // Set navbar elements safely (only if elements exist)
        const usernameEl = document.getElementById('username');
        if (usernameEl) {
            usernameEl.textContent = user.username || user.email;
        }
        const profilePic = document.getElementById('profile-pic');
        if (profilePic) {
            const picSrc = user.profilePic && user.profilePic !== 'user.png' 
                ? `${BACKEND_URL}/uploads/${user.profilePic}`  // Full URL for Render uploads
                : (user.profilePic?.startsWith('http') ? user.profilePic : '/images/user.png');
            profilePic.src = picSrc;
            profilePic.alt = user.username || 'Profile';
            console.log('Profile pic set to:', picSrc);  // Debug
        }

        return user;  // Validated user
    } catch (err) {
        console.error('loadUser  failed - Error message:', err.message);
        if (err.message.includes('404')) {
            console.error('404 on /api/users/profile - Check backend routes (must start with /api)');
        }
        console.error('Full loadUser  error:', err);  // Debug: Stack trace
        if (getToken()) removeToken();  // Only remove if it existed
        console.log('Token removed due to profile fetch failure');
        if (redirectOnFail) {
            console.log('Redirecting to login due to failure');
            window.location.href = '/login.html';
        }
        return null;  // Always return null on failure
    }
};

// Expose helper globally for other JS files (e.g., home.js, admin.js) - Prevents redeclaration conflicts
window.getProtectedUrl = getProtectedUrl;