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
    const email = document.getElementById('email').value;
    if (!email) return alert('Email required');

    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      alert('Verification code sent!');
      window.location.href = `check.html?userId=${data.userId}`;
    } catch (err) {
      alert(err.message);
    }
  });
});