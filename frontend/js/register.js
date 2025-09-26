document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const message = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                message.innerHTML = '<p class="success">' + data.message + '</p>';
                localStorage.setItem('tempEmail', email);  // For check.html
                setTimeout(() => window.location.href = 'check.html', 1500);
            } else {
                message.innerHTML = '<p class="error">' + data.message + '</p>';
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Error: ' + err.message + '</p>';
        }
    });

    // Google button
    const googleBtn = document.getElementById('google-register');
    if (googleBtn) {
        googleBtn.addEventListener('click', googleOAuthRedirect);
    }
});