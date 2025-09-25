// Inject Navbar on all pages except index/login/register
if (!['index.html', 'login.html', 'register.html'].includes(window.location.pathname.split('/').pop())) {
  const navbar = document.createElement('nav');
  navbar.className = 'navbar';
  navbar.innerHTML = `
    <h1>Website Name</h1>
    <div>
      <a href="home.html">Home</a>
      <a href="about.html">About</a>
      <a href="contact.html">Contact</a>
      <a href="settings.html">Settings</a>
    </div>
    <div class="dropdown">
      <img id="accountPic" src="images/user.png" alt="Account" class="account-pic">
      <div class="dropdown-content">
        <a href="settings.html">Profile</a>
        <a href="#" id="logout">Logout</a>
      </div>
    </div>
  `;
  document.body.insertBefore(navbar, document.body.firstChild);
}

// Dark Mode Toggle
const toggleDarkMode = () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
};
if (localStorage.getItem('darkMode') === 'true') toggleDarkMode();
document.getElementById('themeToggle')?.addEventListener('click', toggleDarkMode);

// Logout
document.getElementById('logout')?.addEventListener('click', async () => {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
});

// Load Profile Pic and Username (if logged in)
const token = localStorage.getItem('token');
if (token) {
  fetch('/api/user/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(user => {
    if (user.username) document.querySelector('.navbar h1').textContent = user.username + "'s Site"; // Optional
    const pic = document.getElementById('accountPic');
    if (pic && user.avatar) {
      pic.src = user.avatar.startsWith('http') ? user.avatar : `/uploads/${user.avatar}`;
    }
  })
  .catch(() => localStorage.removeItem('token')); // Invalid token, logout
}