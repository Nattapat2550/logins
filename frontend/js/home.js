document.addEventListener('DOMContentLoaded', async () => {
    // Load user without immediate redirect for debug
    const user = await loadUser  (false);  // Set to true after fixing
    if (!user) {
        console.log('User  load failed, redirecting manually');
        window.location.href = '/login.html';
        return;
    }
    // Update welcome message
    const welcomeEl = document.getElementById('welcome');
    if (welcomeEl) welcomeEl.textContent = `Hello, ${user.username || user.email}!`;
    // Load homepage content
    try {
        const content = await apiFetch('/homepage/');
        const contentEl = document.getElementById('homepage-content');
        if (contentEl) {
            contentEl.innerHTML = content.content_text || 'Welcome to the home page!';
            if (content.content_image) {
                contentEl.innerHTML += `<br><img src="${content.content_image}" alt="Homepage Image" style="max-width:100%; margin-top:10px;">`;
            }
        }
    } catch (err) {
        console.error('Homepage content load failed:', err);
    }
});