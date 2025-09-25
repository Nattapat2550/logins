// Toggle dark mode (called from common.js or button)
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark);
  // Optional: Save to backend if needed
  window.common.apiCall('/user/dark-mode', { method: 'POST' }).catch(() => {}); // Ignore errors
}

// Export
window.toggleDarkMode = toggleDarkMode;