document.addEventListener('DOMContentLoaded', () => {
    const requestForm = document.getElementById('reset-request');
    const resetForm = document.getElementById('reset-form');
    const message = document.getElementById('message');
    let resetEmail = '';

    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetEmail = document.getElementById('email').value;
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await response.json();
            if (response.ok) {
                message.innerHTML = '<p class="success">' + data.message + '</p>';
                requestForm.style.display = 'none';
                resetForm.style.display = 'block';
            } else {
                message.innerHTML = '<p class="error">' + data.message + '</p>';
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Error: ' + err.message + '</p>';
        }
    });

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('code').value;
        const newPassword = document.getElementById('new-password').value;
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail, code, newPassword })
            });
            const data = await response.json();
            if (response.ok) {
                message.innerHTML = '<p class="success">' + data.message + '</p>';
                setTimeout(() => window.location.href = data.redirect, 2000);
            } else {
                message.innerHTML = '<p class="error">' + data.message + '</p>';
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Error: ' + err.message + '</p>';
        }
    });
});