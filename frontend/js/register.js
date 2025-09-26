function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Sending...';
    button.classList.add('loading');  // Add spinner class (see CSS below)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mainUtils.showAlert('Valid email required', 'error');
      button.disabled = false;
      button.textContent = 'Send Verification Code';
      button.classList.remove('loading');
      return;
    }

    // Custom timeout wrapper for fetch (30s max)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);  // 30s timeout

    try {
      const data = await mainUtils.apiCall('/api/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
        signal: controller.signal  // Abort on timeout
      });
      clearTimeout(timeoutId);
      mainUtils.setStorage('tempToken', data.tempToken);
      mainUtils.showAlert('Verification code sent! Check your email (may take 10-30s).', 'success');
      setTimeout(() => window.location.href = 'check.html', 1500);  // Delay for user to see alert
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        mainUtils.showAlert('Request timed out (30s). Network slow or server busy—try again.', 'error');
      }
      // Other errors handled by apiCall
    } finally {
      button.disabled = false;
      button.textContent = 'Send Verification Code';
      button.classList.remove('loading');
    }
  });
}