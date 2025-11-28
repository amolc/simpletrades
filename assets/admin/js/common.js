document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (!path.startsWith('/admin/login')) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
    });
  }
});
