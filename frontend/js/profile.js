// Uses common.js
document.addEventListener('DOMContentLoaded', () => {
  const user = window.common.checkAuth();
  if (!user) return;

  window.common.renderNavbar(user);
  window.common.applyDarkMode();

  // Profile update form (if on settings)
  const updateForm = document.getElementById('update-profile');
  if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('username', document.getElementById('username').value);
      const fileInput = document.getElementById('profile-pic-upload');
      if (fileInput.files[0]) formData.append('profilePic', fileInput.files[0]);

      try {
        const updatedUser  = await window.common.apiCall('/user/profile', {
          method: 'PUT',
          body: formData
        });
        localStorage.setItem('user', JSON.stringify(updatedUser ));
        document.getElementById('success').classList.remove('hidden');
        document.getElementById('success').textContent = 'Profile updated';
        // Refresh pic
        window.location.reload();
      } catch (err) {
        document.getElementById('error').textContent = err.message;
      }
    });
  }

  // Delete account (if on settings)
  const deleteBtn = document.getElementById('delete-account');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Delete account? This is permanent.')) {
        try {
          await window.common.apiCall('/user/profile', { method: 'DELETE' });
          localStorage.clear();
          window.location.href = '/';
        } catch (err) {
          document.getElementById('error').textContent = err.message;
        }
      }
    });
  }
});