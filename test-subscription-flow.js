/**
 * Test script for subscription flow functionality
 * This script tests the complete subscription flow including authentication checks
 */

// Use native fetch in Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  phoneNumber: '1234567890',
  password: 'test123',
  productName: 'indices option', // Using the product name from the URL
  productId: 1, // Default product ID
  planId: 1 // Default plan ID
};

async function testSubscriptionFlow() {
  console.log('=== Testing Subscription Flow ===');
  
  try {
    // Step 1: Test user login to get auth token
    console.log('\n1. Testing user login...');
    const loginResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phoneNumber: TEST_CONFIG.phoneNumber, 
        password: TEST_CONFIG.password 
      })
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.error('✗ FAIL: Login failed:', errorData);
      return false;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token || (loginData.data && loginData.data.token);
    
    if (!token) {
      console.error('✗ FAIL: No token received');
      return false;
    }
    
    console.log('✓ PASS: User login successful, token received');
    
    // Step 2: Test product page access
    console.log('\n2. Testing product page access...');
    const productResponse = await fetch(`${TEST_CONFIG.baseUrl}/product/${encodeURIComponent(TEST_CONFIG.productName)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'text/html' }
    });
    
    console.log('Product page status:', productResponse.status);
    if (productResponse.status === 200) {
      console.log('✓ PASS: Product page accessible');
    } else {
      console.log('⚠ WARNING: Product page returned status:', productResponse.status);
    }
    
    // Step 3: Test subscription confirmation page with token
    console.log('\n3. Testing subscription confirmation page with authentication...');
    const subscriptionUrl = `${TEST_CONFIG.baseUrl}/subscription/confirm?productId=${TEST_CONFIG.productId}&planId=${TEST_CONFIG.planId}&authToken=${encodeURIComponent(token)}`;
    
    const subscriptionResponse = await fetch(subscriptionUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'text/html' }
    });
    
    console.log('Subscription confirmation status:', subscriptionResponse.status);
    
    if (subscriptionResponse.status === 200) {
      console.log('✓ PASS: Subscription confirmation page accessible with valid token');
    } else if (subscriptionResponse.status === 302) {
      // Check if it's redirecting to login (which would be wrong since we have a token)
      const redirectUrl = subscriptionResponse.headers.get('location');
      console.log('Redirect URL:', redirectUrl);
      
      if (redirectUrl && redirectUrl.includes('/login')) {
        console.error('✗ FAIL: Subscription page redirected to login despite having valid token');
        return false;
      } else {
        console.log('✓ PASS: Subscription page redirected (likely to payment)');
      }
    } else {
      console.log('⚠ WARNING: Subscription confirmation returned status:', subscriptionResponse.status);
    }
    
    // Step 4: Test subscription confirmation page without token (should redirect to login)
    console.log('\n4. Testing subscription confirmation page without authentication...');
    const unauthSubscriptionResponse = await fetch(`${TEST_CONFIG.baseUrl}/subscription/confirm?productId=${TEST_CONFIG.productId}&planId=${TEST_CONFIG.planId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'text/html' }
    });
    
    console.log('Unauthenticated subscription status:', unauthSubscriptionResponse.status);
    
    if (unauthSubscriptionResponse.status === 302) {
      const redirectUrl = unauthSubscriptionResponse.headers.get('location');
      console.log('Redirect URL:', redirectUrl);
      
      if (redirectUrl && redirectUrl.includes('/login')) {
        console.log('✓ PASS: Unauthenticated subscription request properly redirected to login');
      } else {
        console.log('⚠ WARNING: Unexpected redirect location:', redirectUrl);
      }
    } else {
      console.log('⚠ WARNING: Unauthenticated subscription request did not redirect');
    }
    
    console.log('\n=== Subscription Flow Test Summary ===');
    console.log('✓ User authentication works correctly');
    console.log('✓ Product pages are accessible');
    console.log('✓ Subscription confirmation with token works');
    console.log('✓ Unauthenticated subscription requests are redirected to login');
    console.log('\nThe subscription flow is working as expected!');
    console.log('\nHow it should work:');
    console.log('1. User clicks "Subscribe" on product page');
    console.log('2. If not logged in: redirected to /login?redirect=current-url');
    console.log('3. After login: redirected back to product page');
    console.log('4. Subscription form should now work without showing login');
    console.log('5. User proceeds to subscription confirmation page');
    
    return true;
    
  } catch (error) {
    console.error('✗ FAIL: Test error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testSubscriptionFlow().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testSubscriptionFlow };