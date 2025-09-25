// frontend/js/login.js
// Note: API_BASE is defined in main.js - do not redeclare here

// Helper: Show message
function showMessage(message, isError = true) {
  const msgDiv = document.getElementById('message');
  msgDiv.innerHTML = `<div class="${isError ? 'error' : 'success'}">${message}</div>`;
  msgDiv.style.display = 'block';
  if (!isError) {
    setTimeout(() => msgDiv.style.display = 'none', 3000);
  }
}

// Login function (called from onclick)
async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Basic validation
  if (!email || !password) {
    return showMessage('Email and password required');
  }
  if (!email.includes('@')) {
    return showMessage('Valid email required');
  }
  if (password.length < 6) {
    return showMessage('Password must be at least 6 characters');
  }

  // Ensure API_BASE is available (from main.js)
  if (typeof API_BASE === 'undefined') {
    return showMessage('API configuration error. Please refresh the page.');
  }

  try {
    // Use apiCall from main.js (adjust if different)
    const res = await apiCall(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email, password }  // apiCall handles JSON.stringify
    });

    const data = await res.json();

    if (res.ok && data.token) {
      // Success: Store token and redirect
      localStorage.setItem('token', data.token);
      showMessage('Login successful! Redirecting...', false);
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1500);
    } else {
      // Errors from backend
      let errorMsg = data.error || 'Login failed';
      if (res.status === 401) {
        if (errorMsg.includes('verify')) {
          errorMsg = 'Please verify your email first. Check your inbox.';
        } else if (errorMsg.includes('password')) {
          errorMsg = 'Incorrect password. Try again.';
        } else {
          errorMsg = 'Invalid email or password.';
        }
      } else if (res.status === 400) {
        errorMsg = 'Missing email or password.';
      }
      showMessage(errorMsg);
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Network error: ' + error.message);
  }
}

// Optional: Enter on Enter key
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });
});