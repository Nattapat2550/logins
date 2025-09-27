// Settings page: Update profile, delete account

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const user = await apiFetch('/api/users/me');
    document.getElementById('username').value = user.username;
    if (user.profile_pic && user.profile_pic !== '/images/user.png') {
      document.getElementById('profile-pic-preview').src = user.profile_pic;
    }
  } catch (err) {
    console.error(err);
  }

  const form = document.getElementById('settings-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = {
      username: document.getElementById('username').value,
      // profile_pic: Handle file upload if added (e.g., FormData)
    };
    try {
      await apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      alert('Profile updated!');
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  });

  // Delete account button
  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (!confirm('Delete account? This is permanent.')) return;
    try {
      await apiFetch('/api/users/me', { method: 'DELETE' });
      alert('Account deleted');
      window.location.href = 'index.html';
    } catch (err) {
      alert(err.message);
    }
  });
});