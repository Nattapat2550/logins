function setupCheckForm() {
  const form = document.getElementById('checkForm');
  if (!form) return;

  const tempToken = mainUtils.getStorage('tempToken');
  if (!tempToken) {
    showAlert('No verification session. Start over.', 'error');
    window.location.href = 'register.html';
    return;
  }

  // Resend link
  const resendLink = document.querySelector('a[href="register.html"]');
  resendLink.textContent = 'Resend Code';
  resendLink.href = '#';
  resendLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.reload();  // Reload to resend (or call API again)
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('code').value.trim();
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Verifying...';

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      showAlert('Enter a valid 6-digit code', 'error');
      button.disabled = false;
      button.textContent = 'Verify Code';
      return;
    }

    try {
      const data = await mainUtils.apiCall('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ tempToken, code })
      });
      mainUtils.setStorage('token', data.token);  // Temp auth for form
      mainUtils.setStorage('userId', data.userId);
      showAlert('Email verified! Complete your profile.', 'success');
      window.location.href = 'form.html';
    } catch (error) {
      // Error shown by apiCall
    } finally {
      button.disabled = false;
      button.textContent = 'Verify Code';
    }
  });
}