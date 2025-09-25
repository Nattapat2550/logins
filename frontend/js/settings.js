// Load Profile: Fetch and populate form
async function loadProfile() {
    try {
        const profile = await apiGet('/api/user/profile');
        document.getElementById('email').value = profile.email;
        document.getElementById('username').value = profile.username;
                if (profile.avatar) {
            document.getElementById('currentAvatar').src = `${window.location.origin}${profile.avatar}`;
            document.getElementById('currentAvatar').style.display = 'inline';
        }
        showMessage('Profile loaded', 'success');
    } catch (err) {
        showMessage('Error loading profile: ' + err.message, 'error');
    }
}

// Update Profile: PUT to backend
async function updateProfile(username, email) {
    try {
        showMessage('Updating profile...', 'success');
        await apiPut('/api/user/profile', { username, email });
        showMessage('Profile updated successfully!', 'success');
        // Reload profile to reflect changes
        setTimeout(loadProfile, 1000);
    } catch (err) {
        showMessage('Update failed: ' + err.message, 'error');
    }
}

// Upload Avatar: POST FormData
async function uploadAvatar() {
    const fileInput = document.getElementById('avatarInput');
    const file = fileInput.files[0];
    if (!file) return showMessage('Select an image file', 'error');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        showMessage('Uploading avatar...', 'success');
        const res = await fetch(`${window.location.origin}/api/user/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        document.getElementById('currentAvatar').src = `${window.location.origin}${data.avatar}`;
        document.getElementById('currentAvatar').style.display = 'inline';
        document.getElementById('avatarPreview').style.display = 'none';
        fileInput.value = '';  // Reset input
        showMessage('Avatar uploaded successfully!', 'success');
    } catch (err) {
        showMessage('Upload failed: ' + err.message, 'error');
    }
}

// Change Password: PUT to backend
async function changePassword(currentPassword, newPassword) {
    try {
        showMessage('Changing password...', 'success');
        await apiPut('/api/user/password', { currentPassword, newPassword });
        showMessage('Password changed successfully!', 'success');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
    } catch (err) {
        showMessage('Password change failed: ' + err.message, 'error');
    }
}

// Export globals
window.loadProfile = loadProfile;
window.updateProfile = updateProfile;
window.uploadAvatar = uploadAvatar;
window.changePassword = changePassword;