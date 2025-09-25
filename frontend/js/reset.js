let currentEmail = '';

async function sendResetCode() {
  const email = document.getElementById('email').value;
  if (!email) return showError('Enter email');

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.sent) {
      currentEmail = email;
      document.getElementById('step1').classList.add('hidden');
      document.getElementById('step2').classList.remove('hidden');
      showSuccess('Code sent! Check your email.');
    } else {
      showError('Email not found');
    }
  } catch (err) {
    showError(err.message);
  }
}

async function verifyResetCode() {
  const code = document.getElementById('code').value;
  if (!code) return showError('Enter code');

  try {
    const res = await fetch(`${API_BASE}/auth/reset/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail, code })
    });
    const data = await res.json();
    if (data.valid) {
      document.getElementById('step2').classList.add('hidden');
      document.getElementById('step3').classList.remove('hidden');
      showSuccess('Code verified!');
    } else {
      showError('Invalid code');
    }
  } catch (err) {
    showError(err.message);
  }
}

async function setNewPassword() {
  const newPw = document.getElementById('newPassword').value;
  const confirmPw = document.getElementById('confirmPassword').value;
  if (newPw !== confirmPw) return showError('Passwords do not match');
  if (newPw.length < 6) return showError('Password too short');

  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail, newPassword: newPw })
    });
    const data = await res.json();
    if (data.success) {
      showSuccess('Password reset! Redirecting to login...');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    }
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  document.getElementById('error').textContent = msg;
  document.getElementById('success').classList.add('hidden');
}

function showSuccess(msg) {
  document.getElementById('success').textContent = msg;
  document.getElementById('success').classList.remove('hidden');
  document.getElementById('error').textContent = '';
}