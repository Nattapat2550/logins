// Login page: Email/password + Google

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const googleBtn = document.getElementById('google-login');

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      window.location.href = `${API_BASE}/api/auth/google?from=login`;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) return alert('Fields required');

    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      window.location.href = 'home.html';
    } catch (err) {
      alert(err.message);
    }
  });
});