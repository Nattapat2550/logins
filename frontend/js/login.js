const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();

    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('error');
    const showPassword = document.getElementById('showPassword');
    const forgotLink = document.getElementById('forgotPassword');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Password toggle
    showPassword.addEventListener('change', () => {
        passwordInput.type = showPassword.checked ? 'text' : 'password';
    });

    // Forgot password
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (email) {
            alert(`Reset instructions sent to ${email}. (Implement backend /api/auth/forgot-password)`);
            // TODO: fetch(`${API_BASE}/auth/forgot-password`, { method: 'POST', body: JSON.stringify({ email }) });
        } else {
            alert('Enter your email first.');
        }
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            errorDiv.textContent = 'Email and password required.';
            errorDiv.className = 'error';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                alert('Logged in successfully!');
                window.location.href = '/pages/home.html';
            } else {
                errorDiv.textContent = data.error || 'Login failed.';
                errorDiv.className = 'error';
            }
        } catch (err) {
            errorDiv.textContent = 'Network error.';
            errorDiv.className = 'error';
            console.error(err);
        }
    });
});

// Google Login Callback
function handleGoogleLogin(response) {
    const idToken = response.credential;
    fetch(`${API_BASE}/auth/google?token=${idToken}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                window.location.href = '/pages/home.html';
            } else {
                alert('Google login failed: ' + (data.error || 'Unknown'));
            }
        })
        .catch(err => alert('Google error: ' + err));
}