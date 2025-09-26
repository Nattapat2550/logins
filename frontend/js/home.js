document.addEventListener('DOMContentLoaded', () => {
    console.log('home.html loaded, starting user load...');  // Debug: Entry point

    // Safe fallback for getProtectedUrl (assignment only, no const to avoid "already declared" error)
    if (typeof window.getProtectedUrl !== 'function') {
        window.getProtectedUrl = (path) => {
            if (path.startsWith('/api/')) return path;
            return `/api${path.startsWith('/') ? path : `/${path}`}`;
        };
        console.log('home.js: Assigned fallback getProtectedUrl (global was missing)');
    } else {
        console.log('home.js: Using global getProtectedUrl from main.js');
    }

    // Use .then() for better async control (prevents race conditions and uncaught promise errors)
    loadUser (false)  // false = no auto-redirect for debug; change to true later
        .then((user) => {
            console.log('home.js: loadUser  promise resolved with user:', user ? 'exists' : 'null');  // Debug
            if (!user || !user.email) {  // Strict check: Ensure user has email (no null access)
                console.error('home.js: Invalid or missing user data, redirecting to login');
                window.location.href = '/login.html';
                return;  // Exit early: No UI updates if invalid
            }

            console.log('home.js: User loaded successfully, updating UI');  // Debug

            // Safe UI updates: user is validated above, elements checked
            const welcomeEl = document.getElementById('welcome');
            if (welcomeEl) {
                welcomeEl.textContent = `Hello, ${user.username || user.email}!`;  // Safe: user exists
                console.log('home.js: Welcome message set');  // Debug
            } else {
                console.warn('home.js: #welcome element not found in HTML');
            }

            // Load homepage content (independent, but after user load)
            loadHomepageContent();
        })
        .catch((err) => {
            console.error('home.js: loadUser  promise rejected:', err);  // Catch any unhandled errors
            window.location.href = '/login.html';
        });

    // Separate function for homepage content (uses /api prefix via helper)
    function loadHomepageContent() {
        console.log('home.js: Loading homepage content...');  // Debug
        apiFetch(window.getProtectedUrl('homepage/'))  // Fixed: /api/homepage/
            .then((content) => {
                const contentEl = document.getElementById('homepage-content');
                if (contentEl) {
                    contentEl.innerHTML = content.content_text || 'Welcome to the home page!';
                    if (content.content_image) {
                        contentEl.innerHTML += `<br><img src="${content.content_image}" alt="Homepage Image" style="max-width:100%; margin-top:10px;">`;
                    }
                    console.log('home.js: Content loaded successfully');  // Debug
                } else {
                    console.warn('home.js: #homepage-content element not found in HTML');
                }
            })
            .catch((err) => {
                console.error('home.js: Homepage content load failed:', err);
                // Fallback UI if content fails
                const contentEl = document.getElementById('homepage-content');
                if (contentEl) {
                    contentEl.innerHTML = 'Welcome to the home page! (Content load error)';
                }
            });
    }
});