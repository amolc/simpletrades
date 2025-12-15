/**
 * System flow integration tests
 * Tests complete user workflows and end-to-end scenarios
 */

const request = require('supertest');
const app = require('../../server');
const { dbManager, crudOperations } = require('../../modules/database/sql');
const TradingViewWebSocket = require('../../modules/websocket/tradingview-websocket');
const MainService = require('../../modules/services/main-service');

// Mock dependencies
jest.mock('../../modules/database/sql');
jest.mock('../../modules/websocket/tradingview-websocket');
jest.mock('../../modules/utils/helpers');

describe('System Flow Integration Tests', () => {
  let mockDbManager;
  let mockCrudOperations;
  let mockWebSocketClient;
  let mockService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup database mocks
    mockDbManager = {
      getConnection: jest.fn(),
      releaseConnection: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        connections: 5,
        uptime: 1000
      })
    };
    
    mockCrudOperations = {
      insert: jest.fn().mockResolvedValue({ insertId: 1 }),
      select: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affectedRows: 1 }),
      delete: jest.fn().mockResolvedValue({ affectedRows: 1 })
    };
    
    dbManager.getConnection = mockDbManager.getConnection;
    dbManager.releaseConnection = mockDbManager.releaseConnection;
    dbManager.healthCheck = mockDbManager.healthCheck;
    
    crudOperations.insert = mockCrudOperations.insert;
    crudOperations.select = mockCrudOperations.select;
    crudOperations.update = mockCrudOperations.update;
    crudOperations.delete = mockCrudOperations.delete;
    
    // Setup WebSocket mock
    mockWebSocketClient = {
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      subscribe: jest.fn().mockResolvedValue(true),
      unsubscribe: jest.fn().mockResolvedValue(true),
      isConnected: true,
      subscriptions: new Map()
    };
    
    TradingViewWebSocket.mockImplementation(() => mockWebSocketClient);
    
    // Setup service mock
    mockService = {
      getPrice: jest.fn(),
      subscribeToSymbol: jest.fn().mockResolvedValue({ success: true }),
      unsubscribeFromSymbol: jest.fn().mockResolvedValue({ success: true }),
      getUserSubscriptions: jest.fn().mockResolvedValue({
        success: true,
        data: []
      }),
      storePriceData: jest.fn().mockResolvedValue({ success: true }),
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        database: { status: 'healthy' },
        websocket: { status: 'connected' },
        cache: { status: 'healthy' }
      })
    };
    
    MainService.mockImplementation(() => mockService);
  });

  describe('Complete User Workflow', () => {
    it('should handle complete stock price monitoring workflow', async () => {
      // Step 1: User requests stock price
      const symbol = 'AAPL';
      const exchange = 'NASDAQ';
      const mockPriceData = {
        symbol: 'AAPL',
        price: 150.00,
        change: 2.50,
        changePercent: 1.69,
        timestamp: Date.now(),
        exchange: 'NASDAQ'
      };
      
      mockService.getPrice.mockResolvedValue({
        success: true,
        data: mockPriceData,
        source: 'api'
      });
      
      const priceResponse = await request(app)
        .get(`/api/price/${symbol}`)
        .query({ exchange })
        .expect(200);
      
      expect(priceResponse.body.success).toBe(true);
      expect(priceResponse.body.data.symbol).toBe(symbol);
      expect(priceResponse.body.data.price).toBe(150.00);
      
      // Step 2: User subscribes to real-time updates
      const subscribeResponse = await request(app)
        .post('/api/subscribe')
        .send({ symbol, exchange, userId: 'user123' })
        .expect(200);
      
      expect(subscribeResponse.body.success).toBe(true);
      expect(mockService.subscribeToSymbol).toHaveBeenCalledWith(symbol, exchange);
      
      // Step 3: Verify subscription is tracked
      mockService.getUserSubscriptions.mockResolvedValue({
        success: true,
        data: [{ symbol, exchange, userId: 'user123' }]
      });
      
      const subscriptionsResponse = await request(app)
        .get('/api/subscriptions/user123')
        .expect(200);
      
      expect(subscriptionsResponse.body.success).toBe(true);
      expect(subscriptionsResponse.body.data).toHaveLength(1);
      expect(subscriptionsResponse.body.data[0].symbol).toBe(symbol);
      
      // Step 4: User unsubscribes
      const unsubscribeResponse = await request(app)
        .delete('/api/unsubscribe')
        .send({ symbol, exchange, userId: 'user123' })
        .expect(200);
      
      expect(unsubscribeResponse.body.success).toBe(true);
      expect(mockService.unsubscribeFromSymbol).toHaveBeenCalledWith(symbol, exchange);
    });

    it('should handle user registration and setup', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'securepassword123'
      };
      
      // Mock user creation
      mockCrudOperations.insert.mockResolvedValue({ insertId: 1 });
      
      const registerResponse = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);
      
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.userId).toBe(1);
      
      // Mock user retrieval
      mockCrudOperations.select.mockResolvedValue([{
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      }]);
      
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(200);
      
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database failure
      mockDbManager.healthCheck.mockRejectedValue(new Error('Database connection failed'));
      mockService.getPrice.mockRejectedValue(new Error('Database unavailable'));
      
      const response = await request(app)
        .get('/api/price/AAPL')
        .query({ exchange: 'NASDAQ' })
        .expect(503);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database unavailable');
    });

    it('should handle WebSocket connection failures', async () => {
      // Mock WebSocket failure
      mockWebSocketClient.isConnected = false;
      mockService.subscribeToSymbol.mockRejectedValue(new Error('WebSocket not connected'));
      
      const response = await request(app)
        .post('/api/subscribe')
        .send({ symbol: 'AAPL', exchange: 'NASDAQ', userId: 'user123' })
        .expect(503);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('WebSocket not connected');
    });

    it('should handle invalid input validation', async () => {
      // Test invalid symbol
      const response = await request(app)
        .get('/api/price/INVALID@SYMBOL')
        .query({ exchange: 'NASDAQ' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid symbol');
      
      // Test missing parameters
      const missingParamResponse = await request(app)
        .post('/api/subscribe')
        .send({ symbol: 'AAPL' }) // Missing exchange and userId
        .expect(400);
      
      expect(missingParamResponse.body.success).toBe(false);
      expect(missingParamResponse.body.error).toContain('Missing required parameters');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent price requests', async () => {
      const symbols = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN'];
      
      // Mock successful price responses
      symbols.forEach(symbol => {
        mockService.getPrice.mockResolvedValueOnce({
          success: true,
          data: {
            symbol,
            price: 100 + Math.random() * 200,
            change: Math.random() * 10 - 5,
            changePercent: Math.random() * 5 - 2.5,
            timestamp: Date.now(),
            exchange: 'NASDAQ'
          },
          source: 'api'
        });
      });
      
      // Make concurrent requests
      const startTime = Date.now();
      const responses = await Promise.all(
        symbols.map(symbol =>
          request(app)
            .get(`/api/price/${symbol}`)
            .query({ exchange: 'NASDAQ' })
        )
      );
      const endTime = Date.now();
      
      // Verify all requests succeeded
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.symbol).toBe(symbols[index]);
      });
      
      // Verify performance
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // All requests should complete within 5 seconds
    });

    it('should handle rapid subscription/unsubscription cycles', async () => {
      const cycles = 10;
      const symbol = 'AAPL';
      const exchange = 'NASDAQ';
      
      const startTime = Date.now();
      
      for (let i = 0; i < cycles; i++) {
        // Subscribe
        await request(app)
          .post('/api/subscribe')
          .send({ symbol, exchange, userId: 'user123' })
          .expect(200);
        
        // Unsubscribe
        await request(app)
          .delete('/api/unsubscribe')
          .send({ symbol, exchange, userId: 'user123' })
          .expect(200);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Verify performance
      expect(totalTime).toBeLessThan(10000); // 10 cycles should complete within 10 seconds
      expect(mockService.subscribeToSymbol).toHaveBeenCalledTimes(cycles);
      expect(mockService.unsubscribeFromSymbol).toHaveBeenCalledTimes(cycles);
    });
  });

  describe('Health Monitoring', () => {
    it('should provide comprehensive system health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
      expect(response.body.components).toBeDefined();
      expect(response.body.components.database).toBeDefined();
      expect(response.body.components.websocket).toBeDefined();
      expect(response.body.components.cache).toBeDefined();
    });

    it('should detect and report system issues', async () => {
      // Mock unhealthy components
      mockDbManager.healthCheck.mockRejectedValue(new Error('Database down'));
      mockWebSocketClient.isConnected = false;
      mockService.healthCheck.mockResolvedValue({
        status: 'unhealthy',
        database: { status: 'unhealthy', error: 'Database down' },
        websocket: { status: 'disconnected' },
        cache: { status: 'healthy' }
      });
      
      const response = await request(app)
        .get('/health')
        .expect(503);
      
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.components.database.status).toBe('unhealthy');
      expect(response.body.components.websocket.status).toBe('disconnected');
    });
  });

  describe('Data Persistence and Recovery', () => {
    it('should persist price data and recover after restart', async () => {
      const priceData = {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        price: 150.00,
        timestamp: Date.now()
      };
      
      // Mock storing price data
      mockService.storePriceData.mockResolvedValue({ success: true });
      
      // Store price data
      const storeResponse = await request(app)
        .post('/api/price/store')
        .send(priceData)
        .expect(200);
      
      expect(storeResponse.body.success).toBe(true);
      
      // Mock retrieving stored data after "restart"
      mockCrudOperations.select.mockResolvedValue([priceData]);
      
      const historyResponse = await request(app)
        .get('/api/price/history/AAPL')
        .query({ exchange: 'NASDAQ', limit: 100 })
        .expect(200);
      
      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data).toHaveLength(1);
      expect(historyResponse.body.data[0].price).toBe(150.00);
    });

    it('should handle data corruption gracefully', async () => {
      // Mock corrupted data retrieval
      mockCrudOperations.select.mockRejectedValue(new Error('Data corruption detected'));
      
      const response = await request(app)
        .get('/api/price/history/AAPL')
        .query({ exchange: 'NASDAQ' })
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Data corruption detected');
    });
  });
});