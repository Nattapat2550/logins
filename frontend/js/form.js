document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) window.location.href = 'login.html';

    const urlParams = new URLSearchParams(window.location.search);
    const googleUsername = urlParams.get('username');
    const tempEmail = localStorage.getItem('tempEmail') || urlParams.get('email');
    const isGoogle = !!googleUsername;  // Detect Google flow

    if (googleUsername) {
        document.getElementById('username').value = googleUsername;
        // Hide password for Google
        const passwordField = document.getElementById('password');
        if (passwordField) passwordField.style.display = 'none';
    }

    const form = document.getElementById('form-form');
    const message = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        let password = document.getElementById('password') ? document.getElementById('password').value : null;
        if (isGoogle && !password) password = null;  // No password for Google

        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/complete`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: tempEmail, username, password })
            });
            const data = await response.json();
            if (response.ok) {
                setToken(data.token);  // Update token
                localStorage.removeItem('tempEmail');
                window.location.href = data.redirect;
            } else {
                message.innerHTML = '<p class="error">' + data.message + '</p>';
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Error: ' + err.message + '</p>';
        }
    });
});