function setupForm() {
  const form = document.getElementById('formForm');
  if (!form) return;

  // Parse URL params (Google redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const isGoogle = urlParams.get('google') === 'true';
  const googleTempToken = urlParams.get('token');
  const prefillEmail = urlParams.get('email') || '';
  const prefillUsername = urlParams.get('username') || '';
  const prefillPic = urlParams.get('profilePic') || '';

  document.getElementById('google').value = isGoogle ? 'true' : 'false';
  if (googleTempToken) document.getElementById('tempToken').value = googleTempToken;

  if (isGoogle) {
    document.getElementById('passwordGroup').classList.add('hidden');  // No password for Google
    if (prefillUsername) document.getElementById('username').value = prefillUsername;
  }

  // Profile pic preview
  const fileInput = document.getElementById('profilePic');
  const preview = document.getElementById('profilePreview');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      preview.src = URL.createObjectURL(file);
      preview.classList.remove('hidden');
    }
  });

  // If prefill pic (Google), show it
  if (prefillPic) {
    preview.src = prefillPic;
    preview.classList.remove('hidden');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const google = document.getElementById('google').value === 'true';
    const tempToken = document.getElementById('tempToken').value;
    const file = fileInput.files[0];

    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Completing...';

    if (!username || username.length < 3) {
      showAlert('Username required (min 3 chars)', 'error');
      button.disabled = false;
      button.textContent = 'Complete Registration';
      return;
    }

    if (!google && (!password || password.length < 6 || password !== confirmPassword)) {
      showAlert('Password required and must match (min 6 chars)', 'error');
      button.disabled = false;
      button.textContent = 'Complete Registration';
      return;
    }

    if (google && !tempToken) {
      showAlert('Google session invalid. Try again.', 'error');
      button.disabled = false;
      button.textContent = 'Complete Registration';
      return;
    }

    try {
      const formData = new FormData();
      formData.append('username', username);
      if (!google) formData.append('password', password);
      formData.append('google', google);
      if (google) formData.append('tempToken', tempToken);
      if (file) formData.append('profilePic', file);

      const data = await mainUtils.apiCall('/api/auth/register/complete', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' }  // Multer expects this, but fetch sets auto
      });

      mainUtils.setStorage('token', data.token);
      mainUtils.setStorage('role', data.role);
      showAlert('Registration complete! Redirecting...', 'success');
      window.location.href = 'home.html';
    } catch (error) {
      // Error shown by apiCall
    } finally {
      button.disabled = false;
      button.textContent = 'Complete Registration';
    }
  });
}