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
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Forgot password form
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', handleForgotPassword);
    }
    
    // Reset password form
    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        resetForm.addEventListener('submit', handleResetPassword);
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    
    try {
        // Send request to backend
        const response = await fetch('http://localhost:5000/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store email for next step
            localStorage.setItem('pendingEmail', email);
            window.location.href = 'check.html';
        } else {
            showAlert(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
}

// Handle verification code
async function handleVerification(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const code = document.getElementById('code').value;
    
    try {
        const response = await fetch('http://localhost:5000/auth/verify-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            window.location.href = 'form.html';
        } else {
            showAlert(data.message || 'Invalid verification code', 'error');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
}

// Handle complete registration
async function handleCompleteRegistration(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const hashPassword = document.getElementById('hash-password').checked;
    
    try {
        const response = await fetch('http://localhost:5000/auth/complete-registration', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, username, password, hashPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Registration successful! Please login.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showAlert(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Complete registration error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const hashPassword = document.getElementById('hash-password').checked;
    
    try {
        const response = await fetch('http://localhost:5000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, hashPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store auth token and user data
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify({
                username: data.username,
                profilePic: data.profilePic
            }));
            
            window.location.href = 'home.html';
        } else {
            showAlert(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
}

// Handle forgot password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    
    try {
        const response = await fetch('http://localhost:5000/auth/forget-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store email for reset process
            localStorage.setItem('resetEmail', email);
            showAlert('Reset instructions sent to your email', 'success');
        } else {
            showAlert(data.message || 'Password reset failed', 'error');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
}

// Handle reset password
async function handleResetPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const code = document.getElementById('code').value;
    const newPassword = document.getElementById('new-password').value;
    const hashPassword = document.getElementById('hash-password').checked;
    
    try {
        const response = await fetch('http://localhost:5000/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code, newPassword, hashPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Password reset successful! Please login.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showAlert(data.message || 'Password reset failed', 'error');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
}

// Check URL parameters for auth callbacks
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Handle Google OAuth callback
        localStorage.setItem('authToken', token);
        
        // Fetch user data (you might need to adjust this based on your backend)
        fetchUserData(token);
    }
}

// Fetch user data after OAuth login
async function fetchUserData(token) {
    try {
        const response = await fetch('http://localhost:5000/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('userData', JSON.stringify(userData));
            window.location.href = 'home.html';
        }
    } catch (error) {
        console.error('Failed to fetch user data:', error);
    }
}

// Google OAuth login
function loginWithGoogle() {
    window.location.href = 'http://localhost:5000/auth/google';
}