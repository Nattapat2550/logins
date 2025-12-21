const form = document.getElementById('registerForm');
const msg = document.getElementById('msg');
const emailEl = document.getElementById('email');
const googleBtn = document.getElementById('googleBtn');

googleBtn.onclick = () => {
  location.href = `${API_BASE_URL}/api/auth/google`;
};

// กันกดซ้ำ
let submitting = false;

// ✅ (Optional) โหมด preview: ตรวจ email เฉย ๆ ไม่แตะ DB (backend รองรับ preview แล้ว)
// เรียกเบา ๆ ตอน blur (ออกจากช่อง) เพื่อไม่ยิงถี่
emailEl.addEventListener('blur', async () => {
  const email = emailEl.value.trim();
  msg.textContent = '';

  if (!email) return;
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    msg.textContent = 'Invalid email';
    return;
  }

  try {
    // preview = true (ไม่เขียน DB)
    await api('/api/auth/register', { method: 'POST', body: { email, preview: true } });
  } catch (err) {
    // ถ้า preview error ให้โชว์เฉพาะกรณีจำเป็น
    msg.textContent = err.message || 'Preview failed';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitting) return;

  msg.textContent = '';
  const email = emailEl.value.trim();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    msg.textContent = 'Invalid email';
    return;
  }

  submitting = true;
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;

  try {
    // ✅ submit จริง: เขียน DB + สร้าง code + ส่งเมล
    await api('/api/auth/register', { method: 'POST', body: { email } });

    sessionStorage.setItem('pendingEmail', email);
    location.href = 'check.html';
  } catch (err) {
    msg.textContent = err.message;
  } finally {
    submitting = false;
    if (btn) btn.disabled = false;
  }
});
