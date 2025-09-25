const API_BASE = 'https://backendlogins.onrender.com/api'; // Update to your Render backend URL

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const tempEmail = localStorage.getItem('tempEmail') || prompt('Enter your email for verification:');

  document.getElementById('email').value = tempEmail;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const code = document.getElementById('code').value;

    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('tempEmail');
        redirectByRole(data.user.role);
      } else {
        document.getElementById('error').textContent = data.error;
      }
    } catch (err) {
      document.getElementById('error').textContent = 'Verification failed';
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