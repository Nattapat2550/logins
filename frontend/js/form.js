// Pre-fill if from Google
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isGoogle = urlParams.get('google') === 'true';
  const token = urlParams.get('token');
  if (isGoogle && token) {
    localStorage.setItem('tempToken', token);
    // Assume username and pic passed via redirect (in real, fetch from backend or pass in query)
    // For simplicity, user enters them, but Google skips verification
    document.getElementById('username').value = urlParams.get('username') || ''; // If passed
  }
});

async function completeRegistration() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const profilePicFile = document.getElementById('profilePic').files[0];
  const email = localStorage.getItem('pendingEmail');
  const isGoogle = localStorage.getItem('tempToken'); // Or check query

  if (!username || (!isGoogle && !password)) return showError('Fill required fields');

  try {
    let formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    if (!isGoogle) formData.append('password', password);
    if (profilePicFile) formData.append('profilePic', profilePicFile);
    if (isGoogle) formData.append('google', 'true');
    const token = isGoogle ? localStorage.getItem('tempToken') : null;
    if (token) formData.append('token', token);

    const res = await fetch(`${API_BASE}/auth/register/complete`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.removeItem('pendingEmail');
      localStorage.removeItem('tempToken');
      showSuccess('Profile saved! Redirecting to home...');
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1000);
    } else {
      showError('Registration failed');
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