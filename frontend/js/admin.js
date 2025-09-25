// Load All Users
window.addEventListener('load', async () => {
  const res = await fetch('/api/admin/users', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  const users = await res.json();
  const tbody = document.querySelector('#usersTable tbody');
  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.email}</td>
      <td>${user.username}</td>
      <td><img src="${user.avatar.startsWith('http') ? user.avatar : `/uploads/${user.avatar}` || 'images/user.png'}" width="30" height="30" alt="Avatar"></td>
      <td>${user.role}</td>
      <td>${user.created_at}</td>
      <td>
        <button onclick="editUser(${user.id})">Edit</button>
        <button onclick="deleteUser(${user.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Load Home Info
  const homeRes = await fetch('/api/admin/home', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  const homeInfo = await homeRes.json();
  document.getElementById('homeTitle').value = homeInfo.title;
  document.getElementById('homeContent').value = homeInfo.content;
});

// Edit User (Simple prompt-based; enhance with modal)
window.editUser = async (id) => {
  const email = prompt('New email:');
  const username = prompt('New username:');
  const role = prompt('New role (user/admin):');
  if (email && username && role) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, username, role })
    });
    if (res.ok) {
      alert('User updated');
      location.reload();
    } else {
      alert((await res.json()).error);
    }
  }
};

// Delete User
window.deleteUser = async (id) => {
  if (confirm('Delete user?')) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      alert('User deleted');
      location.reload();
    } else {
      alert((await res.json()).error);
    }
  }
};

// Update Home Info
document.getElementById('homeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('homeTitle').value;
  const content = document.getElementById('homeContent').value;
  const res = await fetch('/api/admin/home', {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, content })
  });
  if (res.ok) {
    alert('Home info updated');
  } else {
    alert((await res.json()).error);
  }
});