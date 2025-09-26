function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  // Google button (already a link in HTML; no JS needed, but handle post-redirect if error)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('error')) {
    showAlert('Google login failed. Try again.', 'error');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Logging in...';

    if (!email || !password || password.length < 6) {
      showAlert('Valid email and password (min 6 chars) required', 'error');
      button.disabled = false;
      button.textContent = 'Login';
      return;
    }

    try {
      const data = await mainUtils.apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      mainUtils.setStorage('token', data.token);
      mainUtils.setStorage('role', data.role);
      showAlert('Login successful! Redirecting...', 'success');
      window.location.href = 'home.html';
    } catch (error) {
      // Error shown by apiCall (e.g., "Invalid credentials")
    } finally {
      button.disabled = false;
      button.textContent = 'Login';
    }
  });
}