// frontend/js/form.js
const API_BASE = 'https://backendlogins.onrender.com/api';  // Your backend URL

// Helper: Show error message
function showError(message) {
  const msgDiv = document.getElementById('message');
  msgDiv.innerHTML = `<div class="error">${message}</div>`;
  msgDiv.style.display = 'block';
}

// Helper: Show success message
function showSuccess(message) {
  const msgDiv = document.getElementById('message');
  msgDiv.innerHTML = `<div class="success">${message}</div>`;
  msgDiv.style.display = 'block';
}

// Image preview on file select
document.addEventListener('DOMContentLoaded', function() {
  const profilePicInput = document.getElementById('profilePic');
  const preview = document.getElementById('profilePreview');
  
  profilePicInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        preview.src = e.target.result;  // Show uploaded image preview
      };
      reader.readAsDataURL(file);
    } else {
      preview.src = 'images/user.png';  // Reset to default if cleared
    }
  });

  // Pre-fill form from localStorage/URL (after verification or Google)
  const urlParams = new URLSearchParams(window.location.search);
  const pendingEmail = localStorage.getItem('pendingEmail') || urlParams.get('email');
  const prefillUsername = urlParams.get('username') || '';
  const prefillProfilePic = urlParams.get('profilePic') || '';
  const isGoogle = urlParams.get('google') === 'true' || localStorage.getItem('tempToken') !== null;

  if (pendingEmail) {
    document.getElementById('pendingEmail').textContent = pendingEmail;
    document.getElementById('emailDisplay').style.display = 'block';
  }

  if (prefillUsername) {
    document.getElementById('username').value = prefillUsername;
  }

  if (prefillProfilePic && prefillProfilePic !== '') {
    document.getElementById('profilePreview').src = prefillProfilePic;  // From Google
  }

  // Hide password for Google flow
  if (isGoogle) {
    document.getElementById('passwordGroup').classList.add('hidden');
    document.getElementById('password').removeAttribute('required');
  }
});

// Complete registration submission
async function completeRegistration() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const profilePicFile = document.getElementById('profilePic').files[0];
  const pendingEmail = localStorage.getItem('pendingEmail') || new URLSearchParams(window.location.search).get('email');
  const isGoogle = new URLSearchParams(window.location.search).get('google') === 'true' || localStorage.getItem('tempToken') !== null;

  // Validation
  if (!username || username.length < 3) {
    return showError('Username required (at least 3 characters)');
  }
  if (!pendingEmail) {
    return showError('Email not found. Please verify first.');
  }
  if (!isGoogle && (!password || password.length < 6)) {
    return showError('Password required (at least 6 characters)');
  }

  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', pendingEmail);
    if (!isGoogle) {
      formData.append('password', password);
    }
    formData.append('google', isGoogle ? 'true' : 'false');
    
    // Only append file if selected (otherwise backend gets null)
    if (profilePicFile) {
      formData.append('profilePic', profilePicFile);
    }

    // For Google: Include temp token if available (from callback)
    const tempToken = localStorage.getItem('tempToken') || new URLSearchParams(window.location.search).get('token');
    if (tempToken) {
      formData.append('token', tempToken);
    }

    const res = await fetch(`${API_BASE}/auth/register/complete`, {
      method: 'POST',
      body: formData  // Browser sets Content-Type: multipart/form-data
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Store token and clean up
      localStorage.setItem('token', data.token);
      localStorage.removeItem('pendingEmail');
      localStorage.removeItem('tempToken');
      
      showSuccess('Profile saved successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = 'home.html';  // Or dashboard
      }, 1500);
    } else {
      showError(data.error || 'Registration failed. Please try again.');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showError('Network error: ' + error.message);
  }
}