async function verifyCode() {
  const code = document.getElementById('code').value;
  const email = localStorage.getItem('pendingEmail');
  if (!email || !code) return showError('Email or code missing');

  try {
    const res = await apiCall('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
    if (res.valid) {
      showSuccess('Verified! Redirecting...');
      setTimeout(() => {
        window.location.href = 'form.html';
      }, 1000);
    } else {
      showError('Invalid or expired code');
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