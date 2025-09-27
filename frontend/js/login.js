document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const rememberCheckbox = document.getElementById('rememberCheckbox');
    const hideCheckbox = document.getElementById('hidePasswordCheckbox');
    const loginBtn = document.getElementById('loginBtn');
    const googleBtn = document.getElementById('googleBtn');

    // Toggle password visibility
    hideCheckbox.addEventListener('change', () => {
        passwordInput.type = hideCheckbox.checked ? 'text' : 'password';
    });

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
    }

    function validatePassword(password) {
        return password.length >= 8;
    }

    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const remember = rememberCheckbox.checked;
        if (!validateEmail(email) || !validatePassword(password)) {
            showMessage('Valid email and password required.', 'error');
            return;
        }
        try {
            loginBtn.disabled = true;
            const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password, remember } });
            showMessage(data.message, 'success');
            const redirect = data.data?.redirect || '/home.html';
            window.location.href = redirect;
        } catch (err) {
            // Handled
        } finally {
            loginBtn.disabled = false;
        }
    });

    googleBtn.addEventListener('click', () => {
        const remember = rememberCheckbox.checked ? 'true' : 'false';
        window.location.href = `${BACKEND_URL}/api/auth/google?remember=${remember}`;
    });
});