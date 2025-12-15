/**
 * Integration tests for database and service module interactions
 * Tests cross-module functionality and data flow
 */

const { dbManager, crudOperations } = require('../../modules/database/sql');
const MainService = require('../../modules/services/main-service');
const { Logger } = require('../../modules/utils/helpers');

// Mock dependencies
jest.mock('../../modules/database/sql');
jest.mock('../../modules/utils/helpers');

describe('Database-Service Integration Tests', () => {
  let service;
  let mockDbManager;
  let mockCrudOperations;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
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
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    // Replace actual modules with mocks
    dbManager.getConnection = mockDbManager.getConnection;
    dbManager.releaseConnection = mockDbManager.releaseConnection;
    dbManager.healthCheck = mockDbManager.healthCheck;
    
    crudOperations.insert = mockCrudOperations.insert;
    crudOperations.select = mockCrudOperations.select;
    crudOperations.update = mockCrudOperations.update;
    crudOperations.delete = mockCrudOperations.delete;
    
    service = new MainService();
  });

  describe('Price Data Storage and Retrieval', () => {
    it('should store price data in database and retrieve it', async () => {
      const testData = {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        price: 150.00,
        timestamp: Date.now()
      };
      
      // Mock database operations
      mockCrudOperations.insert.mockResolvedValue({ insertId: 1 });
      mockCrudOperations.select.mockResolvedValue([testData]);
      
      // Store price data
      const storeResult = await service.storePriceData(testData);
      expect(storeResult.success).toBe(true);
      expect(mockCrudOperations.insert).toHaveBeenCalledWith(
        'price_history',
        expect.objectContaining({
          symbol: 'AAPL',
          price: 150.00
        })
      );
      
      // Retrieve price data
      const retrieveResult = await service.getPriceHistory('AAPL');
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data).toEqual([testData]);
    });

    it('should handle database errors during price storage', async () => {
      const testData = {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        price: 150.00,
        timestamp: Date.now()
      };
      
      // Mock database error
      mockCrudOperations.insert.mockRejectedValue(new Error('Database connection lost'));
      
      const result = await service.storePriceData(testData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection lost');
    });

    it('should validate data before database operations', async () => {
      const invalidData = {
        symbol: '', // Invalid symbol
        exchange: 'NASDAQ',
        price: -100, // Invalid price
        timestamp: Date.now()
      };
      
      const result = await service.storePriceData(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
      expect(mockCrudOperations.insert).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    it('should track active subscriptions in database', async () => {
      const subscription = {
        symbol: 'TSLA',
        exchange: 'NASDAQ',
        userId: 'user123',
        createdAt: Date.now()
      };
      
      mockCrudOperations.insert.mockResolvedValue({ insertId: 1 });
      mockCrudOperations.select.mockResolvedValue([subscription]);
      
      // Add subscription
      const addResult = await service.addSubscription(subscription);
      expect(addResult.success).toBe(true);
      
      // Get user subscriptions
      const getResult = await service.getUserSubscriptions('user123');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toHaveLength(1);
      expect(getResult.data[0].symbol).toBe('TSLA');
    });

    it('should remove subscriptions from database', async () => {
      const subscriptionId = 1;
      
      mockCrudOperations.delete.mockResolvedValue({ affectedRows: 1 });
      
      const result = await service.removeSubscription(subscriptionId);
      expect(result.success).toBe(true);
      expect(mockCrudOperations.delete).toHaveBeenCalledWith(
        'subscriptions',
        { id: subscriptionId }
      );
    });
  });

  describe('Performance Metrics Storage', () => {
    it('should store service performance metrics', async () => {
      const metrics = {
        service: 'MainService',
        cacheHits: 100,
        cacheMisses: 20,
        apiCalls: 120,
        averageResponseTime: 150,
        timestamp: Date.now()
      };
      
      mockCrudOperations.insert.mockResolvedValue({ insertId: 1 });
      
      const result = await service.storeMetrics(metrics);
      expect(result.success).toBe(true);
      expect(mockCrudOperations.insert).toHaveBeenCalledWith(
        'performance_metrics',
        expect.objectContaining({
          service: 'MainService',
          cache_hits: 100,
          cache_misses: 20
        })
      );
    });
  });

  describe('Health Check Integration', () => {
    it('should report database health in service health check', async () => {
      mockDbManager.healthCheck.mockResolvedValue({
        status: 'healthy',
        connections: 5,
        uptime: 1000
      });
      
      const healthCheck = await service.healthCheck();
      expect(healthCheck.database).toEqual({
        status: 'healthy',
        connections: 5,
        uptime: 1000
      });
    });

    it('should handle unhealthy database in health check', async () => {
      mockDbManager.healthCheck.mockRejectedValue(new Error('Connection failed'));
      
      const healthCheck = await service.healthCheck();
      expect(healthCheck.database.status).toBe('unhealthy');
      expect(healthCheck.database.error).toContain('Connection failed');
    });
  });

  describe('Transaction Management', () => {
    it('should handle database transactions for complex operations', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        query: jest.fn()
      };
      
      mockDbManager.getConnection.mockResolvedValue(mockConnection);
      
      // Simulate a complex operation that requires transaction
      const complexOperation = async () => {
        const connection = await dbManager.getConnection();
        try {
          await connection.beginTransaction();
          
          // Multiple database operations
          await crudOperations.insert('table1', { data: 'test1' });
          await crudOperations.insert('table2', { data: 'test2' });
          
          await connection.commit();
          return { success: true };
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          dbManager.releaseConnection(connection);
        }
      };
      
      const result = await complexOperation();
      expect(result.success).toBe(true);
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.rollback).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        query: jest.fn()
      };
      
      mockDbManager.getConnection.mockResolvedValue(mockConnection);
      mockCrudOperations.insert.mockRejectedValue(new Error('Insert failed'));
      
      const complexOperation = async () => {
        const connection = await dbManager.getConnection();
        try {
          await connection.beginTransaction();
          await crudOperations.insert('table1', { data: 'test1' });
          await connection.commit();
          return { success: true };
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          dbManager.releaseConnection(connection);
        }
      };
      
      await expect(complexOperation()).rejects.toThrow('Insert failed');
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
    });
  });
});