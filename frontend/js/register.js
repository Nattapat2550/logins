const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode(); // From darkModeToggle.js

    const emailInput = document.getElementById('email');
    const errorDiv = document.getElementById('emailError');
    const form = document.getElementById('registerForm');

    // Real-time duplicate check
    emailInput.addEventListener('blur', async () => {
        const email = emailInput.value.trim();
        if (!email) return;
        try {
            const res = await fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(email)}`);
            if (!res.ok) throw new Error('Check failed');
            const data = await res.json();
            if (data.exists) {
                errorDiv.textContent = 'Email already registered. Try login.';
                errorDiv.className = 'error';
            } else {
                errorDiv.textContent = 'Email available!';
                errorDiv.className = 'success';
            }
        } catch (err) {
            console.error('Email check error:', err);
            errorDiv.textContent = 'Check failed. Try again.';
            errorDiv.className = 'error';
        }
    });

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email || errorDiv.className === 'error') {
            alert('Enter a valid, unused email.');
            return;
        }
        sessionStorage.setItem('pendingEmail', email);
        window.location.href = '/pages/form.html';
    });
});

// Google Callback (loaded via script in HTML)
function handleGoogleRegister(response) {
    const idToken = response.credential;
    fetch(`${API_BASE}/auth/google?token=${idToken}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                sessionStorage.setItem('pendingEmail', data.user.email); // For form if needed
                window.location.href = '/pages/form.html'; // Per spec; or 'pages/home.html'
            } else {
                alert('Google registration failed: ' + (data.error || 'Unknown'));
            }
        })
        .catch(err => alert('Google error: ' + err));
}