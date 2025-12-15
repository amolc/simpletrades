/**
 * Unit tests for utils module
 */

const { describe, it, expect } = require('@jest/globals');
const { Logger, Validator, Formatter, CryptoUtils, PerformanceUtils } = require('../../modules/utils/helpers');

describe('Utils Module', () => {
  describe('Logger', () => {
    it('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      Logger.info('Test message', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log error messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      Logger.error('Test error', new Error('Test'));
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log debug messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      Logger.debug('Debug message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log warn messages', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      Logger.warn('Warning message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Validator', () => {
    describe('isValidSymbol', () => {
      it('should validate valid symbols', () => {
        expect(Validator.isValidSymbol('AAPL')).toBe(true);
        expect(Validator.isValidSymbol('GOOGL')).toBe(true);
        expect(Validator.isValidSymbol('TSLA')).toBe(true);
      });

      it('should reject invalid symbols', () => {
        expect(Validator.isValidSymbol('')).toBe(false);
        expect(Validator.isValidSymbol(null)).toBe(false);
        expect(Validator.isValidSymbol(undefined)).toBe(false);
        expect(Validator.isValidSymbol('AAPL123!')).toBe(false);
      });
    });

    describe('isValidExchange', () => {
      it('should validate valid exchanges', () => {
        expect(Validator.isValidExchange('NSE')).toBe(true);
        expect(Validator.isValidExchange('NASDAQ')).toBe(true);
        expect(Validator.isValidExchange('BINANCE')).toBe(true);
        expect(Validator.isValidExchange('NYSE')).toBe(true);
      });

      it('should reject invalid exchanges', () => {
        expect(Validator.isValidExchange('')).toBe(false);
        expect(Validator.isValidExchange('INVALID')).toBe(false);
        expect(Validator.isValidExchange(null)).toBe(false);
      });
    });

    describe('isValidEmail', () => {
      it('should validate valid email addresses', () => {
        expect(Validator.isValidEmail('user@example.com')).toBe(true);
        expect(Validator.isValidEmail('test.user@domain.co.uk')).toBe(true);
        expect(Validator.isValidEmail('admin@company.org')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(Validator.isValidEmail('invalid-email')).toBe(false);
        expect(Validator.isValidEmail('user@')).toBe(false);
        expect(Validator.isValidEmail('@domain.com')).toBe(false);
        expect(Validator.isValidEmail('')).toBe(false);
      });
    });

    describe('isValidPhoneNumber', () => {
      it('should validate valid phone numbers', () => {
        expect(Validator.isValidPhoneNumber('+1234567890')).toBe(true);
        expect(Validator.isValidPhoneNumber('123-456-7890')).toBe(true);
        expect(Validator.isValidPhoneNumber('(123) 456-7890')).toBe(true);
      });

      it('should reject invalid phone numbers', () => {
        expect(Validator.isValidPhoneNumber('')).toBe(false);
        expect(Validator.isValidPhoneNumber('123')).toBe(false);
        expect(Validator.isValidPhoneNumber('invalid')).toBe(false);
      });
    });

    describe('isValidPassword', () => {
      it('should validate strong passwords', () => {
        expect(Validator.isValidPassword('StrongP@ss123')).toBe(true);
        expect(Validator.isValidPassword('MyP@ssw0rd!')).toBe(true);
      });

      it('should reject weak passwords', () => {
        expect(Validator.isValidPassword('weak')).toBe(false);
        expect(Validator.isValidPassword('123456')).toBe(false);
        expect(Validator.isValidPassword('password')).toBe(false);
      });
    });

    describe('isValidAmount', () => {
      it('should validate valid amounts', () => {
        expect(Validator.isValidAmount(100)).toBe(true);
        expect(Validator.isValidAmount(100.50)).toBe(true);
        expect(Validator.isValidAmount(0.01)).toBe(true);
      });

      it('should reject invalid amounts', () => {
        expect(Validator.isValidAmount(-100)).toBe(false);
        expect(Validator.isValidAmount(0)).toBe(false);
        expect(Validator.isValidAmount('invalid')).toBe(false);
      });
    });

    describe('isValidDate', () => {
      it('should validate valid dates', () => {
        expect(Validator.isValidDate(new Date())).toBe(true);
        expect(Validator.isValidDate('2023-01-01')).toBe(true);
        expect(Validator.isValidDate(Date.now())).toBe(true);
      });

      it('should reject invalid dates', () => {
        expect(Validator.isValidDate('invalid')).toBe(false);
        expect(Validator.isValidDate('2023-13-45')).toBe(false);
        expect(Validator.isValidDate(null)).toBe(false);
      });
    });
  });

  describe('Formatter', () => {
    describe('formatSymbol', () => {
      it('should format symbols correctly', () => {
        expect(Formatter.formatSymbol('aapl')).toBe('AAPL');
        expect(Formatter.formatSymbol('GOOGL')).toBe('GOOGL');
        expect(Formatter.formatSymbol('tsla')).toBe('TSLA');
      });

      it('should handle empty inputs', () => {
        expect(Formatter.formatSymbol('')).toBe('');
        expect(Formatter.formatSymbol(null)).toBe('');
        expect(Formatter.formatSymbol(undefined)).toBe('');
      });
    });

    describe('formatExchange', () => {
      it('should format exchanges correctly', () => {
        expect(Formatter.formatExchange('nse')).toBe('NSE');
        expect(Formatter.formatExchange('NASDAQ')).toBe('NASDAQ');
        expect(Formatter.formatExchange('binance')).toBe('BINANCE');
      });

      it('should handle empty inputs', () => {
        expect(Formatter.formatExchange('')).toBe('');
        expect(Formatter.formatExchange(null)).toBe('');
        expect(Formatter.formatExchange(undefined)).toBe('');
      });
    });

    describe('formatPrice', () => {
      it('should format prices correctly', () => {
        expect(Formatter.formatPrice(150.1234)).toBe('150.12');
        expect(Formatter.formatPrice(99.999)).toBe('100.00');
        expect(Formatter.formatPrice(0.5)).toBe('0.50');
      });

      it('should handle invalid inputs', () => {
        expect(Formatter.formatPrice('invalid')).toBe('0.00');
        expect(Formatter.formatPrice(null)).toBe('0.00');
        expect(Formatter.formatPrice(undefined)).toBe('0.00');
      });
    });

    describe('formatDate', () => {
      it('should format dates correctly', () => {
        const date = new Date('2023-01-15T10:30:00');
        expect(Formatter.formatDate(date, 'YYYY-MM-DD')).toBe('2023-01-15');
        expect(Formatter.formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2023');
      });

      it('should handle invalid dates', () => {
        expect(Formatter.formatDate('invalid', 'YYYY-MM-DD')).toBe('Invalid Date');
        expect(Formatter.formatDate(null, 'YYYY-MM-DD')).toBe('Invalid Date');
      });
    });

    describe('formatCurrency', () => {
      it('should format currency correctly', () => {
        expect(Formatter.formatCurrency(1500)).toBe('$1,500.00');
        expect(Formatter.formatCurrency(99.99)).toBe('$99.99');
        expect(Formatter.formatCurrency(1000000)).toBe('$1,000,000.00');
      });

      it('should handle different currencies', () => {
        expect(Formatter.formatCurrency(1500, 'EUR')).toBe('€1,500.00');
        expect(Formatter.formatCurrency(1500, 'GBP')).toBe('£1,500.00');
      });

      it('should handle invalid inputs', () => {
        expect(Formatter.formatCurrency('invalid')).toBe('$0.00');
        expect(Formatter.formatCurrency(null)).toBe('$0.00');
      });
    });

    describe('formatPercentage', () => {
      it('should format percentages correctly', () => {
        expect(Formatter.formatPercentage(0.15)).toBe('15.00%');
        expect(Formatter.formatPercentage(-0.05)).toBe('-5.00%');
        expect(Formatter.formatPercentage(1.25)).toBe('125.00%');
      });

      it('should handle invalid inputs', () => {
        expect(Formatter.formatPercentage('invalid')).toBe('0.00%');
        expect(Formatter.formatPercentage(null)).toBe('0.00%');
      });
    });
  });

  describe('CryptoUtils', () => {
    describe('hash', () => {
      it('should hash strings consistently', () => {
        const hash1 = CryptoUtils.hash('test');
        const hash2 = CryptoUtils.hash('test');
        
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA256 hex length
      });

      it('should produce different hashes for different inputs', () => {
        const hash1 = CryptoUtils.hash('test1');
        const hash2 = CryptoUtils.hash('test2');
        
        expect(hash1).not.toBe(hash2);
      });
    });

    describe('generateSalt', () => {
      it('should generate unique salts', () => {
        const salt1 = CryptoUtils.generateSalt();
        const salt2 = CryptoUtils.generateSalt();
        
        expect(salt1).not.toBe(salt2);
        expect(salt1).toHaveLength(32); // Default salt length
      });

      it('should generate salts of specified length', () => {
        const salt = CryptoUtils.generateSalt(16);
        
        expect(salt).toHaveLength(16);
      });
    });

    describe('encrypt/decrypt', () => {
      it('should encrypt and decrypt data correctly', () => {
        const data = 'sensitive data';
        const key = 'encryption-key-123';
        
        const encrypted = CryptoUtils.encrypt(data, key);
        const decrypted = CryptoUtils.decrypt(encrypted, key);
        
        expect(decrypted).toBe(data);
      });

      it('should produce different encrypted outputs for same input', () => {
        const data = 'test data';
        const key = 'encryption-key-123';
        
        const encrypted1 = CryptoUtils.encrypt(data, key);
        const encrypted2 = CryptoUtils.encrypt(data, key);
        
        expect(encrypted1).not.toBe(encrypted2);
      });

      it('should handle invalid decryption', () => {
        const key = 'encryption-key-123';
        
        const result = CryptoUtils.decrypt('invalid-encrypted-data', key);
        
        expect(result).toBeNull();
      });
    });
  });

  describe('PerformanceUtils', () => {
    describe('measure', () => {
      it('should measure function execution time', async () => {
        const testFunction = async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'result';
        };
        
        const result = await PerformanceUtils.measure('test-operation', testFunction);
        
        expect(result).toBe('result');
      });

      it('should handle function errors', async () => {
        const errorFunction = async () => {
          throw new Error('Test error');
        };
        
        await expect(PerformanceUtils.measure('test-operation', errorFunction))
          .rejects.toThrow('Test error');
      });
    });

    describe('getMemoryUsage', () => {
      it('should return memory usage statistics', () => {
        const usage = PerformanceUtils.getMemoryUsage();
        
        expect(usage).toHaveProperty('used');
        expect(usage).toHaveProperty('total');
        expect(usage).toHaveProperty('percentage');
        expect(typeof usage.percentage).toBe('number');
      });
    });

    describe('formatDuration', () => {
      it('should format durations correctly', () => {
        expect(PerformanceUtils.formatDuration(1000)).toBe('1.00s');
        expect(PerformanceUtils.formatDuration(1500)).toBe('1.50s');
        expect(PerformanceUtils.formatDuration(500)).toBe('500.00ms');
        expect(PerformanceUtils.formatDuration(0.5)).toBe('0.50ms');
      });
    });
  });
});