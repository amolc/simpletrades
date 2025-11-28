document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('adminToken')) {
    window.location.href = '/admin/dashboard';
    return;
  }
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const response = await fetch('/api/users/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('adminToken', token);
        window.location.href = '/admin/dashboard';
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      alert('An error occurred during login');
    }
  });
});
