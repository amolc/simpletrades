/**
 * Test script for frontend user login API functionality
 * This script tests the user login API endpoint to ensure it works correctly
 */

// Use native fetch in Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  phoneNumber: '1234567890',
  password: 'test123'
};

async function testFrontendLoginAPI() {
  console.log('=== Testing Frontend User Login API ===');
  
  try {
    console.log('Attempting login with phone:', TEST_CONFIG.phoneNumber);
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phoneNumber: TEST_CONFIG.phoneNumber, 
        password: TEST_CONFIG.password 
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
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
    
    // Test token structure
    if (typeof token !== 'string') {
      console.error('✗ FAIL: Token is not a string');
      return false;
    }
    
    if (token.length < 10) {
      console.error('✗ FAIL: Token is too short');
      return false;
    }
    
    console.log('✓ PASS: Token structure is valid');
    
    // Verify the token contains the expected parts (JWT format)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('✗ FAIL: Token does not have valid JWT format');
      return false;
    }
    
    console.log('✓ PASS: Token has valid JWT format');
    
    console.log('\n=== Frontend Login API Test Passed! ===');
    console.log('The user login API is working correctly and returning tokens.');
    console.log('\nFrontend login page should now work at:', TEST_CONFIG.baseUrl + '/login');
    console.log('Test credentials:');
    console.log('  Phone:', TEST_CONFIG.phoneNumber);
    console.log('  Password:', TEST_CONFIG.password);
    
    return true;
    
  } catch (error) {
    console.error('✗ FAIL: Test error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testFrontendLoginAPI().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testFrontendLoginAPI };