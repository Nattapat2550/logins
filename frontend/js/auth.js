// API Base URL - UPDATE FOR PRODUCTION (e.g., 'https://backendlogins.onrender.com/api')
const API_BASE = 'http://localhost:5000/api';  // Local dev; change to your Render backend

// Helper to make authenticated requests
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        ...options
    };
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    return data;
}

// Registration
async function register(email) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        return response.ok ? { success: true, message: data.message } : { success: false, error: data.error };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Verification
async function verify(email, code) {
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await response.json();
        return response.ok ? { success: true, message: data.message } : { success: false, error: data.error };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Complete profile
async function completeProfile(email, username, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        const data = await response.json();
        return response.ok ? { success: true, token: data.token, user: data.user } : { success: false, error: data.error };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Login
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        return response.ok ? { success: true, token: data.token, user: data.user } : { success: false, error: data.error };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Forgot password
async function forgotPassword(email) {
    try {
        const response = await fetch(`${API_BASE}/auth/forgot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        return response.ok ? { success: true, message: data.message } : { success: false, error: data.error };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Reset password
async function resetPassword(token, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });
        const data = await response.json();
        return response.ok ? { success: true, message: data.message } : { success: false, error: data.error };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Get home content
async function fetchHomeContent() {
    try {
        const data = await apiRequest('/user/home-content');
        return data.content;
    } catch (err) {
        throw err;
    }
}

// Update home content (admin)
async function updateHomeContent(content) {
    try {
        const data = await apiRequest('/admin/home-content', {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
        return { success: true, message: data.message };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Get profile
async function getProfile() {
    try {
        const data = await apiRequest('/user/profile');
        return data;
    } catch (err) {
        throw err;
    }
}

// Update profile (with optional file)
async function updateProfile(formData) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/user/update`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`
                // No Content-Type for FormData - let browser set multipart
            },
            body: formData
        });
        const data = await response.json();
        return response.ok ? { success: true, user: data.user, token: data.token } : { success: false, error: data.error };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Delete account
async function deleteAccount() {
    try {
        const data = await apiRequest('/user/delete', { method: 'DELETE' });
        return { success: true, message: data.message };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Admin: Get users
async function getAdminUsers() {
    try {
        const data = await apiRequest('/admin/users');
        return data;
    } catch (err) {
        throw err;
    }
}

// Admin: Update user
async function updateUser (id, updates) {
    try {
        const data = await apiRequest(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return { success: true, message: data.message };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Admin: Delete user
async function deleteAdminUser (id) {
    try {
        const data = await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
        return { success: true, message: data.message };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Expose functions globally for use in HTML <script> tags and onclick handlers
window.register = register;
window.verify = verify;
window.completeProfile = completeProfile;
window.login = login;
window.forgotPassword = forgotPassword;
window.resetPassword = resetPassword;
window.fetchHomeContent = fetchHomeContent;
window.updateHomeContent = updateHomeContent;
window.updateProfile = updateProfile;
window.deleteAccount = deleteAccount;
window.getAdminUsers = getAdminUsers;
window.updateUser  = updateUser ;
window.deleteAdminUser  = deleteAdminUser ;