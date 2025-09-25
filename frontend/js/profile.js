const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode(); // From darkModeToggle.js

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in.');
        window.location.href = 'login.html';
        return;
    }

    // Helper: Make authenticated fetch
    const authFetch = async (url, options = {}) => {
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            alert('Session expired. Please log in again.');
            window.location.href = 'login.html';
            return null;
        }
        return res;
    };

    // Load user profile (used in home and settings)
    const loadProfile = async () => {
        try {
            const res = await authFetch(`${API_BASE}/users/profile`);
            if (res.ok) {
                const user = await res.json();
                document.getElementById('username') ? document.getElementById('username').value = user.username : null;
                document.getElementById('profilePic') ? document.getElementById('profilePic').src = user.profile_pic ? `/uploads/${user.profile_pic}` : '../assets/user.png' : null;
                document.getElementById('userEmail') ? document.getElementById('userEmail').textContent = user.email : null;
                document.getElementById('userRole') ? document.getElementById('userRole').textContent = `Role: ${user.role}` : null;

                // Show/hide admin link based on role
                const adminLink = document.getElementById('adminLink');
                if (adminLink && user.role !== 'admin') {
                    adminLink.style.display = 'none';
                }
                return user;
            }
        } catch (err) {
            console.error('Profile load error:', err);
        }
    };

    // Load home content (for home.html)
    const loadHomeContent = async () => {
        try {
            const res = await authFetch(`${API_BASE}/users/home`);
            if (res.ok) {
                const content = await res.json();
                const titleEl = document.getElementById('homeTitle');
                const contentEl = document.getElementById('homeContent');
                if (titleEl) titleEl.textContent = content.title;
                if (contentEl) contentEl.textContent = content.content;
            }
        } catch (err) {
            console.error('Home content error:', err);
        }
    };

    // Update profile (for settings.html)
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const fileInput = document.getElementById('profilePicInput');
            const errorDiv = document.getElementById('profileError');

            if (!username) {
                errorDiv.textContent = 'Username required.';
                errorDiv.className = 'error';
                return;
            }

            const formData = new FormData();
            formData.append('username', username);
            if (fileInput.files[0]) formData.append('profilePic', fileInput.files[0]);

            try {
                const res = await authFetch(`${API_BASE}/users/profile`, {
                    method: 'PUT',
                    body: formData
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Profile updated!');
                    loadProfile(); // Refresh
                    errorDiv.textContent = 'Updated successfully.';
                    errorDiv.className = 'success';
                } else {
                    errorDiv.textContent = data.error || 'Update failed.';
                    errorDiv.className = 'error';
                }
            } catch (err) {
                errorDiv.textContent = 'Network error.';
                errorDiv.className = 'error';
                console.error(err);
            }
        });
    }

    // Delete account (for settings.html)
    const deleteBtn = document.getElementById('deleteAccount');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Delete account? This is permanent.')) return;
            try {
                const res = await authFetch(`${API_BASE}/users/account`, { method: 'DELETE' });
                if (res.ok) {
                    localStorage.removeItem('token');
                    alert('Account deleted.');
                    window.location.href = 'index.html';
                } else {
                    alert('Delete failed.');
                }
            } catch (err) {
                console.error(err);
                alert('Network error.');
            }
        });
    }

    // Logout (common)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }

    // Init: Load profile and home content
    loadProfile();
    if (document.getElementById('homeTitle')) loadHomeContent();
});