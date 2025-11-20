const form = document.getElementById('codeForm');
const msg = document.getElementById('msg');
const email = sessionStorage.getItem('pendingEmail');
if (!email) location.replace('register.html');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  const code = document.getElementById('code').value.trim();
  try {
    await api('/api/auth/verify-code', { method: 'POST', body: { email, code } });
    location.href = `form.html?email=${encodeURIComponent(email)}`;
  } catch (err) { msg.textContent = err.message; }
});
