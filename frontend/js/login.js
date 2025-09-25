// frontend/js/login.js
// Note: API_BASE and apiCall are from main.js - do not redeclare

let isLoggingIn = false;  // Debounce to prevent double-clicks

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
  if (isLoggingIn) return;  // Prevent multiple calls
  isLoggingIn = true;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Basic validation
  if (!email || !password) {
    isLoggingIn = false;
    return showMessage('Email and password required');
  }
  if (!email.includes('@')) {
    isLoggingIn = false;
    return showMessage('Valid email required');
  }
  if (password.length < 6) {
    isLoggingIn = false;
    return showMessage('Password must be at least 6 characters');
  }

  // Ensure API_BASE is available
  if (typeof API_BASE === 'undefined') {
    isLoggingIn = false;
    return showMessage('API configuration error. Please refresh the page.');
  }

  try {
    const res = await apiCall(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email, password }  // Object - main.js handles stringify
    });

    // Always parse JSON (even on errors)
    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      throw new Error('Invalid response from server');
    }

    if (res.ok && data.token) {
      // Success: Store token and redirect
      localStorage.setItem('token', data.token);
      showMessage('Login successful! Redirecting...', false);
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1500);
    } else {
      // Handle errors (now parses body for 401/400/etc.)
      let errorMsg = data.error || `Login failed (HTTP ${res.status})`;
      if (res.status === 401) {
        if (errorMsg.includes('verify') || errorMsg.includes('email')) {
          errorMsg = 'Please verify your email first. Check your inbox.';
        } else if (errorMsg.includes('password') || errorMsg.includes('credentials')) {
          errorMsg = 'Incorrect email or password. Try again.';
        } else {
          errorMsg = 'Invalid login. Please check your details.';
        }
      } else if (res.status === 400) {
        errorMsg = 'Missing or invalid email/password. Please try again.';
      } else if (res.status >= 500) {
        errorMsg = 'Server error. Please try again later.';
      }
      showMessage(errorMsg);
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Network error: ' + (error.message || 'Unable to connect'));
  } finally {
    isLoggingIn = false;  // Reset debounce
  }
}

// Optional: Enter on Enter key
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  form.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isLoggingIn) login();
  });

  // Optional: Disable button during login
  const button = form.querySelector('button');
  const originalText = button.textContent;
  button.addEventListener('click', () => {
    if (!isLoggingIn) {
      button.textContent = 'Logging in...';
      login().finally(() => {
        button.textContent = originalText;
      });
    }
  });
});