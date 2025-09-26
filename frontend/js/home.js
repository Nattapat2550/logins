document.addEventListener('DOMContentLoaded', () => {
    console.log('home.html loaded, starting user load...');  // Debug

    // Use .then() for better async control (prevents race conditions)
    loadUser  (false)
        .then((user) => {
            console.log('home.js: loadUser  promise resolved with user:', user ? 'exists' : 'null');  // Debug
            if (!user || !user.email) {  // Stricter check: Ensure user has email (basic validation)
                console.error('home.js: Invalid or missing user data, redirecting to login');
                window.location.href = '/login.html';
                return;  // Exit early, no UI updates
            }

            console.log('home.js: User loaded successfully, updating UI');  // Debug

            // Safe UI updates: Check elements exist
            const welcomeEl = document.getElementById('welcome');
            if (welcomeEl) {
                // Safe access: user is validated above
                welcomeEl.textContent = `Hello, ${user.username || user.email}!`;
                console.log('home.js: Welcome message set');  // Debug
            } else {
                console.warn('home.js: #welcome element not found');
            }

            // Load homepage content (independent of user)
            loadHomepageContent();
        })
        .catch((err) => {
            console.error('home.js: loadUser  promise rejected:', err);  // Catch any unhandled errors
            window.location.href = '/login.html';
        });

    // Separate function for content (runs even if user fails, but won't in practice)
    function loadHomepageContent() {
        apiFetch('/homepage/')
            .then((content) => {
                const contentEl = document.getElementById('homepage-content');
                if (contentEl) {
                    contentEl.innerHTML = content.content_text || 'Welcome to the home page!';
                    if (content.content_image) {
                        contentEl.innerHTML += `<br><img src="${content.content_image}" alt="Homepage Image" style="max-width:100%; margin-top:10px;">`;
                    }
                    console.log('home.js: Content loaded successfully');
                }
            })
            .catch((err) => {
                console.error('home.js: Homepage content load failed:', err);
            });
    }
});