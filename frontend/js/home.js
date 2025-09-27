// Home page: Dashboard, fetch user and homepage content

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch user
    const user = await apiFetch('/api/users/me');
    document.getElementById('username').textContent = user.username;
    if (user.profile_pic) {
      document.getElementById('profile-pic').src = user.profile_pic;
    }

    // Fetch homepage content
    const content = await apiFetch('/api/homepage');
    content.forEach(item => {
      const section = document.getElementById(item.section);
      if (section) section.innerHTML = item.content;
    });
  } catch (err) {
    // Auth check in main.js handles redirect
    console.error(err);
  }
});