// Backend URL (set in README for Render; local dev: http://localhost:5000)
const BACKEND_URL = 'https://backendlogins.onrender.com';  // Replace with your Render backend URL after deploy

// Helper to make authenticated fetch calls
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();
    data.success = response.ok;
    return data;
}

// Register: Send verification code
async function register(email) {
    return apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

// Verify code
async function verify(email, code) {
    return apiCall('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code })
    });
}

// Complete profile
async function completeProfile(email, username, password) {
    return apiCall('/api/auth/complete', {
        method: 'POST',
        body: JSON.stringify({ email, username, password })
    });
}

// Login
async function login(email, password) {
    return apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

// Forgot password
async function forgotPassword(email) {
    return apiCall('/api/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

// Reset password
async function resetPassword(token, password) {
    return apiCall('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password })
    });
}

// Get home content
async function getHomeContent() {
    return apiCall('/api/user/home');
}

// Update home content
async function updateHomeContent(content) {
    return apiCall('/api/user/home', {
        method: 'POST',
        body: JSON.stringify({ content })
    });
}

// Get settings
async function getSettings() {
    return apiCall('/api/user/settings');
}

// Update settings
async function updateSettings(username, profilePic) {
    const updates = {};
    if (username) updates.username = username;
    if (profilePic) updates.profilePic = profilePic;
    return apiCall('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

// Get admin dashboard
async function getAdminDashboard() {
    return apiCall('/api/admin/dashboard');
}

// Get all users (admin)
async function getAllUsers() {
    return apiCall('/api/admin/users');
}

// Export all functions for use in HTML scripts
window.api = { register, verify, completeProfile, login, forgotPassword, resetPassword, getHomeContent, updateHomeContent, getSettings, updateSettings, getAdminDashboard, getAllUsers };