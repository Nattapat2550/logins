document.addEventListener('DOMContentLoaded', async () => {
    await loadUser ();

    // Load homepage content
    try {
        const content = await apiFetch('/homepage/');
        const contentEl = document.getElementById('homepage-content');
        if (contentEl) contentEl.innerHTML = content.content_text || 'Welcome to the home page!';
        if (content.content_image) {
            contentEl.innerHTML += `<br><img src="${content.content_image}" alt="Homepage Image" style="max-width:100%;">`;
        }
    } catch (err) {
        console.error('Homepage content load failed:', err);
    }
});