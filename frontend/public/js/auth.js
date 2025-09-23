// public/js/auth.js - Authentication Utilities

const API_BASE = 'https://backendlogins.onrender.com/api';  // FIXED: Added /api prefix

// Simple alert function (replace with toast library if needed)
function showAlert(message, type = 'info') {
  // For now, use native alert; customize based on type (success/error)
  alert(`${type.toUpperCase()}: ${message}`);
  console.log(`${type.toUpperCase()}: ${message}`);  // Also log for debugging
}

// Generic API fetch helper (FIXED: Read body only once as JSON)
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',  // Include cookies/JWT for auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('API Response Status:', response.status);  // Debug log
    console.log('API Response URL:', response.url);        // Debug log

    if (!response.ok) {
      // Read body once as JSON for error details
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    // Read body once as JSON (success case)
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    // FIXED: No double-read; just throw the error
    throw error;
  }
}

// Check if email exists (for registration)
async function checkEmailExists(email) {
  try {
    const data = await apiFetch(`${API_BASE}/register/check-email`, {  // FIXED: Correct endpoint with /api
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data;  // { exists: true/false }
  } catch (error) {
    console.error('Email check error:', error);
    showAlert(`Email check failed: ${error.message}`, 'error');
    throw error;
  }
}

// Send verification code
async function sendVerificationCode(email) {
  try {
    const data = await apiFetch(`${API_BASE}/register/send-code`, {  // Assuming backend has this; adjust if needed
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    showAlert('Verification code sent!', 'success');
    return data;
  } catch (error) {
    showAlert(`Failed to send code: ${error.message}`, 'error');
    throw error;
  }
}

// Verify code
async function verifyCode(email, code) {
  try {
    const data = await apiFetch(`${API_BASE}/register/verify-code`, {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    return data.token;  // Returns verification token
  } catch (error) {
    showAlert(`Verification failed: ${error.message}`, 'error');
    throw error;
  }
}

// Complete registration
async function handleRegister(token, username, password) {
  try {
    const data = await apiFetch(`${API_BASE}/register/complete`, {
      method: 'POST',
      body: JSON.stringify({ token, username, password }),
    });
    showAlert('Registration successful!', 'success');
    // Redirect based on role (from backend response)
    if (data.user && data.user.role === 'admin') {
      window.location.href = '/views/admin.html';
    } else {
      window.location.href = '/views/home.html';
    }
    return data;
  } catch (error) {
    console.error('Registration error:', error);  // FIXED: Uses showAlert instead of undefined function
    showAlert(`Registration failed: ${error.message}`, 'error');
    throw error;
  }
}

// Login with email/password
async function handleLogin(email, password) {
  try {
    const data = await apiFetch(`${API_BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    showAlert('Login successful!', 'success');
    if (data.user && data.user.role === 'admin') {
      window.location.href = '/views/admin.html';
    } else {
      window.location.href = '/views/home.html';
    }
    return data;
  } catch (error) {
    showAlert(`Login failed: ${error.message}`, 'error');
    throw error;
  }
}

// Google Login (redirect)
function handleGoogleLogin() {
  window.location.href = `${API_BASE}/auth/google`;
}

// Logout
async function handleLogout() {
  try {
    await apiFetch(`${API_BASE}/logout`, { method: 'POST' });
    showAlert('Logged out successfully!', 'success');
    window.location.href = '/views/index.html';
  } catch (error) {
    showAlert('Logout failed. Please try again.', 'error');
  }
}

// Get current user (for profile checks)
async function getCurrentUser () {
  try {
    return await apiFetch(`${API_BASE}/me`);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

// Export functions for use in HTML (if using modules; otherwise, they are global)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showAlert,
    apiFetch,
    checkEmailExists,
    sendVerificationCode,
    verifyCode,
    handleRegister,
    handleLogin,
    handleGoogleLogin,
    handleLogout,
    getCurrentUser ,
  };
}