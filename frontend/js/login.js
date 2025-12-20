const msg = document.getElementById('msg');

// ✅ รองรับ Google callback ที่ส่ง token มาใน URL fragment (#token=...)
(function handleOauthFragment() {
  try {
    if (!location.hash || location.hash.length < 2) return;
    const frag = new URLSearchParams(location.hash.slice(1));
    const token = frag.get('token');
    const role = (frag.get('role') || '').toLowerCase();
    if (token) {
      localStorage.setItem('token', token);
      history.replaceState(null, document.title, location.pathname + location.search);
      location.replace(role === 'admin' ? 'admin.html' : 'home.html');
    }
  } catch {}
})();

document.getElementById('googleBtn').onclick = () => {
  location.href = `${API_BASE_URL}/api/auth/google`;
};

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
    if (r && r.token) localStorage.setItem('token', r.token);
    location.href = (r.role || 'user') === 'admin' ? 'admin.html' : 'home.html';
  } catch (err) {
    msg.textContent = err.message;
  }
});
