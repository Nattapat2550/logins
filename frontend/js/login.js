function togglePassword() {
    const password = document.getElementById('password');
    password.type = password.type === 'password' ? 'text' : 'password';
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const message = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                setToken(data.token);
                window.location.href = data.redirect;
            } else {
                message.innerHTML = '<p class="error">' + data.message + '</p>';
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Error: ' + err.message + '</p>';
        }
    });

    // Google button
    const googleBtn = document.getElementById('google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', googleOAuthRedirect);
    }
});