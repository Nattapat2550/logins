const API_BASE = 'https://backendlogins.onrender.com/api'; // Update to your Render backend URL

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const googleBtn = document.getElementById('google-login');
  const forgotBtn = document.getElementById('forgot-password');
  const toggleBtn = document.getElementById('password-toggle');
  const passwordInput = document.getElementById('password');

  // Password toggle
  toggleBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    toggleBtn.textContent = type === 'password' ? 'Show' : 'Hide';
  });

  // Google Login
  googleBtn.addEventListener('click', () => {
    window.location.href = `${API_BASE}/auth/google`;
  });

  // Forgot password
  forgotBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      document.getElementById('success').textContent = data.message;
    } catch (err) {
      document.getElementById('error').textContent = 'Failed to send reset';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        redirectByRole(data.user.role);
      } else {
        document.getElementById('error').textContent = data.error;
      }
    } catch (err) {
      document.getElementById('error').textContent = 'Login failed';
    }
  });

  function redirectByRole(role) {
    if (role === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/home';
    }
  }
});