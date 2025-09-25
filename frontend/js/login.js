function togglePassword() {
  const pw = document.getElementById('password');
  pw.type = document.getElementById('showPassword').checked ? 'text' : 'password';
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if (!email || !password) return showError('Fill all fields');

  try {
    const res = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('token', res.token);
    // Redirect based on role
    window.location.href = res.role === 'admin' ? 'admin.html' : 'home.html';
  } catch (err) {
    showError(err.message || 'Login failed');
  }
}

function googleLogin() {
  window.location.href = `${API_BASE}/auth/google`;
}

function showError(msg) {
  document.getElementById('error').textContent = msg;
}