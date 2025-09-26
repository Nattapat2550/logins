function setupResetForm() {
  const form = document.getElementById('resetForm');
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (!token) {
    showAlert('Invalid reset link. Start over.', 'error');
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('token').value = token;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Resetting...';

    if (!newPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
      showAlert('New password required and must match (min 6 chars)', 'error');
      button.disabled = false;
      button.textContent = 'Reset Password';
      return;
    }

    try {
      await mainUtils.apiCall('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });
      showAlert('Password reset successful! You can now login.', 'success');
      window.location.href = 'login.html';
    } catch (error) {
      // Error shown by apiCall (e.g., "Invalid or expired reset token")
    } finally {
      button.disabled = false;
      button.textContent = 'Reset Password';
    }
  });
}