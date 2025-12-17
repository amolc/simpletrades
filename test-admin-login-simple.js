/**
 * Simple test script for admin login API functionality
 * This script tests the login API endpoint to ensure it returns a token
 */

// Use native fetch in Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  adminEmail: 'admin@demo.com',
  adminPassword: 'admin123' // Default admin password from createAdmin.js
};

async function testAdminLoginAPI() {
  console.log('=== Testing Admin Login API ===');
  
  try {
    console.log('Attempting login with credentials:', TEST_CONFIG.adminEmail);
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/users/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: TEST_CONFIG.adminEmail, 
        password: TEST_CONFIG.adminPassword 
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('✗ FAIL: Login failed with status', response.status);
      console.error('Error details:', errorData);
      return false;
    }
    
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
    // Handle both old format ({token}) and new format ({success: true, data: {token}})
    const token = responseData.token || (responseData.data && responseData.data.token);
    
    if (!token) {
      console.error('✗ FAIL: No token received in response');
      return false;
    }
    
    console.log('✓ PASS: Received token from server');
    console.log('Token (first 20 chars):', responseData.token.substring(0, 20) + '...');
    
    // Test token structure
    if (typeof responseData.token !== 'string') {
      console.error('✗ FAIL: Token is not a string');
      return false;
    }
    
    if (responseData.token.length < 10) {
      console.error('✗ FAIL: Token is too short');
      return false;
    }
    
    console.log('✓ PASS: Token structure is valid');
    
    console.log('\n=== API Test Passed! ===');
    console.log('The admin login API is working correctly and returning tokens.');
    console.log('\nNext steps:');
    console.log('1. Verify that the frontend JavaScript can store this token in localStorage');
    console.log('2. Check browser console for any errors during login');
    console.log('3. Ensure no browser extensions are blocking localStorage');
    
    return true;
    
  } catch (error) {
    console.error('✗ FAIL: Test error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testAdminLoginAPI().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testAdminLoginAPI };