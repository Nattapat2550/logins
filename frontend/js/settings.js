let currentUser ;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser  = await checkAuth();
  if (!currentUser ) return;

  document.getElementById('currentUsername').textContent = `Username: ${currentUser .username}`;
  document.getElementById('currentPic').src = currentUser .profilePic || 'images/user.png';
  document.getElementById('username').value = currentUser .username;
});

async function updateProfile() {
  const username = document.getElementById('username').value;
  const profilePicFile = document.getElementById('profilePic').files[0];

  if (!username) return showError('Enter username');

  try {
    let formData = new FormData();
    formData.append('username', username);
    if (profilePicFile) formData.append('profilePic', profilePicFile);

    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      body: formData
    });
    if (res.ok) {
      showSuccess('Profile updated!');
      // Refresh user data
      const refreshed = await fetch(`${API_BASE}/users/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json());
      currentUser  = refreshed;
      document.getElementById('currentUsername').textContent = `Username: ${currentUser .username}`;
      if (currentUser .profilePic) document.getElementById('currentPic').src = currentUser .profilePic;
      // Update navbar
      renderNavbar(currentUser );
    } else {
      const error = await res.json();
      showError(error.error || 'Update failed');
    }
  } catch (err) {
    showError(err.message);
  }
}

async function deleteAccount() {
  if (!confirm('Are you sure? This cannot be undone.')) return;

  try {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      showSuccess('Account deleted. Redirecting...');
      localStorage.removeItem('token');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      showError('Delete failed');
    }
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  document.getElementById('error').textContent = msg;
  document.getElementById('success').classList.add('hidden');
}

function showSuccess(msg) {
  document.getElementById('success').textContent = msg;
  document.getElementById('success').classList.remove('hidden');
  document.getElementById('error').textContent = '';
}