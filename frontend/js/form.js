const msg = document.getElementById('msg');
const urlEmail = new URLSearchParams(location.search).get('email');
if (urlEmail) document.getElementById('email').value = urlEmail;
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent='';
  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  try {
    await api('/api/auth/complete-profile', { method:'POST', body:{ email, username, password }});
    location.href = 'home.html';
  } catch (err) { msg.textContent = err.message; }
});
