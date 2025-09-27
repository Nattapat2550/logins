// Admin page: Manage users (list, role update, delete), edit homepage content

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch users
    const users = await apiFetch('/api/admin/users');
    const userList = document.getElementById('user-list');
    users.forEach(user => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${user.username || user.email}</strong> (${user.role}) - Verified: ${user.is_email_verified ? 'Yes' : 'No'}
        <select onchange="updateRole(${user.id}, this.value)">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>User </option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
        <button onclick="deleteUser (${user.id})">Delete</button>
      `;
      userList.appendChild(li);
    });

    // Fetch current homepage content for editing
    const content = await apiFetch('/api/homepage');
    content.forEach(item => {
      const sectionDiv = document.getElementById(`edit-${item.section}`);
      if (sectionDiv) {
        sectionDiv.innerHTML = `
          <h3>${item.section.toUpperCase()}</h3>
          <textarea id="${item.section}-content" rows="5">${item.content}</textarea>
          <button onclick="updateContent('${item.section}')">Save</button>
        `;
      }
    });
  } catch (err) {
    alert(err.message);
  }
});

// Update user role
const updateRole = async (userId, role) => {
  try {
    await apiFetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    alert('Role updated');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
};

// Delete user
const deleteUser  = async (userId) => {
  if (!confirm('Delete this user?')) return;
  try {
    await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    alert('User  deleted');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
};

// Update homepage content
const updateContent = async (section) => {
  const content = document.getElementById(`${section}-content`).value;
  if (!content) return alert('Content required');
  try {
    await apiFetch(`/api/homepage/${section}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
    alert('Content updated');
  } catch (err) {
    alert(err.message);
  }
};