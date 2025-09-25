const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const authFetch = async (url, options = {}) => {
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            alert('Access denied or session expired.');
            window.location.href = 'login.html';
            return null;
        }
        return res;
    };

    // Check if admin
    const checkAdmin = async () => {
        try {
            const res = await authFetch(`${API_BASE}/users/profile`);
            if (res.ok) {
                const user = await res.json();
                if (user.role !== 'admin') {
                    alert('Admin access required.');
                    window.location.href = 'home.html';
                    return false;
                }
                return true;
            }
        } catch (err) {
            console.error(err);
        }
        return false;
    };

    // Load all users
    const loadUsers = async () => {
        try {
            const res = await authFetch(`${API_BASE}/admin/users`);
            if (res.ok) {
                const users = await res.json();
                const userList = document.getElementById('userList');
                if (userList) {
                    userList.innerHTML = users.map(user => `
                        <div class="user-item card">
                            <span>${user.username} (${user.email}) - ${user.role} - ${user.verified ? 'Verified' : 'Pending'}</span>
                            <div>
                                <button onclick="editUser (${user.id})">Edit</button>
                                <button onclick="deleteUser (${user.id})" style="background: #ea4335;">Delete</button>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (err) {
            console.error('Load users error:', err);
        }
    };

    // Update home content form
    const homeForm = document.getElementById('homeContentForm');
    if (homeForm) {
        homeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('homeTitleInput').value.trim();
            const content = document.getElementById('homeContentInput').value.trim();
            const errorDiv = document.getElementById('adminError');

            if (!title || !content) {
                errorDiv.textContent = 'Title and content required.';
                errorDiv.className = 'error';
                return;
            }

            try {
                const res = await authFetch(`${API_BASE}/admin/home-content`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Home content updated!');
                    errorDiv.textContent = 'Updated successfully.';
                    errorDiv.className = 'success';
                    // Refresh home if needed
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

    // Placeholder functions for edit/delete (extend with modals/forms)
    window.editUser  = (id) => {
        alert(`Edit user ${id} (Implement modal/form for update via /api/admin/users/${id})`);
        // TODO: Fetch user, show form, PUT to /api/admin/users/${id}
    };

    window.deleteUser  = async (id) => {
        if (!confirm(`Delete user ${id}?`)) return;
        try {
            const res = await authFetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('User  deleted.');
                loadUsers(); // Refresh list
            } else {
                alert('Delete failed.');
            }
        } catch (err) {
            console.error(err);
            alert('Network error.');
        }
    };

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    };

    // Init
    checkAdmin().then(isAdmin => { if (isAdmin) loadUsers(); });
});