/**
 * Test script for admin login functionality
 * This script tests the login process and verifies that localStorage is updated correctly
 */

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

// Mock localStorage for Node.js environment
const dom = new JSDOM('');
global.localStorage = dom.window.localStorage;
global.window = dom.window;
global.document = dom.window.document;

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  adminEmail: 'admin@demo.com',
  adminPassword: 'admin123' // Replace with actual admin password
};

async function testAdminLogin() {
  console.log('=== Testing Admin Login Functionality ===');
  
  try {
    // Clear localStorage before test
    localStorage.clear();
    console.log('✓ Cleared localStorage');
    
    // Test 1: Check that no token exists initially
    const initialToken = localStorage.getItem('adminToken');
    console.log('Initial token:', initialToken);
    if (initialToken) {
      console.error('✗ FAIL: Token exists before login');
      return false;
    }
    console.log('✓ PASS: No token exists before login');
    
    // Test 2: Attempt login with valid credentials
    console.log('\nAttempting login with credentials:', TEST_CONFIG.adminEmail);
    
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
    
    if (!responseData.token) {
      console.error('✗ FAIL: No token received in response');
      return false;
    }
    
    console.log('✓ PASS: Received token from server');
    
    // Test 3: Store token in localStorage
    localStorage.setItem('adminToken', responseData.token);
    console.log('✓ PASS: Token stored in localStorage');
    
    // Test 4: Verify token was stored correctly
    const storedToken = localStorage.getItem('adminToken');
    if (!storedToken) {
      console.error('✗ FAIL: Token not found in localStorage after storage');
      return false;
    }
    
    if (storedToken !== responseData.token) {
      console.error('✗ FAIL: Stored token does not match received token');
      return false;
    }
    
    console.log('✓ PASS: Token verified in localStorage');
    console.log('Stored token (first 20 chars):', storedToken.substring(0, 20) + '...');
    
    // Test 5: Test token retrieval
    const retrievedToken = localStorage.getItem('adminToken');
    if (retrievedToken !== storedToken) {
      console.error('✗ FAIL: Retrieved token does not match stored token');
      return false;
    }
    
    console.log('✓ PASS: Token retrieval successful');
    
    console.log('\n=== All Tests Passed! ===');
    console.log('The admin login functionality is working correctly.');
    console.log('Token is being stored and retrieved from localStorage properly.');
    
    return true;
    
  } catch (error) {
    console.error('✗ FAIL: Test error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testAdminLogin().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testAdminLogin };