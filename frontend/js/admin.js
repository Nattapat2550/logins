// Load Admin: Fetch home info and users
async function loadAdmin() {
    try {
        // Load home info
        const homeInfo = await apiGet('/api/admin/home');
        document.getElementById('title').value = homeInfo.title || '';
        document.getElementById('content').value = homeInfo.content || '';
        document.getElementById('homePreview').innerHTML = `
            <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 4px;">
                <h3>${homeInfo.title || 'Preview'}</h3>
                <p>${homeInfo.content || 'Preview content'}</p>
            </div>
        `;

        // Load users
        const users = await apiGet('/api/admin/users');
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div>
                    <strong>${user.username}</strong> (${user.email})
                    <br><small>Role: ${user.role} | Verified: ${user.verified ? 'Yes' : 'No'} | Joined: ${new Date(user.created_at).toLocaleDateString()}</small>
                    ${user.avatar ? `<img src="${window.location.origin}${user.avatar}" alt="Avatar" style="width: 30px; height: 30px; border-radius: 50%; margin-left: 10px;">` : ''}
                </div>
                <div class="user-actions">
                    <select id="role-${user.id}" style="padding: 5px;">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User </option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    <button onclick="updateUser Role(${user.id})">Update Role</button>
                    <button onclick="deleteUser (${user.id})" style="background: #dc3545;">Delete</button>
                </div>
            </div>
        `).join('');
        showMessage('Admin panel loaded', 'success');
    } catch (err) {
        showMessage('Error loading admin: ' + err.message, 'error');
    }
}

// Update Home Info: PUT to backend
async function updateHomeInfo(title, content) {
    try {
        showMessage('Updating home info...', 'success');
        await apiPut('/api/admin/home', { title, content });
        showMessage('Home info updated!', 'success');
        // Reload preview
        setTimeout(() => {
            const homeInfo = { title, content };
            document.getElementById('homePreview').innerHTML = `
                <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 4px;">
                    <h3>${homeInfo.title}</h3>
                    <p>${homeInfo.content}</p>
                </div>
            `;
        }, 500);
    } catch (err) {
        showMessage('Update failed: ' + err.message, 'error');
    }
}

// Update User Role: PUT to backend
async function updateUserRole(userId) {
    const role = document.getElementById(`role-${userId}`).value;
    try {
        showMessage('Updating role...', 'success');
        await apiPut(`/api/admin/users/${userId}/role`, { role });
        showMessage('Role updated!', 'success');
        setTimeout(loadAdmin, 1000);  // Reload list
    } catch (err) {
        showMessage('Role update failed: ' + err.message, 'error');
    }
}

// Delete User: DELETE to backend
async function deleteUser (userId) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
        showMessage('Deleting user...', 'success');
        await apiDelete(`/api/admin/users/${userId}`);
        showMessage('User  deleted!', 'success');
        setTimeout(loadAdmin, 1000);  // Reload list
    } catch (err) {
        showMessage('Delete failed: ' + err.message, 'error');
    }
}

// Export globals (for inline onclick in HTML)
window.loadAdmin = loadAdmin;
window.updateHomeInfo = updateHomeInfo;
window.updateUserRole = updateUserRole;
window.deleteUser  = deleteUser ;