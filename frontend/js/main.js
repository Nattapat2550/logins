// API Helper: Fetch with token
async function apiGet(endpoint, options = {}) {
    return apiFetch(endpoint, { method: 'GET', ...options });
}

async function apiPost(endpoint, body, options = {}) {
    return apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, ...options });
}

async function apiPut(endpoint, body, options = {}) {
    return apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, ...options });
}

async function apiDelete(endpoint, options = {}) {
    return apiFetch(endpoint, { method: 'DELETE', ...options });
}

async function apiFetch(endpoint, options) {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(`${window.location.origin}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// Auth Check: Verify token by fetching profile
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        await apiGet('/api/user/profile');
        return true;
    } catch (err) {
        localStorage.removeItem('token');
        return false;
    }
}

// Show Message: Display in #message or specified element
function showMessage(text, type = 'success', elementId = 'message') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.className = type;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
}

// Logout: Clear token and redirect
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('tempEmail');
    window.location.href = 'register.html';
}

// Export for global use (e.g., in HTML onclick)
window.logout = logout;
window.showMessage = showMessage;
window.checkAuth = checkAuth;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;