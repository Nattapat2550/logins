const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();

    const pendingEmail = sessionStorage.getItem('pendingEmail');
    if (!pendingEmail) {
        alert('No pending verification. Start over.');
        window.location.href = 'pages/register.html';
        return;
    }

    const form = document.getElementById('checkForm');
    const errorDiv = document.getElementById('error');
    const codeInput = document.getElementById('code');

    // Auto-format code input (digits only)
    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = codeInput.value.trim();

        if (code.length !== 6) {
            errorDiv.textContent = 'Enter 6-digit code.';
            errorDiv.className = 'error';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingEmail, code })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                sessionStorage.removeItem('pendingEmail');
                alert('Verified successfully!');
                window.location.href = 'pages/home.html';
            } else {
                errorDiv.textContent = data.error || 'Invalid code.';
                errorDiv.className = 'error';
            }
        } catch (err) {
            errorDiv.textContent = 'Network error.';
            errorDiv.className = 'error';
            console.error(err);
        }
    });
});