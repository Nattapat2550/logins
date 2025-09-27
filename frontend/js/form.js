// Form page: Complete profile (username/password)

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  const fromGoogle = urlParams.get('from') === 'google';
  if (!userId) {
    alert('No user ID found');
    window.location.href = 'register.html';
    return;
  }

  // If from Google, prefill username if possible (but design says complete if missing)
  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (!username || !password) return alert('Fields required');

    try {
      await apiFetch('/api/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify({ userId, username, password })
      });
      alert('Profile completed!');
      window.location.href = 'home.html';
    } catch (err) {
      alert(err.message);
    }
  });

  if (fromGoogle) {
    document.getElementById('google-note').style.display = 'block'; // Optional note
  }
});