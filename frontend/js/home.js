document.addEventListener('DOMContentLoaded', async () => {
    console.log('home.html loaded, starting user load...');  // Debug: Entry point
    // Load user without immediate redirect for debug (set to true after fixing)
    const user = await loadUser  (false);

    console.log('home.js: User loaded successfully, updating UI');  // Debug

    // Update welcome message
    const welcomeEl = document.getElementById('welcome');
    if (welcomeEl) welcomeEl.textContent = `Hello, ${user.username || user.email}!`;

    // Load homepage content
    try {
        console.log('home.js: Loading homepage content...');
        const content = await apiFetch('/homepage/');
        const contentEl = document.getElementById('homepage-content');
        if (contentEl) {
            contentEl.innerHTML = content.content_text || 'Welcome to the home page!';
            if (content.content_image) {
                contentEl.innerHTML += `<br><img src="${content.content_image}" alt="Homepage Image" style="max-width:100%; margin-top:10px;">`;
            }
            console.log('home.js: Content loaded successfully');
        }
    } catch (err) {
        console.error('home.js: Homepage content load failed:', err);
    }
});