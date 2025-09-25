const API_BASE = 'https://backendlogins.onrender.com/api'; // Update to your Render backend URL

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const googleBtn = document.getElementById('google-register');

  // Google Login (redirects to backend)
  googleBtn.addEventListener('click', () => {
    window.location.href = `${API_BASE}/auth/google`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('tempEmail', email); // For verify page
        window.location.href = '/check';
      } else {
        document.getElementById('error').textContent = data.error;
      }
    } catch (err) {
      document.getElementById('error').textContent = 'Registration failed';
    }
  });
});