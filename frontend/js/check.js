const form = document.getElementById('codeForm');
const msg = document.getElementById('msg');
const email = sessionStorage.getItem('pendingEmail');

// ถ้าไม่มี email ที่จะ verify ให้กลับไปหน้า register
if (!email) {
  location.replace('register.html');
}

// กันกรณีโหลด script แต่ไม่มีฟอร์ม (ป้องกัน error ใน console)
if (!form) {
  console.error('codeForm not found in DOM');
} else {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const codeInput = document.getElementById('code');
    const code = codeInput ? codeInput.value.trim() : '';

    // ถ้าไม่กรอกโค้ดไม่ต้องยิง API
    if (!code) {
      msg.textContent = 'Please enter the verification code.';
      return;
    }

    // ป้องกันกดซ้ำระหว่างรอ response
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await api('/api/auth/verify-code', {
        method: 'POST',
        body: { email, code },
      });

      // ถ้า verify สำเร็จ ไปหน้า form.html พร้อมส่ง email ไปใน query string
      location.href = `form.html?email=${encodeURIComponent(email)}`;
    } catch (err) {
      msg.textContent = err.message || 'Verification failed';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
