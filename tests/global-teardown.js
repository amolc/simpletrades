/**
 * Global teardown for Jest tests
 * Runs once after all test suites complete
 */

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clear test environment variables
    delete process.env.NODE_ENV;
    delete process.env.TESTING;
    delete process.env.MOCK_DATABASE;
    delete process.env.TEST_DB_HOST;
    delete process.env.TEST_DB_USER;
    delete process.env.TEST_DB_PASSWORD;
    delete process.env.TEST_DB_NAME;
    delete process.env.TEST_DB_PORT;
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    throw error;
  }
};