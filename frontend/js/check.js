document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) {
        document.getElementById('emailDisplay').textContent = `Sent to: ${email}`;
    }

    const codeInput = document.getElementById('codeInput');
    const verifyBtn = document.getElementById('verifyBtn');

    function validateCode(code) {
        return code.length === 6 && /^[0-9]{6}$/.test(code);
    }

    verifyBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (!validateCode(code) || !email) {
            showMessage('Enter a valid 6-digit code.', 'error');
            return;
        }
        try {
            verifyBtn.disabled = true;
            const data = await apiFetch('/api/auth/verify-code', { method: 'POST', body: { email, code } });
            showMessage(data.message, 'success');
            window.location.href = `form.html?email=${encodeURIComponent(email)}`;
        } catch (err) {
            // Handled
        } finally {
            verifyBtn.disabled = false;
        }
    });
});