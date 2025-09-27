// Reset page: Toggle between forgot form and reset form (via token param)

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const forgotSection = document.getElementById('forgot-section');
  const resetSection = document.getElementById('reset-section');

  if (token) {
    forgotSection.style.display = 'none';
    resetSection.style.display = 'block';
    document.getElementById('reset-token').value = token;
  } else {
    forgotSection.style.display = 'block';
    resetSection.style.display = 'none';
  }

  // Forgot password form
  const forgotForm = document.getElementById('forgot-form');
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    if (!email) return alert('Email required');

    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      alert('Reset email sent!');
    } catch (err) {
      alert(err.message);
    }
  });

  // Reset password form
  const resetForm = document.getElementById('reset-form');
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    if (!newPassword) return alert('Password required');

    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });
      alert('Password reset!');
      window.location.href = 'home.html';
    } catch (err) {
      alert(err.message);
    }
  });
});