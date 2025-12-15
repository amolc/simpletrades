/**
 * Global setup for Jest tests
 * Runs once before all test suites
 */

module.exports = async () => {
  console.log('🧪 Setting up test environment...');
  
  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.TESTING = 'true';
    process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
    process.env.DB_USER = process.env.TEST_DB_USER || 'test_user';
    process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test_password';
    process.env.DB_NAME = process.env.TEST_DB_NAME || 'test_stock_monitoring';
    process.env.DB_PORT = process.env.TEST_DB_PORT || '3306';
    
    // Mock database connection for tests
    process.env.MOCK_DATABASE = 'true';
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
};