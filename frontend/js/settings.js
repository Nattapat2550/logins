document.addEventListener('DOMContentLoaded', () => {
    console.log('settings.html loaded, starting user load...');  // Debug

    // Safe fallback for getProtectedUrl (assignment only, no const to avoid conflicts)
    if (typeof window.getProtectedUrl !== 'function') {
        window.getProtectedUrl = (path) => {
            if (path.startsWith('/api/')) return path;
            return `/api${path.startsWith('/') ? path : `/${path}`}`;
        };
        console.log('settings.js: Assigned fallback getProtectedUrl');
    } else {
        console.log('settings.js: Using global getProtectedUrl from main.js');
    }

    // Load current user profile first (for pre-filling form)
    loadUser  (false)
        .then((user) => {
            console.log('settings.js: loadUser   resolved with user:', user ? 'exists' : 'null');
            if (!user || !user.email) {
                console.error('settings.js: Invalid user, redirecting to login');
                window.location.href = '/login.html';
                return;
            }

            console.log('settings.js: User loaded, pre-filling form');
            prefillForm(user);
            loadSettingsContent();  // Load any settings-specific content if needed
        })
        .catch((err) => {
            console.error('settings.js: loadUser   failed:', err);
            window.location.href = '/login.html';
        });

    // Prefill form with current user data
    function prefillForm(user) {
        const usernameEl = document.getElementById('username');
        if (usernameEl) usernameEl.value = user.username || '';

        const emailEl = document.getElementById('email');
        if (emailEl) emailEl.value = user.email;

        const profilePicEl = document.getElementById('current-profile-pic');
        if (profilePicEl && user.profilePic) {
            const picSrc = user.profilePic && user.profilePic !== 'user.png' 
                ? `${BACKEND_URL}/uploads/${user.profilePic}` 
                : '/images/user.png';
            profilePicEl.src = picSrc;
            profilePicEl.alt = user.username || 'Profile';
        }

        console.log('settings.js: Form pre-filled');
    }

    // Handle settings form submit (update profile: username, email, password, profile pic)
    const form = document.getElementById('settings-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const messageEl = document.getElementById('message') || document.createElement('div');  // For success/error
            messageEl.innerHTML = '';  // Clear previous

            const formData = new FormData(form);  // Handles file upload (profile pic)
            const username = formData.get('username');
            const email = formData.get('email');
            const password = formData.get('password');
            const profilePicFile = formData.get('profilePic');

            try {
                console.log('settings.js: Updating profile for email:', email);  // Debug
                const updateData = {};
                if (username) updateData.username = username;
                if (email && email !== getUserEmail()) updateData.email = email;  // Avoid self-update loop
                if (password) updateData.password = password;

                let response;
                if (profilePicFile && profilePicFile.size > 0) {
                    // Upload with file (FormData)
                    formData.append('username', updateData.username || '');
                    formData.append('email', updateData.email || '');
                    formData.append('password', updateData.password || '');
                    response = await apiFetch(window.getProtectedUrl('users/profile'), {  // Fixed: /api prefix
                        method: 'PUT',
                        body: formData
                    });
                } else {
                    // No file: JSON body
                    response = await apiFetch(window.getProtectedUrl('users/profile'), {  // Fixed: /api prefix
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                }

                console.log('settings.js: Profile updated successfully:', response);  // Debug
                messageEl.innerHTML = '<p class="success">Profile updated successfully!</p>';

                // Refresh user in navbar (if present)
                loadUser  ();  // Re-load to update UI (e.g., navbar username/pic)

                // Redirect or stay (optional: window.location.href = '/home.html';)
            } catch (err) {
                console.error('settings.js: Profile update failed:', err);
                messageEl.innerHTML = `<p class="error">Update failed: ${err.message}</p>`;
            }
        });
    } else {
        console.warn('settings.js: #settings-form not found in HTML');
    }

    // Handle delete account button
    const deleteBtn = document.getElementById('delete-account');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure? This will delete your account permanently.')) return;

            try {
                console.log('settings.js: Deleting account...');  // Debug
                await apiFetch(window.getProtectedUrl('users/profile'), {  // Fixed: /api prefix
                    method: 'DELETE'
                });
                console.log('settings.js: Account deleted successfully');
                removeToken();
                window.location.href = '/index.html';  // Or register page
            } catch (err) {
                console.error('settings.js: Delete failed:', err);
                alert(`Delete failed: ${err.message}`);
            }
        });
    }

    // Optional: Load settings-specific content (e.g., API call if needed)
    function loadSettingsContent() {
        // Placeholder: Add if you have settings-specific data (e.g., apiFetch('/api/settings/'))
        console.log('settings.js: Settings content loaded (if any)');
    }

    // Helper: Get current user email (from localStorage or form)
    function getUserEmail() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');  // Optional: Cache user in localStorage after loadUser 
        return user.email || document.getElementById('email')?.value || '';
    }
});