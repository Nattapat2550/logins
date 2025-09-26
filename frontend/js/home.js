async function loadHomeData() {
  const role = await mainUtils.checkAuth();
  if (!role) return;  // Redirects if unauth

  const container = document.getElementById('userInfo');
  const welcome = document.getElementById('welcome');
  if (!container || !welcome) return;

  try {
    const data = await mainUtils.apiCall('/api/homepage');
    welcome.textContent = data.message;

    document.getElementById('username').textContent = data.user.username;
    document.getElementById('email').textContent = data.user.email;
    document.getElementById('role').textContent = `Role: ${data.user.role}`;
    document.getElementById('joined').textContent = `Joined: ${new Date(data.user.joinedAt).toLocaleDateString()}`;

    const profilePic = document.getElementById('profilePic');
    profilePic.src = data.user.profilePic || 'images/user.png';
    profilePic.onerror = () => { profilePic.src = 'images/user.png'; };

    // Show admin link if admin
    const adminLink = document.getElementById('adminLink');
    if (adminLink && role === 'admin') {
      adminLink.classList.remove('hidden');
    }
  } catch (error) {
    // Error shown by apiCall (e.g., 500 → "Failed to load dashboard")
    document.getElementById('welcome').textContent = 'Error loading dashboard. Try refreshing.';
  }
}