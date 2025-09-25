// Register
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const username = document.getElementById('username').value;
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username })
  });
  if (res.ok) {
    localStorage.setItem('regEmail', email);
    window.location.href = 'check.html';
  } else {
    alert((await res.json()).error);
  }
});

// Google Register/Login (same button on both)
document.getElementById('googleLogin')?.addEventListener('click', () => {
  window.location.href = '/api/auth/google';
});

// Verify Code
document.getElementById('verifyForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = localStorage.getItem('regEmail') || document.getElementById('email').value;
  const code = document.getElementById('code').value;
  const res = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  if (res.ok) {
    localStorage.setItem('verifiedEmail', email);
    window.location.href = 'form.html';
  } else {
    alert((await res.json()).error);
  }
});

// Set Password (form.html)
document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = localStorage.getItem('verifiedEmail');
  const password = document.getElementById('password').value;
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    window.location.href = data.redirect;
  } else {
    alert(data.error);
  }
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const resetCode = document.getElementById('resetCode')?.value;
  const newPassword = document.getElementById('newPassword')?.value;
  const body = { email, password };
  if (resetCode && newPassword) body.resetCode = resetCode, body.newPassword = newPassword, delete body.password;
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    window.location.href = data.redirect;
  } else {
    alert(data.error);
  }
});

// Forgot Password
document.getElementById('forgotForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value;
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (res.ok) {
    alert('Reset code sent');
    // Show reset fields
    document.getElementById('resetSection').style.display = 'block';
  } else {
    alert((await res.json()).error);
  }
});

// Hide/Show Password
document.getElementById('hidePassword')?.addEventListener('change', (e) => {
  const pass = document.getElementById('loginPassword') || document.getElementById('password');
  pass.type = e.target.checked ? 'text' : 'password';
});

// Handle Google Callback (if direct access)
const urlParams = new URLSearchParams(window.location.search);
const callbackToken = urlParams.get('token');
if (callbackToken) {
  localStorage.setItem('token', callbackToken);
  window.location.href = 'home.html'; // Or admin if role, but check after
}