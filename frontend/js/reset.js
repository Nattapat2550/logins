const msg = document.getElementById('msg');
const token = new URLSearchParams(location.search).get('token');
const requestBox = document.getElementById('requestBox');
const resetBox = document.getElementById('resetBox');
if (token) { requestBox.style.display='none'; resetBox.style.display='block'; }

document.getElementById('requestForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent='';
  const email = document.getElementById('email').value.trim();
  try {
    await api('/api/auth/forgot-password', { method:'POST', body:{ email }});
    msg.textContent = 'If that email exists, a reset link was sent.';
  } catch (err) { msg.textContent = err.message; }
});

document.getElementById('resetForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent='';
  const newPassword = document.getElementById('newPassword').value;
  try {
    await api('/api/auth/reset-password', { method:'POST', body:{ token, newPassword }});
    msg.textContent = 'Password set. You can login now.';
  } catch (err) { msg.textContent = err.message; }
});
