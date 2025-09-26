// Import helper from main.js (assuming it's global; if not, define here)
const getProtectedUrl = window.getProtectedUrl || ((path) => `/api${path.startsWith('/') ? path : `/${path}`}`);

document.addEventListener('DOMContentLoaded', () => {
    console.log('home.html loaded, starting user load...');

    // Use .then() for better async control
    loadUser   (false)
        .then((user) => {
            console.log('home.js: loadUser   promise resolved with user:', user ? 'exists' : 'null');
            if (!user || !user.email) {  // Strict check: No null access
                console.error('home.js: Invalid or missing user data, redirecting to login');
                window.location.href = '/login.html';
                return;  // Exit: No UI updates if invalid
            }

            console.log('home.js: User loaded successfully, updating UI');

            // Safe UI updates: user is validated
            const welcomeEl = document.getElementById('welcome');
            if (welcomeEl) {
                welcomeEl.textContent = `Hello, ${user.username || user.email}!`;  // Safe: user exists
                console.log('home.js: Welcome message set');
            } else {
                console.warn('home.js: #welcome element not found');
            }

            // Load homepage content (now with /api prefix)
            loadHomepageContent();
        })
        .catch((err) => {
            console.error('home.js: loadUser   promise rejected:', err);
            window.location.href = '/login.html';
        });

    // Separate function for content (fixed URL)
    function loadHomepageContent() {
        apiFetch(getProtectedUrl('homepage/'))  // Fixed: /api/homepage/
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