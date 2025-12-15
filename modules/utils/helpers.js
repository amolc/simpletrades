/**
 * Utility functions and helpers module
 * @module utils/helpers
 */

const crypto = require('crypto');

/**
 * Logger utility with different log levels
 */
class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Check if log level is enabled
   * @param {string} level - Log level to check
   * @returns {boolean} Whether logging is enabled for this level
   */
  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  /**
   * Format log message with timestamp
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data })
    };
    return JSON.stringify(logEntry);
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {any} data - Additional error data
   */
  error(message, data) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {any} data - Additional warning data
   */
  warn(message, data) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {any} data - Additional info data
   */
  info(message, data) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {any} data - Additional debug data
   */
  debug(message, data) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }
}

/**
 * Validation utilities
 */
class Validator {
  /**
   * Validate if value is a valid string
   * @param {any} value - Value to validate
   * @param {object} options - Validation options
   * @returns {boolean} Validation result
   */
  static isValidString(value, options = {}) {
    const { minLength = 1, maxLength = 255, allowEmpty = false } = options;
    
    if (typeof value !== 'string') return false;
    if (!allowEmpty && value.trim().length === 0) return false;
    if (value.length < minLength || value.length > maxLength) return false;
    
    return true;
  }

  /**
   * Validate if value is a valid number
   * @param {any} value - Value to validate
   * @param {object} options - Validation options
   * @returns {boolean} Validation result
   */
  static isValidNumber(value, options = {}) {
    const { min = -Infinity, max = Infinity, allowDecimal = true } = options;
    
    if (typeof value === 'string') {
      value = parseFloat(value);
    }
    
    if (typeof value !== 'number' || !isFinite(value)) return false;
    if (value < min || value > max) return false;
    if (!allowDecimal && !Number.isInteger(value)) return false;
    
    return true;
  }

  /**
   * Validate if value is a valid email
   * @param {string} email - Email to validate
   * @returns {boolean} Validation result
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.isValidString(email) && emailRegex.test(email);
  }

  /**
   * Validate if value is a valid symbol
   * @param {string} symbol - Symbol to validate
   * @returns {boolean} Validation result
   */
  static isValidSymbol(symbol) {
    if (!this.isValidString(symbol)) return false;
    
    // Basic symbol validation: uppercase letters, numbers, and common special characters
    const symbolRegex = /^[A-Z0-9._-]+$/;
    return symbolRegex.test(symbol.toUpperCase());
  }

  /**
   * Validate if value is a valid exchange
   * @param {string} exchange - Exchange to validate
   * @returns {boolean} Validation result
   */
  static isValidExchange(exchange) {
    const validExchanges = ['NSE', 'BSE', 'BINANCE', 'MCX', 'FOREX', 'COMEX', 'NASDAQ', 'NYSE'];
    return this.isValidString(exchange) && validExchanges.includes(exchange.toUpperCase());
  }
}

/**
 * Data formatting utilities
 */
class Formatter {
  /**
   * Format currency value
   * @param {number} value - Value to format
   * @param {string} currency - Currency code
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted currency
   */
  static formatCurrency(value, currency = 'USD', decimals = 2) {
    if (!Validator.isValidNumber(value)) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Format percentage value
   * @param {number} value - Value to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted percentage
   */
  static formatPercentage(value, decimals = 2) {
    if (!Validator.isValidNumber(value)) return 'N/A';
    
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format date to ISO string
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date
   */
  static formatDateISO(date) {
    if (!date) return null;
    
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString();
  }

  /**
   * Format symbol to standard format
   * @param {string} symbol - Symbol to format
   * @returns {string} Formatted symbol
   */
  static formatSymbol(symbol) {
    if (!Validator.isValidString(symbol)) return '';
    
    return symbol.toUpperCase().trim().replace(/\s+/g, '');
  }

  /**
   * Format exchange to standard format
   * @param {string} exchange - Exchange to format
   * @returns {string} Formatted exchange
   */
  static formatExchange(exchange) {
    if (!Validator.isValidString(exchange)) return 'NSE';
    
    return exchange.toUpperCase().trim();
  }
}

/**
 * Cryptographic utilities
 */
class CryptoUtils {
  /**
   * Generate random string
   * @param {number} length - Length of random string
   * @returns {string} Random string
   */
  static generateRandomString(length = 32) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * Generate hash of input string
   * @param {string} input - Input string
   * @param {string} algorithm - Hash algorithm
   * @returns {string} Hash string
   */
  static hash(input, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(input).digest('hex');
  }

  /**
   * Generate secure token
   * @param {number} length - Token length
   * @returns {string} Secure token
   */
  static generateSecureToken(length = 64) {
    return crypto.randomBytes(length).toString('base64').replace(/[+/=]/g, '');
  }
}

/**
 * Performance utilities
 */
class PerformanceUtils {
  /**
   * Measure execution time of a function
   * @param {Function} fn - Function to measure
   * @param {string} label - Label for the measurement
   * @returns {Promise<any>} Function result
   */
  static async measureExecutionTime(fn, label = 'Operation') {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await fn();
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      logger.debug(`${label} completed in ${executionTime.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;
      
      logger.error(`${label} failed after ${executionTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * Create a performance timer
   * @param {string} label - Timer label
   * @returns {object} Timer object with start/stop methods
   */
  static createTimer(label = 'Timer') {
    let startTime = null;
    
    return {
      start: () => {
        startTime = process.hrtime.bigint();
        logger.debug(`${label} started`);
      },
      stop: () => {
        if (!startTime) {
          logger.warn(`${label} timer was not started`);
          return 0;
        }
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        logger.debug(`${label} completed in ${executionTime.toFixed(2)}ms`);
        return executionTime;
      }
    };
  }
}

// Create singleton logger instance
const logger = new Logger();

module.exports = {
  Logger,
  Validator,
  Formatter,
  CryptoUtils,
  PerformanceUtils,
  logger
};