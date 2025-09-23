const BACKEND_URL = 'https://backendlogins.onrender.com';  // Update to your Render backend URL

function getToken() {
    return localStorage.getItem('token');
}

function saveToken(token) {
    localStorage.setItem('token', token);
}

function clearToken() {
    localStorage.removeItem('token');
}

async function apiCall(endpoint, options = {}) {
    const token = getToken();
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

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            clearToken();
            window.location.href = 'login.html';
        }
        throw new Error(data.error || 'API error');
    }

    return data;
}

// Auth functions
async function register(email) {
    return apiCall('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase() })
    });
}

async function verify(email, code) {
    return apiCall('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code })
    });
}

async function complete(email, username, password, google = false) {
    return apiCall('/api/auth/complete', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase(), username, password, google })
    });
}

async function login(email, password) {
    return apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase(), password })
    });
}

async function forgot(email) {
    return apiCall('/api/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase() })
    });
}

async function reset(token, password) {
    return apiCall('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password })
    });
}

// User functions
async function getProfile() {
    return apiCall('/api/user/profile');
}

async function updateProfile(username, theme, file = null) {
    const formData = new FormData();
    if (username) formData.append('username', username);
    if (theme) formData.append('theme', theme);
    if (file) formData.append('profilePic', file);

    return apiCall('/api/user/profile', {
        method: 'POST',
        body: formData
    });
}

async function deleteAccount() {
    return apiCall('/api/user/profile', { method: 'DELETE' });
}

async function getHomeContent() {
    return apiCall('/api/user/home');
}

// Admin functions
async function adminGetUsers() {
    return apiCall('/api/admin/users');
}

async function adminEditUser (id, email, username, role, verified) {
    return apiCall(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ email, username, role, verified })
    });
}

async function adminDeleteUser (id) {
    return apiCall(`/api/admin/users/${id}`, { method: 'DELETE' });
}

async function adminUpdateHome(title, content) {
    return apiCall('/api/admin/home', {
        method: 'PUT',
        body: JSON.stringify({ title, content })
    });
}