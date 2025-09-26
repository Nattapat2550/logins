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
            console.log('Frontend: Submitting login for', email);  // Debug
            const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            console.log('Frontend: Login response:', data);  // Debug: Full response
            if (response.ok) {
                console.log('Frontend: Storing token of length', data.token.length);  // Debug
                setToken(data.token);
                console.log('Frontend: Token stored, localStorage now has:', localStorage.getItem('token') ? 'token' : 'no token');  // Verify storage
                console.log('Frontend: Redirecting to', data.redirect);  // Debug
                window.location.href = data.redirect;
            } else {
                message.innerHTML = '<p class="error">' + data.message + '</p>';
                console.error('Frontend: Login failed:', data.message);
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Error: ' + err.message + '</p>';
            console.error('Frontend: Login fetch error:', err);
        }
    });

    // Google button (unchanged)
    const googleBtn = document.getElementById('google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', googleOAuthRedirect);
    }
});