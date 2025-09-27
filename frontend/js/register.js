// frontend/js/register.js
// Register page: Email form + Google button

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const googleBtn = document.getElementById('google-register');

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      window.location.href = `${API_BASE}/api/auth/google?from=register`;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) return alert('Email required');

    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      alert('Verification code sent! Check your email.');
      window.location.href = `check.html?userId=${data.userId}`;
    } catch (err) {
      console.error('Register error:', err);
      if (err.message.includes('Email exists')) {
        alert(`Email "${email}" is already registered. Try logging in or use a different email.`);
        // Optional: Redirect to login
        // window.location.href = 'login.html';
      } else {
        alert(`Registration failed: ${err.message}`);
      }
    }
  });
});