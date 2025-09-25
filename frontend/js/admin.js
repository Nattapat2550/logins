let allUsers = [];
let homepageContent = '';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user || user.role !== 'admin') {
    window.location.href = 'home.html';
    return;
  }

  // Load homepage content
  try {
    const res = await apiCall('/homepage');
    homepageContent = res.content;
    document.getElementById('homepageContent').value = homepageContent;
  } catch (err) {
    showHpError('Failed to load homepage content');
  }

  // Load users
  try {
    allUsers = await apiCall('/admin/users');
    renderUsersTable();
  } catch (err) {
    showUsersError('Failed to load users');
  }
});

function renderUsersTable() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  allUsers.forEach(u => {
    const row = document.createElement('tr');
    const pic = u.profilePic || 'images/user.png';
    row.innerHTML = `
      <td>${u.id}</td>
      <td>${u.email}</td>
      <td>${u.username}</td>
      <td><img src="${pic}" alt="Pic" style="width: 30px; height: 30px; border-radius: 50%;"></td>
      <td>${u.role}</td>
      <td>${new Date(u.created_at).toLocaleDateString()}</td>
      <td>
        <button onclick="editUser (${u.id})">Edit</button>
        <button onclick="deleteUser (${u.id})" style="background: red;">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function editUser (id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  const newUsername = prompt('New Username:', user.username);
  if (newUsername === null) return;

  const newRole = prompt('New Role (user/admin):', user.role);
  if (newRole === null) return;

  if (!newUsername || !newRole) return showUsersError('Fill both fields');

  try {
    await apiCall(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ username: newUsername, role: newRole })
    });
    showUsersSuccess('User  updated!');
    // Refresh users
    allUsers = await apiCall('/admin/users');
    renderUsersTable();
  } catch (err) {
    showUsersError(err.message);
  }
}

async function deleteUser (id) {
  if (!confirm('Delete this user?')) return;

  try {
    await apiCall(`/admin/users/${id}`, { method: 'DELETE' });
    showUsersSuccess('User  deleted!');
    // Refresh
    allUsers = await apiCall('/admin/users');
    renderUsersTable();
  } catch (err) {
    showUsersError(err.message);
  }
}

async function updateHomepage() {
  const content = document.getElementById('homepageContent').value;
  if (!content) return showHpError('Enter content');

  try {
    await apiCall('/homepage', {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
    homepageContent = content;
    showHpSuccess('Homepage updated!');
  } catch (err) {
    showHpError(err.message);
  }
}

function showHpError(msg) {
  document.getElementById('hpError').textContent = msg;
}

function showHpSuccess(msg) {
  document.getElementById('hpError').innerHTML = `<span style="color: green;">${msg}</span>`;
  setTimeout(() => { document.getElementById('hpError').textContent = ''; }, 3000);
}

function showUsersError(msg) {
  document.getElementById('usersError').textContent = msg;
}

function showUsersSuccess(msg) {
  document.getElementById('usersError').innerHTML = `<span style="color: green;">${msg}</span>`;
  setTimeout(() => { document.getElementById('usersError').textContent = ''; }, 3000);
}