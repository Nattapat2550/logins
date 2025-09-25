// Update Profile
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('username', document.getElementById('newUsername').value);
  const file = document.getElementById('avatarFile').files[0];
  if (file) formData.append('avatar', file);
  const res = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    body: formData
  });
  if (res.ok) {
    alert('Profile updated');
    location.reload();
  } else {
    alert((await res.json()).error);
  }
});

// Delete Account
document.getElementById('deleteBtn')?.addEventListener('click', async () => {
  if (confirm('Delete account?')) {
    await fetch('/api/user/profile', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  }
});

// Load Current Profile
window.addEventListener('load', async () => {
  const res = await fetch('/api/user/profile', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  const user = await res.json();
  document.getElementById('currentUsername').textContent = user.username;
  if (user.avatar) {
    document.querySelector('.profile-pic').src = user.avatar.startsWith('http') ? user.avatar : `/uploads/${user.avatar}`;
  }
});