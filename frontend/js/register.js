document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const emailInput = document.getElementById('emailInput');
    const registerBtn = document.getElementById('registerBtn');
    const googleBtn = document.getElementById('googleBtn');

    // Email validation (basic RFC)
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
    }

    registerBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!validateEmail(email)) {
            showMessage('Please enter a valid email.', 'error');
            return;
        }
        try {
            registerBtn.disabled = true;
            const data = await apiFetch('/api/auth/register', { method: 'POST', body: { email } });
            showMessage(data.message, 'success');
            window.location.href = `check.html?email=${encodeURIComponent(email)}`;
        } catch (err) {
            // Handled in apiFetch
        } finally {
            registerBtn.disabled = false;
        }
    });

    googleBtn.addEventListener('click', () => {
        window.location.href = `${BACKEND_URL}/api/auth/google?remember=false`;
    });
});