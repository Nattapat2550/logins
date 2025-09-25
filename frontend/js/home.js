document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return; // main.js handles redirect

  try {
    const res = await apiCall('/homepage');
    document.getElementById('homepageContent').innerHTML = `<p>${res.content}</p>`;
  } catch (err) {
    document.getElementById('homepageContent').textContent = 'Error loading content';
  }
});