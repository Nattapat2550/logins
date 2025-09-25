// Uses common.js
document.addEventListener('DOMContentLoaded', () => {
  const user = window.common.checkAuth();
  if (!user || user.role !== 'admin') {
    window.location.href = '/home';
    return;
  }

  window.common.renderNavbar(user);
  window.common.applyDarkMode();

  // Load users
  const loadUsers = async () => {
    try {
      const users = await window.common.apiCall('/admin/users');
      const table = document.getElementById('admin-users');
      table.innerHTML = users.map(u => `
        <div class="user-row">
          <span>ID: ${u.id} | Email: ${u.email} | Username: ${u.username} | Role: ${u.role} | Verified: ${u.verified}</span>
          <button onclick="editUser (${u.id})">Edit</button>
          <button onclick="deleteUser (${u.id})">Delete</button>
        </div>
      `).join('');
    } catch (err) {
      document.getElementById('error').textContent = err.message;
    }
  };

  // Edit user form
  window.editUser  = async (id) => {
    const user = await window.common.apiCall(`/admin/users/${id}`); // GET not implemented, but assume fetch one
    // For simplicity, prompt or show modal; here, redirect or inline form
    const email = prompt('New email:', user.email);
    const username = prompt('New username:', user.username);
    const role = prompt('New role (user/admin):', user.role);
    if (email && username && role) {
      try {
        await window.common.apiCall('/admin/users/' + id, {
       method: 'PUT',
       body: JSON.stringify({ email: 'new@example.com', username: 'NewUser ', role: 'user' })
     });
        loadUsers();
        document.getElementById('success').textContent = 'User  updated';
      } catch (err) {
        document.getElementById('error').textContent = err.message;
      }
    }
  };

  // Delete user
  window.deleteUser  = async (id) => {
    if (confirm('Delete user?')) {
      try {
        await window.common.apiCall(`/admin/users/${id}`, { method: 'DELETE' });
        loadUsers();
        document.getElementById('success').textContent = 'User  deleted';
      } catch (err) {
        document.getElementById('error').textContent = err.message;
      }
    }
  };

  // Home content editor
  const contentForm = document.getElementById('content-form');
  if (contentForm) {
    contentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('title').value;
      const content = document.getElementById('content').value;
      try {
        await window.common.apiCall('/admin/home-content', {
       method: 'PUT',
       body: JSON.stringify({ title: 'New Title', content: 'New content...' })
     });
        document.getElementById('success').classList.remove('hidden');
        document.getElementById('success').textContent = 'Content updated';
      } catch (err) {
        document.getElementById('error').textContent = err.message;
      }
    });
  }

  // Load initial data
  loadUsers();
});