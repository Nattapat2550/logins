// Register: Send email, store temp, redirect to check
async function register(email) {
    try {
        showMessage('Sending verification code...', 'success');
        await apiPost('/api/auth/register', { email });
        localStorage.setItem('tempEmail', email);
        showMessage('Code sent! Check your email.', 'success');
        setTimeout(() => window.location.href = 'check.html', 1500);
    } catch (err) {
        showMessage('Registration failed: ' + err.message, 'error');
    }
}

// Verify: Validate code, redirect to form
async function verify(email, code) {
    try {
        showMessage('Verifying...', 'success');
        await apiPost('/api/auth/verify', { email, code });
        localStorage.setItem('tempEmail', email);
        showMessage('Verified! Set your password.', 'success');
        setTimeout(() => window.location.href = 'form.html', 1000);
    } catch (err) {
        showMessage('Verification failed: ' + err.message, 'error');
    }
}

// Set Password: After verify, auto-login
async function setPassword(email, password) {
    try {
        showMessage('Setting password...', 'success');
        await apiPost('/api/auth/set-password', { email, password });
        // Auto-login
        const loginRes = await apiPost('/api/auth/login', { email, password });
        localStorage.setItem('token', loginRes.token);
        localStorage.removeItem('tempEmail');
        showMessage('Password set! Redirecting to home...', 'success');
        setTimeout(() => window.location.href = 'home.html', 1500);
    } catch (err) {
        showMessage('Password set failed: ' + err.message, 'error');
    }
}

// Login: Email/password, store token
async function login(email, password) {
    try {
        showMessage('Logging in...', 'success');
        const res = await apiPost('/api/auth/login', { email, password });
        localStorage.setItem('token', res.token);
        showMessage('Login successful!', 'success');
        setTimeout(() => window.location.href = 'home.html', 1000);
    } catch (err) {
        showMessage('Login failed: ' + err.message, 'error');
    }
}

// Forgot Password: Send reset code
async function forgotPassword(email) {
    try {
        showMessage('Sending reset code...', 'success');
        await apiPost('/api/auth/forgot-password', { email });
        localStorage.setItem('tempEmail', email);
        showMessage('Reset code sent! Check your email.', 'success');
        // Redirect to reset page if you add one; for now, stay on login
    } catch (err) {
        showMessage('Reset request failed: ' + err.message, 'error');
    }
}

// Reset Password: (Call from a reset.html if added)
async function resetPassword(email, code, password) {
    try {
        await apiPost('/api/auth/reset-password', { email, code, password });
        showMessage('Password reset successful! Login now.', 'success');
        setTimeout(() => window.location.href = 'login.html', 1500);
    } catch (err) {
        showMessage('Reset failed: ' + err.message, 'error');
    }
}

// Export globals
window.register = register;
window.verify = verify;
window.setPassword = setPassword;
window.login = login;
window.forgotPassword = forgotPassword;
window.resetPassword = resetPassword;