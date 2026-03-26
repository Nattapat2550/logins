const msg = document.getElementById('msg');

// โหลดข้อมูลผู้ใช้มาแสดงทั้งใน Navbar และฟอร์ม
async function loadMe() {
  try {
    const me = await api('/api/users/me');
    
    // จัดการ Navbar User Menu
    document.getElementById('userMenu').style.display = 'flex';
    document.getElementById('navUname').textContent = me.username || me.email || 'User';
    if (me.profile_picture_url) {
      document.getElementById('navAvatar').src = me.profile_picture_url;
    }

    // จัดการข้อมูลในฟอร์ม Settings
    document.getElementById('username').value = me.username || '';
    document.getElementById('first_name').value = me.first_name || '';
    document.getElementById('last_name').value = me.last_name || '';
    document.getElementById('tel').value = me.tel || '';

  } catch (err) {
    location.replace('index.html');
  }
}
loadMe();

// บันทึกการแก้ไขข้อมูลส่วนตัว
document.getElementById('settingsForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '';
  
  const username = document.getElementById('username').value.trim();
  const first_name = document.getElementById('first_name').value.trim();
  const last_name = document.getElementById('last_name').value.trim();
  const tel = document.getElementById('tel').value.trim();
  
  try {
    const res = await api('/api/users/me', { 
      method: 'PUT', 
      body: { username, first_name, last_name, tel } 
    });
    
    msg.textContent = 'Profile saved successfully.';
    
    // อัปเดตชื่อใน Navbar ให้เป็นค่าล่าสุด
    if (res.username) {
      document.getElementById('navUname').textContent = res.username;
    }
  } catch (err) {
    msg.textContent = err.message || 'Error saving profile';
  }
});

// อัปโหลดรูปภาพโปรไฟล์ใหม่
document.getElementById('avatarForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '';
  const file = document.getElementById('avatarFile').files[0];
  if (!file) { msg.textContent = 'Please choose an image.'; return; }
  if (file.size > 2 * 1024 * 1024) { msg.textContent = 'File too large (max 2MB).'; return; }

  const fd = new FormData();
  fd.append('avatar', file);

  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  try {
    const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: fd
    });

    if (!res.ok) {
      const j = await res.json().catch(()=>({error:'Upload failed'}));
      msg.textContent = j.error || 'Upload failed';
      return;
    }

    const data = await res.json();
    
    // อัปเดตภาพใน Navbar ทันที
    if (data.profile_picture_url) {
      document.getElementById('navAvatar').src = data.profile_picture_url;
    }
    
    msg.textContent = 'Avatar uploaded successfully.';
    document.getElementById('avatarFile').value = ''; // เคลียร์ช่อง input หลังอัปโหลดเสร็จ
  } catch (err) {
    msg.textContent = 'Upload failed due to network error.';
  }
});

// ลบบัญชี (Soft Delete)
document.getElementById('deleteBtn').addEventListener('click', async ()=>{
  if (!confirm('บัญชีของคุณจะถูกปิดใช้งานและซ่อนจากระบบ หากคุณไม่กลับมาเข้าสู่ระบบภายใน 30 วัน ข้อมูลจะถูกลบถาวรอัตโนมัติ ยืนยันหรือไม่?')) return;
  try {
    await api('/api/users/me', { method: 'PATCH', body: { status: 'deleted' } });
    localStorage.removeItem('token');
    location.replace('index.html');
  } catch (err) {
    msg.textContent = err.message || 'Failed to deactivate account';
  }
});

// การคลิกปุ่ม Logout ใน Navbar
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try { 
    await api('/api/auth/logout', { method: 'POST' }); 
  } catch {}
  localStorage.removeItem('token');
  location.replace('index.html');
});