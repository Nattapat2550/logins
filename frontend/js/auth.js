// API Base URL - UPDATE FOR PRODUCTION (e.g., 'https://your-backend.onrender.com/api')
const API_BASE = 'https://backendlogins.onrender.com/api';  // Local; change for Render

// Helper for authenticated requests
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        },
        ...options
    };
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        throw new Error(err.message || 'Network error');
    }
}

// Registration (email)
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

// Complete profile (email flow)
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

// Login (email)
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

// Fetch home content
async function fetchHomeContent() {
    return await apiRequest('/user/home-content').then(data => data.content);
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

// Update profile (FormData for file)
async function updateProfile(formData) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/user/update`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },  // No Content-Type for FormData
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
    return await apiRequest('/admin/users');
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

// Expose all functions globally for HTML <script> and onclick
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