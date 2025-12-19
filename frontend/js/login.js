const msg = document.getElementById('msg');
document.getElementById('googleBtn').onclick = () => { location.href = `${API_BASE_URL}/api/auth/google`; };
document.getElementById('showPw').addEventListener('change', (e)=>{
  document.getElementById('password').type = e.target.checked ? 'text' : 'password';
});
document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent='';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember').checked;

  try {
    const r = await api('/api/auth/login', { method:'POST', body:{ email, password, remember }});

    // ✅ เก็บ token ไว้เป็น fallback สำหรับมือถือที่บล็อก cookie
    if (r.token) localStorage.setItem('token', r.token);

    location.href = (r.role || 'user').toLowerCase() === 'admin' ? 'admin.html' : 'home.html';
  } catch (err) {
    msg.textContent = err.message;
  }
});
