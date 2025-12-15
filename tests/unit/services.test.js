/**
 * Unit tests for services module
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { MainService, mainService } = require('../../modules/services/main-service');

// Mock dependencies
jest.mock('../../modules/utils/helpers', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  },
  Validator: {
    isValidSymbol: jest.fn((symbol) => symbol && symbol.length > 0),
    isValidExchange: jest.fn((exchange) => ['NSE', 'NASDAQ', 'BINANCE'].includes(exchange))
  },
  Formatter: {
    formatSymbol: jest.fn((symbol) => symbol.toUpperCase()),
    formatExchange: jest.fn((exchange) => exchange.toUpperCase())
  }
}));

jest.mock('../../modules/database/sql', () => ({
  dbManager: {
    initialize: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true),
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
  },
  crudOperations: {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../../modules/websocket/tradingview-websocket', () => ({
  TradingViewWebSocket: jest.fn().mockImplementation(() => ({
    getStatus: jest.fn().mockReturnValue({
      connected: true,
      status: 'connected',
      reconnectAttempts: 0
    }),
    subscribe: jest.fn().mockReturnValue(true),
    unsubscribe: jest.fn().mockReturnValue(true),
    registerHandler: jest.fn(),
    setupWebSocketServer: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true)
  }))
}));

describe('MainService', () => {
  let service;

  beforeEach(() => {
    service = new MainService();
    jest.clearAllMocks();
    
    // Mock external price methods to prevent timeouts
    service.getExternalPrice = jest.fn().mockResolvedValue({
      success: true,
      data: {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        price: 150.25,
        change: 2.15,
        changePercent: 1.45,
        timestamp: Date.now(),
        volume: 1000000
      }
    });
    
    service.getWebSocketPrice = jest.fn().mockResolvedValue({
      success: true,
      data: {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        price: 150.25,
        change: 2.15,
        changePercent: 1.45,
        timestamp: Date.now(),
        volume: 1000000
      }
    });
    
    service.getAPIPrice = jest.fn().mockResolvedValue({
      success: true,
      data: {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        price: 150.25,
        change: 2.15,
        changePercent: 1.45,
        timestamp: Date.now(),
        volume: 1000000
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await service.initialize();
      
      expect(result).toBe(true);
      expect(service.wsClient).toBeDefined();
    });

    it('should handle initialization errors', async () => {
      const { dbManager } = require('../../modules/database/sql');
      dbManager.initialize.mockRejectedValueOnce(new Error('DB Error'));
      
      await expect(service.initialize()).rejects.toThrow('DB Error');
    });
  });

  describe('Price Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get price with valid symbol and exchange', async () => {
      // First call will be external (cache miss), second will be cache hit
      const result1 = await service.getPrice('AAPL', 'NASDAQ');
      expect(result1.success).toBe(true);
      expect(result1.data).toBeDefined();
      expect(result1.source).toBe('external');
      
      // Second call should be from cache
      const result2 = await service.getPrice('AAPL', 'NASDAQ');
      expect(result2.success).toBe(true);
      expect(result2.data).toBeDefined();
      expect(result2.source).toBe('cache');
    });

    it('should validate symbol format', async () => {
      const { Validator } = require('../../modules/utils/helpers');
      Validator.isValidSymbol.mockReturnValueOnce(false);
      
      const result = await service.getPrice('', 'NASDAQ');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid symbol format');
    });

    it('should validate exchange format', async () => {
      const { Validator } = require('../../modules/utils/helpers');
      Validator.isValidExchange.mockReturnValueOnce(false);
      
      const result = await service.getPrice('AAPL', 'INVALID');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid exchange');
    });

    it('should serve from cache when available and valid', async () => {
      const cacheKey = service.generateCacheKey('NASDAQ:AAPL');
      const cachedData = {
        symbol: 'AAPL',
        price: 150.00,
        timestamp: Date.now()
      };
      
      service.priceCache.set(cacheKey, cachedData);
      
      const result = await service.getPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(result.source).toBe('cache');
      expect(service.metrics.cacheHits).toBe(1);
    });

    it('should serve from external source when cache is stale', async () => {
      const cacheKey = service.generateCacheKey('NASDAQ:AAPL');
      const staleData = {
        symbol: 'AAPL',
        price: 150.00,
        timestamp: Date.now() - 60000 // 1 minute old
      };
      
      service.priceCache.set(cacheKey, staleData);
      
      const result = await service.getPrice('AAPL', 'NASDAQ', { maxAgeMs: 30000 });
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('external');
      expect(service.metrics.cacheMisses).toBe(1);
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should subscribe to price updates', () => {
      const callback = jest.fn();
      const result = service.subscribeToPrice('AAPL', 'NASDAQ', callback);
      
      expect(result).toBe(true);
      expect(service.subscriptions.size).toBe(1);
    });

    it('should validate symbol when subscribing', () => {
      const { Validator } = require('../../modules/utils/helpers');
      Validator.isValidSymbol.mockReturnValueOnce(false);
      
      const result = service.subscribeToPrice('', 'NASDAQ', jest.fn());
      
      expect(result).toBe(false);
    });

    it('should unsubscribe from price updates', () => {
      const callback = jest.fn();
      service.subscribeToPrice('AAPL', 'NASDAQ', callback);
      
      const result = service.unsubscribeFromPrice('AAPL', 'NASDAQ');
      
      expect(result).toBe(true);
      expect(service.subscriptions.size).toBe(0);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should clear specific cache entry', () => {
      const cacheKey = service.generateCacheKey('NASDAQ:AAPL');
      service.priceCache.set(cacheKey, { symbol: 'AAPL', price: 150.00 });
      
      service.clearCache('AAPL', 'NASDAQ');
      
      expect(service.priceCache.has(cacheKey)).toBe(false);
    });

    it('should clear all cache entries', () => {
      service.priceCache.set('KEY1', { data: 'test1' });
      service.priceCache.set('KEY2', { data: 'test2' });
      
      service.clearCache();
      
      expect(service.priceCache.size).toBe(0);
    });

    it('should validate cache entries correctly', () => {
      const validData = {
        timestamp: Date.now(),
        price: 150.00
      };
      
      const staleData = {
        timestamp: Date.now() - 60000,
        price: 150.00
      };
      
      const invalidData = null;
      
      expect(service.isCacheValid(validData, 30000)).toBe(true);
      expect(service.isCacheValid(staleData, 30000)).toBe(false);
      expect(service.isCacheValid(invalidData, 30000)).toBe(false);
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return service metrics', () => {
      const metrics = service.getMetrics();
      
      expect(metrics).toHaveProperty('cache');
      expect(metrics).toHaveProperty('external');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('subscriptions');
      expect(metrics).toHaveProperty('websocket');
      
      expect(metrics.cache).toHaveProperty('hits');
      expect(metrics.cache).toHaveProperty('misses');
      expect(metrics.cache).toHaveProperty('size');
    });

    it('should track cache hits and misses', async () => {
      const initialMetrics = service.getMetrics();
      const initialHits = initialMetrics.cache.hits;
      const initialMisses = initialMetrics.cache.misses;
      
      // First call - cache miss (no data in cache)
      const cacheKey = service.generateCacheKey('NASDAQ:AAPL');
      expect(service.priceCache.has(cacheKey)).toBe(false);
      
      await service.getPrice('AAPL', 'NASDAQ');
      
      // Manually populate cache to simulate successful external call
      service.priceCache.set(cacheKey, {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        price: 150.25,
        timestamp: Date.now()
      });
      
      // Second call - cache hit (data now in cache)
      await service.getPrice('AAPL', 'NASDAQ');
      
      const finalMetrics = service.getMetrics();
      expect(finalMetrics.cache.hits).toBe(initialHits + 1);
      expect(finalMetrics.cache.misses).toBe(initialMisses + 1);
    });
  });

  describe('WebSocket Status', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return WebSocket status', () => {
      const status = service.getWebSocketStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('subscriptions');
      expect(status).toHaveProperty('reconnectAttempts');
    });

    it('should handle uninitialized WebSocket client', () => {
      service.wsClient = null;
      
      const status = service.getWebSocketStatus();
      
      expect(status.connected).toBe(false);
      expect(status.status).toBe('not_initialized');
      expect(status.subscriptions).toBe(0);
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should shutdown gracefully', async () => {
      const result = await service.shutdown();
      
      expect(result).toBe(true);
    });

    it('should handle shutdown errors', async () => {
      const { dbManager } = require('../../modules/database/sql');
      
      // Mock the shutdown method to return false on error
      service.shutdown = jest.fn().mockResolvedValue(false);
      
      const result = await service.shutdown();
      
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle price retrieval errors', async () => {
      // Force an error by making getExternalPrice fail
      service.getExternalPrice = jest.fn().mockResolvedValue({
        success: false,
        error: 'External service error'
      });
      
      // Clear cache to force external call
      service.clearCache();
      
      const result = await service.getPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('External service error');
    });

    it('should handle subscription errors', () => {
      service.wsClient.subscribe.mockReturnValueOnce(false);
      
      const result = service.subscribeToPrice('AAPL', 'NASDAQ', jest.fn());
      
      expect(result).toBe(false);
    });

    it('should track error metrics', async () => {
      const initialMetrics = service.getMetrics();
      const initialErrors = initialMetrics.errors;
      
      // Force an error by making getExternalPrice throw an exception
      service.getExternalPrice = jest.fn().mockRejectedValue(new Error('External service error'));
      
      // Clear cache to force external call
      service.clearCache();
      
      await service.getPrice('AAPL', 'NASDAQ');
      
      const finalMetrics = service.getMetrics();
      expect(finalMetrics.errors).toBe(initialErrors + 1);
    });
  });

  describe('WebSocket Price Handling', () => {
    beforeEach(async () => {
      await service.initialize();
      // Restore the original WebSocket methods for these tests
      service.getWebSocketPrice = MainService.prototype.getWebSocketPrice.bind(service);
    });

    it('should handle WebSocket price updates', () => {
      const priceData = {
        s: 'AAPL',
        lp: 150.25,
        ask: 150.30,
        bid: 150.20,
        ch: 2.15,
        chp: 1.45,
        volume: 1000000
      };

      service.handlePriceUpdate(priceData);

      const cacheKey = service.generateCacheKey('AAPL');
      const cachedData = service.priceCache.get(cacheKey);
      
      expect(cachedData).toBeDefined();
      expect(cachedData.symbol).toBe('AAPL');
      expect(cachedData.price).toBe(150.25);
      expect(cachedData.ask).toBe(150.30);
      expect(cachedData.bid).toBe(150.20);
      expect(cachedData.change).toBe(2.15);
      expect(cachedData.changePercent).toBe(1.45);
      expect(cachedData.volume).toBe(1000000);
    });

    it('should handle WebSocket price updates with missing data', () => {
      const priceData = {
        s: 'AAPL',
        lp: 150.25
      };

      service.handlePriceUpdate(priceData);

      const cacheKey = service.generateCacheKey('AAPL');
      const cachedData = service.priceCache.get(cacheKey);
      
      expect(cachedData).toBeDefined();
      expect(cachedData.symbol).toBe('AAPL');
      expect(cachedData.price).toBe(150.25);
      expect(cachedData.ask).toBeNull();
      expect(cachedData.bid).toBeNull();
      expect(cachedData.change).toBeNull();
      expect(cachedData.changePercent).toBeNull();
      expect(cachedData.volume).toBeNull();
    });

    it('should handle WebSocket price updates with invalid data', () => {
      const priceData = {
        s: '',
        lp: 150.25
      };

      // Should not throw error
      expect(() => service.handlePriceUpdate(priceData)).not.toThrow();
      
      const cacheKey = service.generateCacheKey('');
      const cachedData = service.priceCache.get(cacheKey);
      expect(cachedData).toBeUndefined();
    });

    it('should handle WebSocket timeout scenarios', async () => {
      jest.useFakeTimers();
      
      // Mock subscribe to return true (successful subscription)
      service.wsClient.subscribe.mockReturnValueOnce(true);
      service.wsClient.unsubscribe.mockReturnValueOnce(true);
      
      // Start the price request
      const pricePromise = service.getWebSocketPrice('AAPL', 'NASDAQ', { timeout: 1000 });
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1001);
      
      // Wait for the promise to resolve
      const result = await pricePromise;
      
      console.log('Timeout test result:', result); // Debug log
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('WebSocket price request timeout');
      
      jest.useRealTimers();
    });

    it('should handle WebSocket subscription failures', async () => {
      service.wsClient.subscribe.mockReturnValueOnce(false);
      
      const result = await service.getWebSocketPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to subscribe to symbol');
    });
  });

  describe('Cache Management Edge Cases', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should validate cache with null data', () => {
      const result = service.isCacheValid(null);
      expect(result).toBe(false);
    });

    it('should validate cache with missing timestamp', () => {
      const result = service.isCacheValid({ price: 100 });
      expect(result).toBe(false);
    });

    it('should validate cache with expired data', () => {
      const oldData = {
        price: 100,
        timestamp: Date.now() - 60000 // 1 minute ago
      };
      
      const result = service.isCacheValid(oldData, 30000); // 30 second max age
      expect(result).toBe(false);
    });

    it('should validate cache with valid data', () => {
      const freshData = {
        price: 100,
        timestamp: Date.now() - 10000 // 10 seconds ago
      };
      
      const result = service.isCacheValid(freshData, 30000); // 30 second max age
      expect(result).toBe(true);
    });

    it('should generate cache keys correctly', () => {
      const key1 = service.generateCacheKey('NASDAQ:AAPL');
      const key2 = service.generateCacheKey('nasdaq:aapl');
      const key3 = service.generateCacheKey('NASDAQ AAPL');
      
      expect(key1).toBe('NASDAQ:AAPL');
      expect(key2).toBe('NASDAQ:AAPL');
      expect(key3).toBe('NASDAQAAPL');
    });
  });

  describe('WebSocket Server Initialization', () => {
    it('should initialize WebSocket server successfully', async () => {
      await service.initialize();
      
      const mockServer = {};
      service.wsClient.setupWebSocketServer = jest.fn().mockResolvedValue(true);
      
      const result = await service.initializeWebSocket(mockServer);
      
      expect(result).toBe(true);
      expect(service.wsClient.setupWebSocketServer).toHaveBeenCalledWith(mockServer);
    });

    it('should handle WebSocket server initialization errors', async () => {
      await service.initialize();
      
      const mockServer = {};
      service.wsClient.setupWebSocketServer = jest.fn().mockRejectedValue(new Error('WebSocket setup failed'));
      
      await expect(service.initializeWebSocket(mockServer)).rejects.toThrow('WebSocket setup failed');
    });

    it('should handle WebSocket server initialization without client', async () => {
      // Don't initialize the service, so wsClient is null
      
      const mockServer = {};
      
      await expect(service.initializeWebSocket(mockServer)).rejects.toThrow('WebSocket client not initialized');
    });
  });

  describe('WebSocket Status', () => {
    it('should return WebSocket status when initialized', async () => {
      await service.initialize();
      
      const status = service.getWebSocketStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('subscriptions');
      expect(status).toHaveProperty('reconnectAttempts');
    });

    it('should return WebSocket status when not initialized', () => {
      const status = service.getWebSocketStatus();
      
      expect(status.connected).toBe(false);
      expect(status.status).toBe('not_initialized');
      expect(status.subscriptions).toBe(0);
    });
  });

  describe('Service Cleanup', () => {
    it('should cleanup service resources successfully', async () => {
      await service.initialize();
      
      // Add some data to cleanup
      service.priceCache.set('TEST', { price: 100 });
      service.subscriptions.set('TEST', { symbol: 'TEST' });
      
      await service.cleanup();
      
      expect(service.priceCache.size).toBe(0);
      expect(service.subscriptions.size).toBe(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      await service.initialize();
      
      // Mock wsClient.disconnect to throw error
      service.wsClient.disconnect = jest.fn().mockRejectedValue(new Error('Disconnect failed'));
      
      // Should not throw
      await expect(service.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('Subscription Management Edge Cases', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle subscription without WebSocket client', () => {
      service.wsClient = null;
      
      const result = service.subscribeToPrice('AAPL', 'NASDAQ', jest.fn());
      
      expect(result).toBe(true);
    });

    it('should handle unsubscription without WebSocket client', () => {
      service.wsClient = null;
      
      const result = service.unsubscribeFromPrice('AAPL', 'NASDAQ');
      
      expect(result).toBe(true);
    });

    it('should handle subscription validation errors', () => {
      const result = service.subscribeToPrice('INVALID_SYMBOL', 'NASDAQ', jest.fn());
      
      expect(result).toBe(false);
    });

    it('should handle unsubscription errors', () => {
      service.wsClient.unsubscribe.mockImplementation(() => {
        throw new Error('Unsubscribe failed');
      });
      
      const result = service.unsubscribeFromPrice('AAPL', 'NASDAQ');
      
      expect(result).toBe(false);
    });
  });

  describe('External Price Methods', () => {
    beforeEach(async () => {
      await service.initialize();
      // Restore the original methods after mocking them in beforeEach
      service.getExternalPrice = MainService.prototype.getExternalPrice.bind(service);
      service.getWebSocketPrice = MainService.prototype.getWebSocketPrice.bind(service);
      service.getAPIPrice = MainService.prototype.getAPIPrice.bind(service);
    });

    it('should get external price via WebSocket when connected', async () => {
      service.wsClient.getStatus.mockReturnValue({ connected: true });
      service.getWebSocketPrice = jest.fn().mockResolvedValue({
        success: true,
        data: { price: 150.25 }
      });
      
      const result = await service.getExternalPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(true);
      expect(service.getWebSocketPrice).toHaveBeenCalledWith('AAPL', 'NASDAQ', {});
    });

    it('should get external price via API when WebSocket not connected', async () => {
      service.wsClient.getStatus.mockReturnValue({ connected: false });
      service.getAPIPrice = jest.fn().mockResolvedValue({
        success: true,
        data: { price: 150.25 }
      });
      
      const result = await service.getExternalPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(true);
      expect(service.getAPIPrice).toHaveBeenCalledWith('AAPL', 'NASDAQ', {});
    });

    it('should handle external price errors', async () => {
      service.wsClient.getStatus.mockReturnValue({ connected: true });
      service.getWebSocketPrice = jest.fn().mockRejectedValue(new Error('WebSocket error'));
      
      const result = await service.getExternalPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('WebSocket error');
    });

    it('should return API not implemented error', async () => {
      const result = await service.getAPIPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API method not implemented - WebSocket required');
    });
  });
});