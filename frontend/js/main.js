// Backend URL (update for local/prod if needed)
const BACKEND_URL = 'https://backendlogins.onrender.com';  // Or use process.env in a build tool

// Token management (localStorage)
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    if (token) {
        localStorage.setItem('token', token);
        console.log('main.js: Token stored (length:', token.length, ')');
    } else {
        localStorage.removeItem('token');
        console.log('main.js: Token removed');
    }
}

// Optional: Get cached user (from localStorage)
function getUser () {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.stringify(userStr) : null;
}

function setUser (user) {
    if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        console.log('main.js: User cached:', user.email || user.username);
    } else {
        localStorage.removeItem('user');
    }
}

// Google OAuth redirect (called from button clicks in login/register)
function googleOAuthRedirect() {
    console.log('main.js: Initiating Google OAuth redirect');
    window.location.href = `${BACKEND_URL}/api/auth/google`;
}

// Optional: apiFetch wrapper (uses token in headers; fallback to direct fetch if not needed)
async function apiFetch(url, options = {}) {
    const token = getToken();
    console.log('main.js: apiFetch called:', url, 'Token present?', !!token);
    
    const fullUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url.startsWith('/') ? url : `/${url}`}`;
    
    const fetchOptions = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    };

    try {
        const response = await fetch(fullUrl, fetchOptions);
        console.log('main.js: apiFetch response status:', response.status, 'for URL:', url);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (err) {
        console.error('main.js: apiFetch error:', err);
        throw err;
    }
}

// Logout function (clear token/user, redirect to index/login)
function logout() {
    setToken(null);
    setUser (null);
    localStorage.removeItem('tempEmail');  // Clean up from register flow
    console.log('main.js: Logged out, redirecting to index.html');
    window.location.href = '/index.html';  // Or '/login.html'
}

// On page load: Handle URL params from Google callback (store token, clean URL)
document.addEventListener('DOMContentLoaded', () => {
    console.log('main.js: DOM loaded');
    
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const emailFromUrl = urlParams.get('email');
    const usernameFromUrl = urlParams.get('username');
    
    if (tokenFromUrl) {
        console.log('main.js: Detected token in URL params, storing it');
        setToken(tokenFromUrl);
        
        // Cache user info if provided
        if (emailFromUrl || usernameFromUrl) {
            setUser ({
                email: emailFromUrl || '',
                username: usernameFromUrl || '',
                // Add more if needed (e.g., role)
            });
        }
        
        // Clean URL (remove query params to avoid re-processing)
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        console.log('main.js: URL cleaned after storing token');
    }
    
    // Optional: Check token on load and redirect if invalid/expired (e.g., on protected pages)
    const token = getToken();
    if (window.location.pathname.includes('home') && !token) {
        console.log('main.js: No token on protected page, redirecting to login');
        window.location.href = '/login.html';
    }
    
    // Optional: Add global logout listener (e.g., for navbar button)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Make functions global for other JS files (login.js, etc.)
    window.googleOAuthRedirect = googleOAuthRedirect;
    window.getToken = getToken;
    window.setToken = setToken;
    window.getUser  = getUser ;
    window.setUser  = setUser ;
    window.logout = logout;
    window.apiFetch = apiFetch;  // If you want to use the wrapper
});

// Optional: Check token expiration (call on protected pages if needed)
function isTokenValid(token) {
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now();  // Check expiry
    } catch {
        return false;
    }
}