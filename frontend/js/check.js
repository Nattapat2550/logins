// Check page: Verify code form

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  if (!userId) {
    alert('No user ID found');
    window.location.href = 'register.html';
    return;
  }

  const form = document.getElementById('verify-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('code').value;
    if (!code || code.length !== 6) return alert('Enter 6-digit code');

    try {
      await apiFetch('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ userId, code })
      });
      alert('Verified!');
      window.location.href = `form.html?userId=${userId}`;
    } catch (err) {
      alert(err.message);
    }
  });
});