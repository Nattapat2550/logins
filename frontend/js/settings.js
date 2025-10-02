const msg = document.getElementById('msg');

async function loadMe() {
  try {
    const me = await api('/api/users/me');
    document.getElementById('username').value = me.username || '';
  } catch { location.replace('index.html'); }
}
loadMe();

document.getElementById('settingsForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent='';
  const username = document.getElementById('username').value.trim();
  try {
    await api('/api/users/me', { method:'PUT', body:{ username }});
    msg.textContent = 'Saved.';
  } catch (err) { msg.textContent = err.message; }
});

document.getElementById('avatarForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent='';
  const file = document.getElementById('avatarFile').files[0];
  if (!file) { msg.textContent = 'Please choose an image.'; return; }
  if (file.size > 2*1024*1024) { msg.textContent = 'File too large (max 2MB).'; return; }
  const fd = new FormData(); fd.append('avatar', file);
  const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, { method:'POST', credentials:'include', body: fd });
  if (!res.ok) {
    const j = await res.json().catch(()=>({error:'Upload failed'})); msg.textContent = j.error || 'Upload failed'; return;
  }
  const data = await res.json();
  const avatar = document.getElementById('avatar');
  if (avatar && data.profile_picture_url) avatar.src = data.profile_picture_url;
  msg.textContent = 'Avatar uploaded.';
});

document.getElementById('deleteBtn').addEventListener('click', async ()=>{
  if (!confirm('Delete your account? This cannot be undone.')) return;
  try { await api('/api/users/me', { method:'DELETE' }); location.replace('index.html'); }
  catch (err) { msg.textContent = err.message; }
});
