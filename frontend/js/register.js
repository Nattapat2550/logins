async function checkEmail() {
  const email = document.getElementById('email').value;
  if (!email) return showError('Enter email');

  try {
    const res = await apiCall('/auth/register/email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    if (res.duplicate) {
      showError('Email already registered');
    } else if (res.sent) {
      localStorage.setItem('pendingEmail', email);
      window.location.href = 'check.html';
    } else {
      showError('Failed to send code');
    }
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  document.getElementById('error').textContent = msg;
}