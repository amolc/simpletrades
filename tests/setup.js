/**
 * Jest setup file - runs before each test suite
 */

const { Logger } = require('../modules/utils/helpers');

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.TESTING = 'true';

// Mock only the logger from helpers module
jest.mock('../modules/utils/helpers', () => {
  const actualHelpers = jest.requireActual('../modules/utils/helpers');
  return {
    ...actualHelpers,
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    },
    Validator: {
      isValidSymbol: jest.fn((symbol) => /^[A-Z]{1,5}$/.test(symbol)),
      isValidExchange: jest.fn((exchange) => ['NASDAQ', 'NYSE', 'AMEX'].includes(exchange)),
      isValidEmail: jest.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
      isValidPassword: jest.fn((password) => password.length >= 8)
    },
    Formatter: {
      formatSymbol: jest.fn((symbol) => symbol.toUpperCase()),
      formatExchange: jest.fn((exchange) => exchange.toUpperCase()),
      formatPrice: jest.fn((price) => parseFloat(price).toFixed(2)),
      formatChange: jest.fn((change) => (change >= 0 ? '+' : '') + change.toFixed(2)),
      formatTimestamp: jest.fn((timestamp) => new Date(timestamp).toISOString())
    },
    CryptoUtils: {
      hash: jest.fn((data) => `hashed_${data}`),
      generateId: jest.fn(() => `test_id_${Date.now()}`),
      generateToken: jest.fn(() => `test_token_${Date.now()}`)
    },
    PerformanceUtils: {
      measureTime: jest.fn(async (fn) => {
        const start = Date.now();
        const result = await fn();
        const end = Date.now();
        return { result, duration: end - start };
      }),
      benchmark: jest.fn(async (fn, iterations = 1) => {
        const results = [];
        for (let i = 0; i < iterations; i++) {
          const start = Date.now();
          await fn();
          const end = Date.now();
          results.push(end - start);
        }
        return {
          average: results.reduce((a, b) => a + b) / results.length,
          min: Math.min(...results),
          max: Math.max(...results)
        };
      })
    }
  };
});

// Global test utilities
global.testUtils = {
  // Create mock price data
  createMockPriceData: (symbol = 'AAPL', exchange = 'NASDAQ') => ({
    symbol,
    exchange,
    price: 100 + Math.random() * 200,
    change: Math.random() * 10 - 5,
    changePercent: Math.random() * 5 - 2.5,
    timestamp: Date.now(),
    volume: Math.floor(Math.random() * 1000000)
  }),
  
  // Create mock user data
  createMockUser: () => ({
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'SecurePass123!',
    createdAt: Date.now()
  }),
  
  // Create mock subscription data
  createMockSubscription: (symbol = 'AAPL', userId = 'test_user') => ({
    symbol,
    exchange: 'NASDAQ',
    userId,
    createdAt: Date.now(),
    active: true
  }),
  
  // Wait for specified time
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random string
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  
  // Generate random number in range
  randomBetween: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
};

// Mock timers for consistent testing
jest.useFakeTimers();

// Setup fetch mock if needed
global.fetch = jest.fn();

// Setup WebSocket mock
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1 // OPEN
}));

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});