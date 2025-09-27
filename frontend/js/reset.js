document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const requestMode = document.getElementById('requestMode');
    const tokenMode = document.getElementById('tokenMode');

    if (token) {
        requestMode.style.display = 'none';
        tokenMode.style.display = 'block';
        // Token mode
        const passwordInput = document.getElementById('resetPassword');
        const confirmInput = document.getElementById('resetConfirmPassword');
        const confirmBtn = document.getElementById('resetConfirmBtn');

        function validatePassword(password) {
            return password.length >= 8 && /(?=.*[a-zA-Z])(?=.*[0-9])/.test(password);
        }

        confirmBtn.addEventListener('click', async () => {
            const password = passwordInput.value;
            const confirm = confirmInput.value;
            if (!validatePassword(password) || password !== confirm) {
                showMessage('Valid matching passwords required.', 'error');
                return;
            }
            try {
                confirmBtn.disabled = true;
                const data = await apiFetch('/api/auth/reset-password', { method: 'POST', body: { token, password } });
                showMessage(data.message, 'success');
                window.location.href = data.data?.redirect || '/login.html';
            } catch (err) {
                // Handled
            } finally {
                confirmBtn.disabled = false;
            }
        });
    } else {
        tokenMode.style.display = 'none';
        requestMode.style.display = 'block';
        // Request mode
        const emailInput = document.getElementById('resetEmail');
        const requestBtn = document.getElementById('resetRequestBtn');

        function validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
        }

        requestBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            if (!validateEmail(email)) {
                showMessage('Valid email required.', 'error');
                return;
            }
            try {
                requestBtn.disabled = true;
                const data = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } });
                showMessage(data.message, 'success');
            } catch (err) {
                // Handled
            } finally {
                requestBtn.disabled = false;
            }
        });
    }
});