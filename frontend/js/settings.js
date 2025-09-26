document.addEventListener('DOMContentLoaded', async () => {
    await loadUser ();

    const user = await loadUser ();  // Already called, but get data
    const form = document.getElementById('profile-form');
    const message = document.getElementById('message');

    // Prefill form
    document.getElementById('username').value = user.username || '';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('new-password') ? document.getElementById('new-password').value : null;
        const file = document.getElementById('profile-pic-upload').files[0];

        const formData = new FormData();
        formData.append('username', username);
        if (password) formData.append('password', password);
        if (file) formData.append('profilePic', file);

        try {
            const updatedUser  = await apiFetch('/users/profile', {
                method: 'PUT',
                body: formData
            });
            message.innerHTML = '<p class="success">Profile updated!</p>';
            // Update profile pic in navbar
            const profilePic = document.getElementById('profile-pic');
            if (profilePic) {
                profilePic.src = updatedUser .profilePic.startsWith('http') ? updatedUser .profilePic : '/images/' + updatedUser .profilePic;
            }
        } catch (err) {
            message.innerHTML = '<p class="error">Update failed: ' + err.message + '</p>';
        }
    });
});

async function deleteAccount() {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
        await apiFetch('/users/profile', { method: 'DELETE' });
        alert('Account deleted successfully.');
        logout();
    } catch (err) {
        alert('Deletion failed: ' + err.message);
    }
}