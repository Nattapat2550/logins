// API base URL for production (Render) - Update if your backend URL changes
const API_BASE_URL = 'https://backendlogins.onrender.com';

// Authentication functions
document.addEventListener('DOMContentLoaded', function() {
    // Setup form submissions
    setupAuthForms();
    
    // Check URL parameters for Google auth callback
    checkUrlParams();
    
    // Setup login tabs if on login page
    if (document.querySelector('.tab')) {
        setupLoginTabs();
    }
    
    // Real-time email check for register form
    const registerEmail = document.getElementById('register-email');
    if (registerEmail) {
        registerEmail.addEventListener('blur', function() {
            const email = this.value.trim();
            if (email) {
                checkEmailExists(email);
            }
        });
    }
});

// Setup authentication form submissions
function setupAuthForms() {
    // Registration form (login.html)
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Verification form (check.html)
    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerification);
    }
    
    // Complete registration form (form.html)
    const completeForm = document.getElementById('complete-form');
    if (completeForm) {
        completeForm.addEventListener('submit', handleCompleteRegistration);
    }
    
    // Login form (login.html)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Contact form (optional, for demo)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showAlert('Message sent successfully!', 'success');
            contactForm.reset();
        });
    }
    
    // Profile form (settings.html)
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showAlert('Profile updated successfully!', 'success');
        });
    }
}

// Generic fetch helper with better error handling (fixes JSON parsing issues)
async function apiFetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for Render cold starts
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Log response details for debugging
        console.log('API Response Status:', response.status);
        console.log('API Response URL:', url);
        
        // Check if response is ok
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (jsonErr) {
                // If not JSON, try text to see what it is (e.g., HTML error page)
                const text = await response.text();
                console.error('Non-JSON response body:', text.substring(0, 500));
                errorData = { message: `Server error ${response.status}: ${text.substring(0, 100)}...` };
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
            throw new Error('Server returned invalid JSON response');
        }
        
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Try again - the server may be starting up.');
        }
        console.error('API Fetch Error:', error);
        throw error;
    }
}

// Real-time email existence check (for registration)
async function checkEmailExists(email) {
    if (!email || !email.includes('@')) return;
    
    const emailField = document.getElementById('register-email');
    const errorEl = document.getElementById('register-email-error');
    const successEl = document.getElementById('register-email-success');
    
    try {
        const data = await apiFetch(`${API_BASE_URL}/auth/check-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        if (data.exists) {
            emailField.classList.add('error');
            if (errorEl) {
                errorEl.textContent = data.message;
                errorEl.style.display = 'block';
            }
            if (successEl) successEl.style.display = 'none';
        } else {
            emailField.classList.remove('error');
            if (successEl) {
                successEl.textContent = data.message;
                successEl.style.display = 'block';
            }
            if (errorEl) errorEl.style.display = 'none';
        }
    } catch (error) {
        console.error('Email check error:', error);
        if (errorEl) {
            errorEl.textContent = 'Unable to check email availability';
            errorEl.style.display = 'block';
        }
    }
}

// Handle registration (send verification code)
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value.trim();
    const emailError = document.getElementById('register-email-error');
    
    if (!email || (emailError && emailError.style.display !== 'none')) {
        showAlert('Please enter a valid, unused email address', 'error');
        return;
    }
    
    try {
        showAlert('Sending verification code...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        showAlert(error.message || 'Failed to send verification code. Please try again.', 'error');
    }
}

// Handle verification code
async function handleVerification(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();
    
    if (!email || !code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        showAlert('Please enter a valid email and 6-digit code', 'error');
        return;
    }
    
    try {
        showAlert('Verifying code...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        
        // Store email for form.html
        localStorage.setItem('pendingEmail', email);
        showAlert(data.message || 'Code verified! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'form.html';
        }, 1500);
    } catch (error) {
        console.error('Verification error:', error);
        showAlert(error.message || 'Invalid verification code. Please try again.', 'error');
    }
}

// Handle complete registration (form.html)
async function handleCompleteRegistration(e) {
    e.preventDefault();
    
    const email = document.getElementById('form-email').value.trim();
    const username = document.getElementById('form-username').value.trim();
    const password = document.getElementById('form-password').value;
    const confirmPassword = document.getElementById('form-confirm-password').value;
    const hashPassword = document.getElementById('form-hash-password')?.checked || false;
    
    if (!email || !username || !password || password.length < 8) {
        showAlert('Please fill all fields with a password of at least 8 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert("Passwords don't match", 'error');
        return;
    }
    
    try {
        showAlert('Completing registration...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/complete-registration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password, hashPassword })
        });
        
        // Store auth token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify({
            username: data.username,
            profilePic: data.profilePic || 'images/User.png'
        }));
        
        // Cleanup
        localStorage.removeItem('pendingEmail');
        localStorage.removeItem('googleEmail');
        
        showAlert(data.message || 'Registration successful! Redirecting to dashboard...', 'success');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
    } catch (error) {
        console.error('Complete registration error:', error);
        showAlert(error.message || 'Registration failed. Please try again.', 'error');
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const hashPassword = document.getElementById('login-hash-password')?.checked || false;
    
    if (!email || !password) {
        showAlert('Email and password are required', 'error');
        return;
    }
    
    try {
        showAlert('Logging in...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        showAlert(error.message || 'Login failed. Please check your credentials.', 'error');
    }
}

// Setup login tabs (for login.html)
function setupLoginTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            contents[index].classList.add('active');
        });
    });
}

// Check URL parameters for auth callbacks (e.g., Google OAuth)
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const isGoogle = urlParams.get('google') === 'true';
    const email = urlParams.get('email');
    
    if (token) {
        localStorage.setItem('authToken', token);
        
        if (isGoogle && email) {
            localStorage.setItem('googleEmail', email);
            // If on form.html, prefill email
            if (window.location.pathname.includes('form.html')) {
                const emailField = document.getElementById('form-email');
                if (emailField) {
                    emailField.value = email;
                }
            } else {
                // Redirect to form.html for new Google users
                window.location.href = `form.html?token=${token}&google=true&email=${encodeURIComponent(email)}`;
                return;
            }
        }
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Fetch user data if needed
        if (!isGoogle || !email) {
            fetchUserData(token);
        }
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
        showAlert('Login successful, but profile load failed. Please refresh the page.', 'warning');
        window.location.href = 'home.html';
    }
}

// Google OAuth login
function loginWithGoogle() {
    // Redirect to backend Google auth endpoint
    window.location.href = `${API_BASE_URL}/auth/google`;
}

// Handle forgot password (placeholder - add form if needed)
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgot-email')?.value.trim();
    
    if (!email) {
        showAlert('Email required', 'error');
        return;
    }
    
    try {
        showAlert('Sending reset instructions...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/forget-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        localStorage.setItem('resetEmail', email);
        showAlert(data.message || 'Reset instructions sent to your email', 'success');
    } catch (error) {
        console.error('Forgot password error:', error);
        showAlert(error.message || 'Password reset failed', 'error');
    }
}

// Handle reset password (placeholder - add form if needed)
async function handleResetPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('reset-email')?.value.trim();
    const code = document.getElementById('reset-code')?.value.trim();
    const newPassword = document.getElementById('new-password')?.value;
    const hashPassword = document.getElementById('reset-hash-password')?.checked || false;
    
    if (!email || !code || !newPassword || newPassword.length < 8) {
        showAlert('Please fill all fields with a new password of at least 8 characters', 'error');
        return;
    }
    
    try {
        showAlert('Resetting password...', 'info');
        
        const data = await apiFetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword, hashPassword })
        });
        
        showAlert(data.message || 'Password reset successful! Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        console.error('Reset password error:', error);
        showAlert(error.message || 'Password reset failed', 'error');
    }
}