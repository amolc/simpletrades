document.addEventListener('DOMContentLoaded', () => {
  console.log('Login page loaded, checking for existing token...');
  const existingToken = localStorage.getItem('adminToken');
  console.log('Existing token:', existingToken);
  
  if (existingToken) {
    console.log('Token found, redirecting to dashboard...');
    window.location.href = '/admin/dashboard';
    return;
  }
  
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Login attempt with email:', email);
    
    try {
      const response = await fetch('/api/users/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Login response data:', responseData);
        
        // Handle both old format ({token}) and new format ({success: true, data: {token}})
        const token = responseData.token || (responseData.data && responseData.data.token);
        
        if (token) {
          console.log('Setting token in localStorage:', token);
          localStorage.setItem('adminToken', token);
          
          // Verify the token was set
          const storedToken = localStorage.getItem('adminToken');
          console.log('Token stored in localStorage:', storedToken);
          
          if (storedToken) {
            window.location.href = '/admin/dashboard';
          } else {
            alert('Login successful but failed to store token. Please try again.');
          }
        } else {
          console.error('Login successful but no token received:', responseData);
          alert('Login successful but no token received. Please try again.');
        }
      } else {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        alert('Invalid credentials: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred during login: ' + error.message);
    }
  });
});
