// API base URL for production (Render) - Update if your backend URL changes
const API_BASE_URL = 'https://backendlogins.onrender.com';

// Authentication functions
document.addEventListener('DOMContentLoaded', function() {
    // Setup form submissions
    setupAuthForms();
    
    // Check URL parameters for Google auth callback
    checkUrlParams();
});

// Setup authentication form submissions
function setupAuthForms() {
    // Registration form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Verification form
    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerification);
    }
    
    // Complete registration form
    const completeForm = document.getElementById('complete-form');
    if (completeForm) {
        completeForm.addEventListener('submit', handleCompleteRegistration);
    }
    
    // Login form (add if you have one on index.html)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Forgot password form (add if implemented)
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', handleForgotPassword);
    }
    
    // Reset password form (add if implemented)
    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        resetForm.addEventListener('submit', handleResetPassword);
    }
}

// Generic fetch helper with better error handling
async function apiFetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for Render cold starts
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Log response details for debugging
        console.log('API Response Status:', response.status);
        console.log('API Response Headers:', [...response.headers.entries()]);
        
        // Check if response is ok
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (jsonErr) {
                // If not JSON, try text to see what it is
                const text = await response.text();
                console.error('Non-JSON response body:', text);
                errorData = { message: `Server error: ${response.status} - ${text.substring(0, 200)}` };
            }
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        // Try to parse JSON, fallback to text
        let data;
        try {
            data = await response.json();
        } catch (jsonErr) {
            const text = await response.text();
            console.error('JSON parse failed, raw response:', text);
            throw new Error('Server returned invalid JSON');
        }
        
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out - try again in a moment (Render may be waking up)');
        }
        console.error('API Fetch Error:', error);
        throw error;
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showAlert('Email is required', 'error');
        return;
    }
    
    try {
        showAlert('Sending verification code...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        // Store email for next step
        localStorage.setItem('pendingEmail', email);
        showAlert(data.message || 'Verification code sent! Check your email.', 'success');
        setTimeout(() => {
            window.location.href = 'check.html';
        }, 1500);
    } catch (error) {
        console.error('Registration error:', error);
        showAlert(error.message || 'Registration failed. Please try again.', 'error');
    }
}

// Handle verification code
async function handleVerification(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();
    
    if (!email || !code || code.length !== 6) {
        showAlert('Please enter a valid email and 6-digit code', 'error');
        return;
    }
    
    try {
        showAlert('Verifying code...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code })
        });
        
        showAlert(data.message || 'Code verified! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'form.html';
        }, 1500);
    } catch (error) {
        console.error('Verification error:', error);
        showAlert(error.message || 'Invalid verification code', 'error');
    }
}

// Handle complete registration
async function handleCompleteRegistration(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const hashPassword = document.getElementById('hash-password')?.checked || false;
    
    if (!email || !username || !password || password.length < 6) {
        showAlert('Please fill all fields with a password of at least 6 characters', 'error');
        return;
    }
    
    try {
        showAlert('Completing registration...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/complete-registration`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, username, password, hashPassword })
        });
        
        showAlert(data.message || 'Registration successful! Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        console.error('Complete registration error:', error);
        showAlert(error.message || 'Registration failed', 'error');
    }
}

// Handle login (if you add a login form to index.html)
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const hashPassword = document.getElementById('hash-password')?.checked || false;
    
    if (!email || !password) {
        showAlert('Email and password required', 'error');
        return;
    }
    
    try {
        showAlert('Logging in...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, hashPassword })
        });
        
        // Store auth token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify({
            username: data.username,
            profilePic: data.profilePic || 'images/User.png'
        }));
        
        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Login failed', 'error');
    }
}

// Handle forgot password (if implemented)
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showAlert('Email required', 'error');
        return;
    }
    
    try {
        showAlert('Sending reset instructions...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/forget-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        localStorage.setItem('resetEmail', email);
        showAlert(data.message || 'Reset instructions sent to your email', 'success');
    } catch (error) {
        console.error('Forgot password error:', error);
        showAlert(error.message || 'Password reset failed', 'error');
    }
}

// Handle reset password (if implemented)
async function handleResetPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();
    const newPassword = document.getElementById('new-password').value;
    const hashPassword = document.getElementById('hash-password')?.checked || false;
    
    if (!email || !code || !newPassword || newPassword.length < 6) {
        showAlert('Please fill all fields with a new password of at least 6 characters', 'error');
        return;
    }
    
    try {
        showAlert('Resetting password...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code, newPassword, hashPassword })
        });
        
        showAlert(data.message || 'Password reset successful! Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        console.error('Reset password error:', error);
        showAlert(error.message || 'Password reset failed', 'error');
    }
}

// Check URL parameters for auth callbacks (e.g., Google OAuth)
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Handle Google OAuth callback
        localStorage.setItem('authToken', token);
        fetchUserData(token);
        // Clear URL params to clean up
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Fetch user data after OAuth login
async function fetchUserData(token) {
    try {
        const data = await apiFetch(`${API_BASE_URL}/user/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        localStorage.setItem('userData', JSON.stringify({
            username: data.user.username,
            profilePic: data.user.profile_pic || 'images/User.png'
        }));
        window.location.href = 'home.html';
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        showAlert('Login successful, but profile load failed. Please refresh.', 'warning');
        window.location.href = 'home.html';
    }
}

// Google OAuth login
function loginWithGoogle() {
    window.location.href = `${API_BASE_URL}/auth/google`;
}