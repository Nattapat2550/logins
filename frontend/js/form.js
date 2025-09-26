document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) window.location.href = 'login.html';

    const urlParams = new URLSearchParams(window.location.search);
    const googleUsername = urlParams.get('username');
    const tempEmail = localStorage.getItem('tempEmail') || urlParams.get('email');
    const isGoogle = urlParams.get('isGoogle') === 'true';  // FIXED: Detect from URL param
    console.log('form.js: isGoogle?', isGoogle, 'tempEmail:', tempEmail, 'googleUsername:', googleUsername);  // Debug

    // Prefill username if Google or from params
    const usernameField = document.getElementById('username');
    if (googleUsername || urlParams.get('username')) {
        const prefill = googleUsername || urlParams.get('username');
        usernameField.value = prefill;
        usernameField.readOnly = isGoogle;  // FIXED: Read-only for Google (already set in DB)
    }

    // Hide password for Google (optional)
    const passwordField = document.getElementById('password');
    if (isGoogle) {
        passwordField.placeholder = 'Password (optional for Google)';
        // Don't hide field, but make optional
    } else if (passwordField) {
        passwordField.style.display = 'block';  // Show for email flow
    }

    const form = document.getElementById('form-form');
    const message = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        let password = document.getElementById('password') ? document.getElementById('password').value.trim() : null;

        // For Google: Username optional (prefilled/read-only), password optional
        if (!isGoogle && (!username || username.length < 2)) {
            return message.innerHTML = '<p class="error">Username (min 2 chars) required</p>';
        }
        if (password && password.length < 6) {
            return message.innerHTML = '<p class="error">Password must be at least 6 chars</p>';
        }

        try {
            console.log('Frontend: Completing profile for email:', tempEmail, 'isGoogle:', isGoogle);  // Debug
            const response = await fetch(`${BACKEND_URL}/api/auth/complete`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: tempEmail, username: username || null, password: password || null })  // FIXED: Nulls OK for Google
            });
            const data = await response.json();
            console.log('Frontend: Complete response:', data);  // Debug
            if (response.ok) {
                setToken(data.token);  // Update token
                localStorage.removeItem('tempEmail');
                window.location.href = data.redirect || '/home.html';
            } else {
                message.innerHTML = '<p class="error">' + data.message + '</p>';
                console.error('Frontend: Complete failed:', data.message);
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Error: ' + err.message + '</p>';
            console.error('Frontend: Complete fetch error:', err);
        }
    });
});