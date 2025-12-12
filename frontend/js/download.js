// frontend/js/download.js
document.addEventListener('DOMContentLoaded', () => {
  const winBtn = document.getElementById('downloadWindows');
  const androidBtn = document.getElementById('downloadAndroid');

  if (winBtn) {
    winBtn.addEventListener('click', () => {
      // ใช้ API_BASE_URL จาก main.js เพื่อผูกกับ backend เดิม
      window.location.href = `${API_BASE_URL}/api/download/windows`;
    });
  }

  if (androidBtn) {
    androidBtn.addEventListener('click', () => {
      window.location.href = `${API_BASE_URL}/api/download/android`;
    });
  }
});
