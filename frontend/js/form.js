const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();

    const pendingEmail = sessionStorage.getItem('pendingEmail');
    if (!pendingEmail) {
        alert('No email found. Start over.');
        window.location.href = 'pages/register.html';
        return;
    }

    // Pre-fill email if needed (display only)
    document.getElementById('emailDisplay') ? document.getElementById('emailDisplay').textContent = pendingEmail : null;

    const form = document.getElementById('formForm');
    const errorDiv = document.getElementById('error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || password.length < 6) {
            errorDiv.textContent = 'Username required; password min 6 chars.';
            errorDiv.className = 'error';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail, username, password })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Registered! Check email for 6-digit code.');
                window.location.href = 'pages/check.html';
            } else {
                errorDiv.textContent = data.error || 'Registration failed.';
                errorDiv.className = 'error';
            }
        } catch (err) {
            errorDiv.textContent = 'Network error.';
            errorDiv.className = 'error';
            console.error(err);
        }
    });
});