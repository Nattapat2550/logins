document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || localStorage.getItem('token');
  const userStr = urlParams.get('user') || localStorage.getItem('user');

  if (token && userStr) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', userStr);
    const user = JSON.parse(decodeURIComponent(userStr));
    redirectByRole(user.role);
  } else {
    // If no params, perhaps redirect to login
    window.location.href = '/login';
  }

  function redirectByRole(role) {
    if (role === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/home';
    }
  }
});