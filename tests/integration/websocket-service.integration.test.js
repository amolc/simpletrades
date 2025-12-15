/**
 * Integration tests for WebSocket and service module interactions
 * Tests real-time data flow and subscription management
 */

const TradingViewWebSocket = require('../../modules/websocket/tradingview-websocket');
const MainService = require('../../modules/services/main-service');
const { Logger } = require('../../modules/utils/helpers');

// Mock dependencies
jest.mock('../../modules/utils/helpers');

// Mock WebSocket for testing
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.sentMessages = [];
  }

  send(data) {
    this.sentMessages.push(JSON.parse(data));
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure' });
    }
  }

  // Helper method to simulate incoming messages
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

describe('WebSocket-Service Integration Tests', () => {
  let wsClient;
  let service;
  let mockWebSocket;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock WebSocket instance
    mockWebSocket = new MockWebSocket('wss://test.tradingview.com');
    
    // Create WebSocket client with mocked WebSocket
    wsClient = new TradingViewWebSocket();
    wsClient.ws = mockWebSocket;
    wsClient.isConnected = true;
    wsClient.reconnectAttempts = 0;
    
    // Create service instance
    service = new MainService();
    
    // Mock Logger
    Logger.info = jest.fn();
    Logger.error = jest.fn();
    Logger.warn = jest.fn();
  });

  describe('Real-time Price Updates', () => {
    it('should receive price updates and update service cache', async () => {
      const symbol = 'AAPL';
      const priceData = {
        s: 'NASDAQ:AAPL',
        lp: 150.00,
        ch: 2.50,
        chp: 1.69,
        t: Date.now()
      };
      
      // Subscribe to symbol through service
      await service.subscribeToSymbol(symbol, 'NASDAQ');
      
      // Simulate incoming price update
      mockWebSocket.simulateMessage({
        data: [priceData]
      });
      
      // Verify cache was updated
      const cacheKey = service.generateCacheKey('NASDAQ:AAPL');
      const cachedData = service.priceCache.get(cacheKey);
      
      expect(cachedData).toBeDefined();
      expect(cachedData.symbol).toBe('AAPL');
      expect(cachedData.price).toBe(150.00);
      expect(cachedData.change).toBe(2.50);
      expect(cachedData.changePercent).toBe(1.69);
    });

    it('should handle multiple symbol subscriptions', async () => {
      const symbols = ['AAPL', 'GOOGL', 'TSLA'];
      
      // Subscribe to multiple symbols
      for (const symbol of symbols) {
        await service.subscribeToSymbol(symbol, 'NASDAQ');
      }
      
      // Simulate price updates for all symbols
      symbols.forEach((symbol, index) => {
        const priceData = {
          s: `NASDAQ:${symbol}`,
          lp: 100 + index * 50,
          ch: 1 + index,
          chp: 0.5 + index * 0.2,
          t: Date.now()
        };
        
        mockWebSocket.simulateMessage({
          data: [priceData]
        });
      });
      
      // Verify all symbols are cached
      symbols.forEach((symbol, index) => {
        const cacheKey = service.generateCacheKey(`NASDAQ:${symbol}`);
        const cachedData = service.priceCache.get(cacheKey);
        
        expect(cachedData).toBeDefined();
        expect(cachedData.symbol).toBe(symbol);
        expect(cachedData.price).toBe(100 + index * 50);
      });
    });

    it('should handle WebSocket reconnection and resubscribe', async () => {
      const symbol = 'AAPL';
      
      // Subscribe to symbol
      await service.subscribeToSymbol(symbol, 'NASDAQ');
      
      // Simulate WebSocket disconnection
      mockWebSocket.readyState = 3; // CLOSED
      wsClient.isConnected = false;
      
      // Simulate reconnection
      const newMockWebSocket = new MockWebSocket('wss://test.tradingview.com');
      wsClient.ws = newMockWebSocket;
      wsClient.isConnected = true;
      
      // Trigger resubscription
      await wsClient.resubscribeAll();
      
      // Verify resubscription message was sent
      const subscribeMessages = newMockWebSocket.sentMessages.filter(
        msg => msg.m === 'quote_add_symbols'
      );
      expect(subscribeMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle WebSocket errors gracefully', async () => {
      const symbol = 'AAPL';
      const errorMessage = 'Connection timeout';
      
      // Subscribe to symbol
      await service.subscribeToSymbol(symbol, 'NASDAQ');
      
      // Simulate WebSocket error
      mockWebSocket.simulateError(new Error(errorMessage));
      
      // Verify error was logged
      expect(Logger.error).toHaveBeenCalledWith(
        'WebSocket error:',
        expect.objectContaining({ message: errorMessage })
      );
    });

    it('should handle malformed data messages', async () => {
      const malformedData = {
        invalid: 'data',
        missing_required_fields: true
      };
      
      // Simulate malformed message
      mockWebSocket.simulateMessage({
        data: [malformedData]
      });
      
      // Verify error was logged
      expect(Logger.warn).toHaveBeenCalledWith(
        'Received malformed data message:',
        expect.any(String)
      );
    });

    it('should handle service cache errors', async () => {
      const symbol = 'AAPL';
      const priceData = {
        s: 'NASDAQ:AAPL',
        lp: 150.00,
        ch: 2.50,
        chp: 1.69,
        t: Date.now()
      };
      
      // Mock cache to throw error
      service.priceCache.set = jest.fn().mockImplementation(() => {
        throw new Error('Cache storage failed');
      });
      
      // Subscribe and receive data
      await service.subscribeToSymbol(symbol, 'NASDAQ');
      mockWebSocket.simulateMessage({
        data: [priceData]
      });
      
      // Verify error was handled
      expect(Logger.error).toHaveBeenCalledWith(
        'Failed to cache price data:',
        expect.any(Error)
      );
    });
  });

  describe('Subscription Management', () => {
    it('should unsubscribe from symbols and stop receiving updates', async () => {
      const symbol = 'AAPL';
      
      // Subscribe to symbol
      await service.subscribeToSymbol(symbol, 'NASDAQ');
      
      // Unsubscribe from symbol
      await service.unsubscribeFromSymbol(symbol, 'NASDAQ');
      
      // Send price update after unsubscribe
      const priceData = {
        s: 'NASDAQ:AAPL',
        lp: 150.00,
        ch: 2.50,
        chp: 1.69,
        t: Date.now()
      };
      
      mockWebSocket.simulateMessage({
        data: [priceData]
      });
      
      // Verify cache was not updated
      const cacheKey = service.generateCacheKey('NASDAQ:AAPL');
      const cachedData = service.priceCache.get(cacheKey);
      expect(cachedData).toBeUndefined();
    });

    it('should handle subscription conflicts', async () => {
      const symbol = 'AAPL';
      
      // Subscribe to same symbol multiple times
      await service.subscribeToSymbol(symbol, 'NASDAQ');
      const firstSubscriptionCount = wsClient.subscriptions.size;
      
      await service.subscribeToSymbol(symbol, 'NASDAQ');
      const secondSubscriptionCount = wsClient.subscriptions.size;
      
      // Verify no duplicate subscriptions
      expect(secondSubscriptionCount).toBe(firstSubscriptionCount);
    });
  });

  describe('Data Transformation', () => {
    it('should transform WebSocket data to service format', async () => {
      const wsData = {
        s: 'NASDAQ:AAPL',
        lp: 150.00,
        ch: 2.50,
        chp: 1.69,
        t: 1234567890000
      };
      
      // Subscribe and receive data
      await service.subscribeToSymbol('AAPL', 'NASDAQ');
      mockWebSocket.simulateMessage({
        data: [wsData]
      });
      
      // Get transformed data from service
      const result = await service.getPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        symbol: 'AAPL',
        price: 150.00,
        change: 2.50,
        changePercent: 1.69,
        timestamp: 1234567890000,
        exchange: 'NASDAQ'
      });
    });

    it('should handle missing optional fields', async () => {
      const minimalData = {
        s: 'NASDAQ:AAPL',
        lp: 150.00,
        t: Date.now()
      };
      
      // Subscribe and receive minimal data
      await service.subscribeToSymbol('AAPL', 'NASDAQ');
      mockWebSocket.simulateMessage({
        data: [minimalData]
      });
      
      // Get data from service
      const result = await service.getPrice('AAPL', 'NASDAQ');
      
      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('AAPL');
      expect(result.data.price).toBe(150.00);
      expect(result.data.change).toBe(0); // Default value
      expect(result.data.changePercent).toBe(0); // Default value
    });
  });

  describe('Performance and Load', () => {
    it('should handle rapid price updates efficiently', async () => {
      const symbol = 'AAPL';
      const updateCount = 100;
      
      // Subscribe to symbol
      await service.subscribeToSymbol(symbol, 'NASDAQ');
      
      // Simulate rapid updates
      const startTime = Date.now();
      for (let i = 0; i < updateCount; i++) {
        const priceData = {
          s: 'NASDAQ:AAPL',
          lp: 150.00 + i * 0.01,
          ch: 1 + i * 0.1,
          chp: 0.5 + i * 0.01,
          t: Date.now()
        };
        
        mockWebSocket.simulateMessage({
          data: [priceData]
        });
      }
      const endTime = Date.now();
      
      // Verify performance
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // Should process 100 updates in under 1 second
      
      // Verify final cache state
      const cacheKey = service.generateCacheKey('NASDAQ:AAPL');
      const cachedData = service.priceCache.get(cacheKey);
      expect(cachedData.price).toBe(150.00 + (updateCount - 1) * 0.01);
    });

    it('should handle large subscription lists', async () => {
      const symbolCount = 50;
      const symbols = [];
      
      // Create many symbols
      for (let i = 0; i < symbolCount; i++) {
        symbols.push(`STOCK${i}`);
      }
      
      // Subscribe to all symbols
      const startTime = Date.now();
      for (const symbol of symbols) {
        await service.subscribeToSymbol(symbol, 'NASDAQ');
      }
      const endTime = Date.now();
      
      // Verify performance
      const subscriptionTime = endTime - startTime;
      expect(subscriptionTime).toBeLessThan(5000); // Should subscribe to 50 symbols in under 5 seconds
      
      // Verify all subscriptions exist
      expect(wsClient.subscriptions.size).toBe(symbolCount);
    });
  });
});