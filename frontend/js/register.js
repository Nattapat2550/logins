const form = document.getElementById('registerForm');
const msg = document.getElementById('msg');
document.getElementById('googleBtn').onclick = () => {
  location.href = `${API_BASE_URL}/api/auth/google`;
};
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  const email = document.getElementById('email').value.trim();
  try {
    await api('/api/auth/register', { method: 'POST', body: { email } });
    sessionStorage.setItem('pendingEmail', email);
    location.href = 'check.html';
  } catch (err) { msg.textContent = err.message; }
});
