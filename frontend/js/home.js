document.addEventListener('DOMContentLoaded', () => {
    async function loadHome() {
        try {
            const [userRes, contentRes] = await Promise.all([
                apiFetch('/api/users/me'),
                apiFetch('/api/homepage/content')
            ]);
            const user = userRes.data;
            const content = contentRes.data.content;
            document.getElementById('welcome').textContent = `Welcome, ${user.username}!`;
            document.getElementById('homepageContent').innerHTML = `<p>${content}</p>`;
        } catch (err) {
            showMessage('Failed to load home content.', 'error');
            window.location.href = '/login.html';
        }
    }
    loadHome();
});