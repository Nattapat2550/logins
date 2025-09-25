function initDarkMode() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  document.body.className = isDark ? 'dark' : 'light';
  const toggleBtn = document.getElementById('darkModeToggle');
  if (toggleBtn) toggleBtn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}
function toggleDarkMode() {
  const isDark = document.body.className === 'dark';
  const newMode = !isDark;
  document.body.className = newMode ? 'dark' : 'light';
  localStorage.setItem('darkMode', newMode);
  const toggleBtn = document.getElementById('darkModeToggle');
  if (toggleBtn) toggleBtn.textContent = newMode ? '☀️ Light Mode' : '🌙 Dark Mode';
}
if (typeof module !== 'undefined') module.exports = { initDarkMode, toggleDarkMode };