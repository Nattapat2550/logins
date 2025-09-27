document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const isGoogle = urlParams.get('google') === 'true';
    if (email) {
        document.getElementById('emailDisplay').textContent = `Email: ${email}`;
    }
    if (isGoogle) {
        document.getElementById('passwordInput').closest('div')?.style.display = 'none'; // Hide password if Google
        document.getElementById('confirmPasswordInput').closest('div')?.style.display = 'none';
    }

    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const confirmInput = document.getElementById('confirmPasswordInput');
    const completeBtn = document.getElementById('completeBtn');

    function validateUsername(username) {
        const trimmed = username.trim();
        return trimmed.length >= 3 && trimmed.length <= 30 && /^[a-zA-Z0-9._-]+$/.test(trimmed) && !/^\s|\s$/.test(trimmed);
    }

    function validatePassword(password) {
        return password.length >= 8 && /(?=.*[a-zA-Z])(?=.*[0-9])/.test(password);
    }

    completeBtn.addEventListener('click', async () => {
        const username = usernameInput.value;
        let password = passwordInput.value;
        const confirm = confirmInput.value;
        if (!validateUsername(username)) {
            showMessage('Username: 3-30 chars, letters/numbers/._-, no spaces.', 'error');
            return;
        }
        if (!isGoogle && password) {
            if (!validatePassword(password)) {
                showMessage('Password: 8+ chars with at least one letter and number.', 'error');
                return;
            }
            if (password !== confirm) {
                showMessage('Passwords do not match.', 'error');
                return;
            }
        }
        try {
            completeBtn.disabled = true;
            const body = { email, username };
            if (!isGoogle) body.password = password;
            const data = await apiFetch('/api/auth/complete-profile', { method: 'POST', body });
            showMessage(data.message, 'success');
            const redirect = data.data?.redirect || '/home.html';
            window.location.href = redirect;
        } catch (err) {
            // Handled in apiFetch
        } finally {
            completeBtn.disabled = false;
        }
    });
});