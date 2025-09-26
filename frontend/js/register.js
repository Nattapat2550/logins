function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Sending...';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('Valid email required', 'error');
      button.disabled = false;
      button.textContent = 'Send Verification Code';
      return;
    }

    try {
      const data = await mainUtils.apiCall('/api/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      mainUtils.setStorage('tempToken', data.tempToken);  // Store for check.js
      showAlert('Verification code sent! Check your email.', 'success');
      window.location.href = 'check.html';
    } catch (error) {
      // Error already shown by apiCall
    } finally {
      button.disabled = false;
      button.textContent = 'Send Verification Code';
    }
  });
}