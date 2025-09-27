document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('settingsUsername');
    const passwordInput = document.getElementById('passwordInput');
    const avatarInput = document.getElementById('avatarInput');
    const currentAvatar = document.getElementById('currentAvatar');
    const themeToggle = document.getElementById('themeToggle');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const deleteBtn = document.getElementById('deleteAccountBtn');

    // Load current user
    async function loadUser () {
        try {
            const data = await apiFetch('/api/users/me');
            const user = data.data;
            usernameInput.value = user.username || '';
            if (user.profile_picture) {
                currentAvatar.src = user.profile_picture;
                currentAvatar.style.display = 'block';
            }
            themeToggle.checked = localStorage.getItem('theme') === 'dark';
        } catch (err) {
            window.location.href = '/login.html';
        }
    }

    // Theme toggle
    themeToggle.addEventListener('change', () => {
        toggleTheme();
    });

    // Save settings (separate calls for text and avatar per spec)
    saveBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        let hasChanges = false;

        // Validate
        if (username && (!/^[a-zA-Z0-9._-]+$/.test(username) || username.length < 3 || username.length > 30)) {
            showMessage('Username: 3-30 chars, letters/numbers/._-, no spaces.', 'error');
            return;
        }
        if (password && (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password))) {
            showMessage('Password: 8+ chars with letter and number.', 'error');
            return;
        }

        try {
            saveBtn.disabled = true;

            // PUT /api/users/me for username/password
            if (username || password) {
                const body = {};
                if (username) body.username = username;
                if (password) body.password = password;
                const updateData = await apiFetch('/api/users/me', { method: 'PUT', body });
                showMessage(updateData.message, 'success');
                hasChanges = true;
            }

            // POST /api/users/avatar if file
            if (avatarInput.files[0]) {
                const file = avatarInput.files[0];
                if (file.size > 2 * 1024 * 1024 || !/^image\/(jpeg|png)$/.test(file.type)) {
                    showMessage('Image: JPEG/PNG, max 2MB.', 'error');
                    return;
                }
                const formData = new FormData();
                formData.append('avatar', file);
                const avatarData = await fetch(`${BACKEND_URL}/api/users/avatar`, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
                const avatarRes = await avatarData.json();
                if (!avatarRes.success) throw new Error(avatarRes.error);
                showMessage(avatarRes.message, 'success');
                currentAvatar.src = avatarRes.data.profile_picture;
                currentAvatar.style.display = 'block';
                hasChanges = true;
            }

            if (hasChanges) {
                loadUser (); // Reload to reflect changes
            } else {
                showMessage('No changes to save.', 'error');
            }
        } catch (err) {
            showMessage(`Save failed: ${err.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
        }
    });

    // Delete account
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure? This deletes your account permanently.')) return;
        try {
            const data = await apiFetch('/api/users/me', { method: 'DELETE' });
            showMessage(data.message, 'success');
            window.location.href = data.data?.redirect || '/login.html';
        } catch (err) {
            showMessage(`Delete failed: ${err.message}`, 'error');
        }
    });

    loadUser ();
});