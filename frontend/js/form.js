const msg = document.getElementById('msg');
const urlEmail = new URLSearchParams(location.search).get('email');
if (urlEmail) {
  const emailEl = document.getElementById('email');
  if (emailEl) {
    emailEl.value = urlEmail;
  }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  const email = document.getElementById('email').value.trim();
  const first_name = document.getElementById('first_name').value.trim();
  const last_name = document.getElementById('last_name').value.trim();
  const tel = document.getElementById('tel').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const r = await api('/api/auth/complete-profile', { 
      method: 'POST', 
      body: { email, first_name, last_name, tel, username, password }
    });
    if (r && r.token) localStorage.setItem('token', r.token);
    location.href = 'home.html';
  } catch (err) {
    msg.textContent = err.message || 'Error saving profile';
  }
});