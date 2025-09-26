async function loadSettingsData() {
  const role = await mainUtils.checkAuth();
  if (!role) return;  // Redirects if unauth

  const form = document.getElementById('settingsForm');
  if (!form) return;

  try {
    const data = await mainUtils.apiCall('/api/users/profile');

    // Populate form
    document.getElementById('username').value = data.username || '';
    const preview = document.getElementById('profilePreview');
    if (data.profilePic) {
      preview.src = data.profilePic;
      preview.classList.remove('hidden');
    }

    // Profile pic preview on change
    const fileInput = document.getElementById('profilePic');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
      } else {
        preview.src = data.profilePic || 'images/user.png';
      }
    });

    // Update form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const file = fileInput.files[0];
      const button = form.querySelector('button');
      button.disabled = true;
      button.textContent = 'Updating...';

      if (!username || username.length < 3) {
        mainUtils.showAlert('Username required (min 3 chars)', 'error');
        button.disabled = false;
        button.textContent = 'Update Profile';
        return;
      }

      try {
        const formData = new FormData();
        formData.append('username', username);
        if (file) formData.append('profilePic', file);

        const updateData = await mainUtils.apiCall('/api/users/profile', {
          method: 'PUT',
          body: formData
        });

        mainUtils.showAlert('Profile updated successfully!', 'success');
        preview.src = updateData.profilePic || 'images/user.png';
        preview.classList.remove('hidden');
      } catch (error) {
        // Error shown by apiCall (e.g., "Username already taken")
      } finally {
        button.disabled = false;
        button.textContent = 'Update Profile';
      }
    });
  } catch (error) {
    // Error shown by apiCall (e.g., 500 → "Failed to fetch profile")
    mainUtils.showAlert('Failed to load profile. Try again.', 'error');
  }
}