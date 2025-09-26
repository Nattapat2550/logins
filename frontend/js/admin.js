async function loadAdminUsers() {
  const role = await mainUtils.getUserRole();
  if (!role || role !== 'admin') {
    mainUtils.showAlert('Admin access required', 'error');
    window.location.href = 'home.html';
    return;
  }

  const userList = document.getElementById('userList');
  if (!userList) return;

  try {
    const users = await mainUtils.apiCall('/api/admin/users');

    userList.innerHTML = users.map(user => `
      <div class="user-card">
        <img src="${user.profilePic || 'images/user.png'}" alt="Profile" onerror="this.src='images/user.png'">
        <div>
          <h3>${user.username || 'No Username'}</h3>
          <p>Email: ${user.email}</p>
          <p>Role: ${user.role}</p>
          <p>Verified: ${user.emailVerified ? 'Yes' : 'No'}</p>
          <p>Joined: ${new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
        <button class="danger" onclick="deleteUser (${user.id})" 
                ${user.id === parseInt(mainUtils.getStorage('userId')) ? 'disabled' : ''}>
          ${user.id === parseInt(mainUtils.getStorage('userId')) ? 'Self' : 'Delete'}
        </button>
      </div>
    `).join('');

    // Global delete function (attached to onclick)
    window.deleteUser  = async (userId) => {
      if (userId === parseInt(mainUtils.getStorage('userId'))) {
        mainUtils.showAlert('Cannot delete yourself', 'error');
        return;
      }

      if (!confirm(`Delete user ID ${userId}? This cannot be undone.`)) return;

      try {
        await mainUtils.apiCall(`/api/admin/users/${userId}`, { method: 'DELETE' });
        mainUtils.showAlert('User  deleted successfully', 'success');
        loadAdminUsers();  // Refresh list
      } catch (error) {
        // Error shown by apiCall (e.g., 403 → "Admin access required", 404 → "User  not found")
      }
    };
  } catch (error) {
    // Error shown by apiCall (e.g., 500 → "Failed to fetch users")
    userList.innerHTML = '<p>Failed to load users. Try refreshing.</p>';
  }
}