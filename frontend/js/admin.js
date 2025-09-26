if (typeof window.getProtectedUrl !== 'function') {
    window.getProtectedUrl = (path) => `/api${path.startsWith('/') ? path : `/${path}`}`;
}
document.addEventListener('DOMContentLoaded', async () => {
    const user = await loadUser  ();
    if (!user || user.role !== 'admin') {
        alert('Admin access required');
        window.location.href = 'home.html';
        return;
    }

    // Load users
    try {
        const users = await apiFetch('/admin/users');
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.email}</td>
                <td>${u.username || ''}</td>
                <td>${u.role}</td>
                <td>
                    <button onclick="updateUser (${u.id})">Edit Role</button>
                    <button onclick="deleteUser (${u.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Users load failed:', err);
    }

    // Load content
    try {
        const content = await apiFetch('/homepage/');
        document.getElementById('content-text').value = content.content_text || '';
        document.getElementById('content-image').value = content.content_image || '';
    } catch (err) {
        console.error('Content load failed:', err);
    }

    // Content form
    const form = document.getElementById('content-form');
    const message = document.getElementById('message');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contentText = document.getElementById('content-text').value;
        const contentImage = document.getElementById('content-image').value;
        try {
            const updated = await apiFetch('/homepage/', {
                method: 'PUT',
                body: JSON.stringify({ content_text: contentText, content_image: contentImage })
            });
            message.innerHTML = '<p class="success">Content updated!</p>';
        } catch (err) {
            message.innerHTML = '<p class="error">Update failed: ' + err.message + '</p>';
        }
    });
});

// Global functions for onclick
async function updateUser (id) {
    const role = prompt('New role (user or admin):');
    if (!role || (role !== 'user' && role !== 'admin')) {
        alert('Invalid role');
        return;
    }
    try {
        await apiFetch(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
        location.reload();
    } catch (err) {
        alert('Update failed: ' + err.message);
    }
}

async function deleteUser (id) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
        await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
        location.reload();
    } catch (err) {
        alert('Deletion failed: ' + err.message);
    }
}