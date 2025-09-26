document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    let email = localStorage.getItem('tempEmail') || urlParams.get('email');
    if (!email) window.location.href = 'register.html';

    const form = document.getElementById('check-form');
    const message = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('code').value;
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const data = await response.json();
            if (response.ok) {
                setToken(data.token);
                localStorage.setItem('tempEmail', email);  // Pass to form.html
                window.location.href = 'form.html';
            } else {
                message.innerHTML = '<p class="error">' + data.message + '</p>';
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Error: ' + err.message + '</p>';
        }
    });
});