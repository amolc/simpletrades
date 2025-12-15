/**
 * Unit tests for database module - Testing actual implementation
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');

// Mock Sequelize
const mockSequelize = {
  authenticate: jest.fn(),
  close: jest.fn(),
  query: jest.fn(),
  transaction: jest.fn(),
  getQueryInterface: jest.fn()
};

const mockQueryInterface = {
  describeTable: jest.fn(),
  showAllTables: jest.fn()
};

// Mock the sequelize module
jest.mock('sequelize', () => {
  return {
    Sequelize: jest.fn().mockImplementation(() => mockSequelize),
    QueryTypes: {
      SELECT: 'SELECT',
      RAW: 'RAW'
    }
  };
});

// Mock logger
jest.mock('../../modules/utils/helpers', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Import the actual modules after mocking
const { DatabaseManager, CRUDOperations, dbManager, crudOperations } = require('../../modules/database/sql');

describe('Database Module - Real Implementation', () => {
  let databaseManager;
  let crudOps;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create fresh instances for each test
    databaseManager = new DatabaseManager();
    crudOps = new CRUDOperations(databaseManager);
    mockSequelize.getQueryInterface.mockReturnValue(mockQueryInterface);
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('DatabaseManager', () => {
    it('should initialize successfully', async () => {
      mockSequelize.authenticate.mockResolvedValueOnce(undefined);

      const result = await databaseManager.initialize();
      
      expect(result).toBe(true);
      expect(databaseManager.isConnected).toBe(true);
      expect(mockSequelize.authenticate).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      const error = new Error('Connection failed');
      mockSequelize.authenticate.mockRejectedValueOnce(error);

      await expect(databaseManager.initialize()).rejects.toThrow('Connection failed');
      expect(databaseManager.isConnected).toBe(false);
    });

    it('should close connection successfully', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      mockSequelize.close.mockResolvedValueOnce(undefined);

      await databaseManager.close();
      
      expect(databaseManager.isConnected).toBe(false);
      expect(mockSequelize.close).toHaveBeenCalled();
    });

    it('should handle close when not connected', async () => {
      databaseManager.isConnected = false;
      databaseManager.sequelize = null;

      await databaseManager.close();
      
      expect(databaseManager.isConnected).toBe(false);
    });

    it('should execute query when connected', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResults = [{ id: 1, name: 'test' }];
      mockSequelize.query.mockResolvedValueOnce([mockResults]);

      const results = await databaseManager.query('SELECT * FROM users');
      
      expect(results).toEqual([mockResults]);
      expect(mockSequelize.query).toHaveBeenCalledWith('SELECT * FROM users', {
        replacements: {},
        type: 'SELECT'
      });
    });

    it('should execute query with custom options', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResults = [{ id: 1, name: 'test' }];
      mockSequelize.query.mockResolvedValueOnce([mockResults]);

      const results = await databaseManager.query('SELECT * FROM users WHERE id = ?', { id: 1 }, { type: 'RAW' });
      
      expect(results).toEqual([mockResults]);
      expect(mockSequelize.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', {
        replacements: { id: 1 },
        type: 'RAW'
      });
    });

    it('should handle query execution errors', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const error = new Error('Query failed');
      mockSequelize.query.mockRejectedValueOnce(error);

      await expect(databaseManager.query('INVALID SQL')).rejects.toThrow('Query failed');
    });

    it('should throw error when querying while not connected', async () => {
      databaseManager.isConnected = false;

      await expect(databaseManager.query('SELECT * FROM users')).rejects.toThrow('Database not connected');
    });

    it('should execute raw query when connected', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResults = { insertId: 1 };
      mockSequelize.query.mockResolvedValueOnce([mockResults, { affectedRows: 1 }]);

      const result = await databaseManager.execute('INSERT INTO users (name) VALUES (?)', ['test']);
      
      expect(result).toEqual({ results: mockResults, metadata: { affectedRows: 1 } });
      expect(mockSequelize.query).toHaveBeenCalledWith('INSERT INTO users (name) VALUES (?)', {
        replacements: ['test'],
        type: 'RAW'
      });
    });

    it('should handle execute query errors', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const error = new Error('Execute failed');
      mockSequelize.query.mockRejectedValueOnce(error);

      await expect(databaseManager.execute('INVALID SQL')).rejects.toThrow('Execute failed');
    });

    it('should throw error when executing while not connected', async () => {
      databaseManager.isConnected = false;

      await expect(databaseManager.execute('INSERT INTO users (name) VALUES (?)', ['test'])).rejects.toThrow('Database not connected');
    });

    it('should get transaction when connected', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      mockSequelize.transaction.mockResolvedValueOnce(mockTransaction);

      const transaction = await databaseManager.getTransaction();
      
      expect(transaction).toBe(mockTransaction);
      expect(mockSequelize.transaction).toHaveBeenCalled();
    });

    it('should throw error when getting transaction while not connected', async () => {
      databaseManager.isConnected = false;

      await expect(databaseManager.getTransaction()).rejects.toThrow('Database not connected');
    });

    it('should get table schema', async () => {
      databaseManager.sequelize = mockSequelize;
      const mockSchema = { id: { type: 'INTEGER', allowNull: false } };
      mockQueryInterface.describeTable.mockResolvedValueOnce(mockSchema);

      const schema = await databaseManager.getTableSchema('users');
      
      expect(schema).toBe(mockSchema);
      expect(mockQueryInterface.describeTable).toHaveBeenCalledWith('users');
    });

    it('should check if table exists', async () => {
      databaseManager.sequelize = mockSequelize;
      mockQueryInterface.showAllTables.mockResolvedValueOnce(['users', 'posts']);

      const exists = await databaseManager.tableExists('users');
      
      expect(exists).toBe(true);
      expect(mockQueryInterface.showAllTables).toHaveBeenCalled();
    });

    it('should return false when table does not exist', async () => {
      databaseManager.sequelize = mockSequelize;
      mockQueryInterface.showAllTables.mockResolvedValueOnce(['posts']);

      const exists = await databaseManager.tableExists('users');
      
      expect(exists).toBe(false);
    });

    it('should get healthy status when connected', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      mockSequelize.query.mockResolvedValueOnce([[{ '1': 1 }]]);

      const health = await databaseManager.getHealthStatus();
      
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.responseTime).toMatch(/\d+ms/);
      expect(health.timestamp).toBeDefined();
    });

    it('should get unhealthy status when connection fails', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      mockSequelize.query.mockRejectedValueOnce(new Error('Connection lost'));

      const health = await databaseManager.getHealthStatus();
      
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
      expect(health.error).toBe('Connection lost');
    });

    it('should handle getTableSchema errors', async () => {
      databaseManager.sequelize = mockSequelize;
      const error = new Error('Table not found');
      mockQueryInterface.describeTable.mockRejectedValueOnce(error);

      await expect(databaseManager.getTableSchema('nonexistent')).rejects.toThrow('Table not found');
      expect(mockQueryInterface.describeTable).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle tableExists errors', async () => {
      databaseManager.sequelize = mockSequelize;
      const error = new Error('Database error');
      mockQueryInterface.showAllTables.mockRejectedValueOnce(error);

      await expect(databaseManager.tableExists('users')).rejects.toThrow('Database error');
      expect(mockQueryInterface.showAllTables).toHaveBeenCalled();
    });

    it('should handle query with custom options and replacements', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResults = [{ id: 1, name: 'John' }];
      mockSequelize.query.mockResolvedValueOnce(mockResults);

      const results = await databaseManager.query('SELECT * FROM users WHERE id = ?', [1], { type: 'SELECT', raw: true });
      
      expect(results).toBe(mockResults);
      expect(mockSequelize.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', {
        replacements: [1],
        type: 'SELECT',
        raw: true
      });
    });

    it('should handle execute with metadata', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResult = { results: { affectedRows: 2 }, metadata: { changedRows: 2 } };
      mockSequelize.query.mockResolvedValueOnce([mockResult.results, mockResult.metadata]);

      const result = await databaseManager.execute('UPDATE users SET active = ? WHERE created_at < ?', [false, '2023-01-01']);
      
      expect(result).toEqual(mockResult);
      expect(mockSequelize.query).toHaveBeenCalledWith('UPDATE users SET active = ? WHERE created_at < ?', {
        replacements: [false, '2023-01-01'],
        type: 'RAW'
      });
    });

    it('should handle health status with slow response', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      mockSequelize.query.mockResolvedValueOnce([[{ '1': 1 }]]);

      const health = await databaseManager.getHealthStatus();
      
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.responseTime).toMatch(/\d+ms/);
      expect(health.timestamp).toBeDefined();
    });

    it('should handle close with existing sequelize instance', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      mockSequelize.close.mockResolvedValueOnce(undefined);

      await databaseManager.close();
      
      expect(databaseManager.isConnected).toBe(false);
      expect(mockSequelize.close).toHaveBeenCalled();
    });

    it('should handle query execution with timing', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResults = [{ id: 1, name: 'John' }];
      mockSequelize.query.mockResolvedValueOnce(mockResults);

      const results = await databaseManager.query('SELECT * FROM users WHERE id = 1');
      
      expect(results).toBe(mockResults);
      expect(mockSequelize.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = 1', {
        replacements: {},
        type: 'SELECT'
      });
    });

    it('should handle execute with timing', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResult = { results: { affectedRows: 1 }, metadata: {} };
      mockSequelize.query.mockResolvedValueOnce([mockResult.results, mockResult.metadata]);

      const result = await databaseManager.execute('INSERT INTO users (name) VALUES (?)', ['John']);
      
      expect(result).toEqual(mockResult);
      expect(mockSequelize.query).toHaveBeenCalledWith('INSERT INTO users (name) VALUES (?)', {
        replacements: ['John'],
        type: 'RAW'
      });
    });

    it('should handle query with empty sql', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResults = [];
      mockSequelize.query.mockResolvedValueOnce(mockResults);

      const results = await databaseManager.query('');
      
      expect(results).toBe(mockResults);
      expect(mockSequelize.query).toHaveBeenCalledWith('', {
        replacements: {},
        type: 'SELECT'
      });
    });

    it('should handle execute with empty sql', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResult = { results: {}, metadata: {} };
      mockSequelize.query.mockResolvedValueOnce([mockResult.results, mockResult.metadata]);

      const result = await databaseManager.execute('');
      
      expect(result).toEqual(mockResult);
      expect(mockSequelize.query).toHaveBeenCalledWith('', {
        replacements: {},
        type: 'RAW'
      });
    });

    it('should handle query with undefined options', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResults = [{ id: 1, name: 'John' }];
      mockSequelize.query.mockResolvedValueOnce(mockResults);

      const results = await databaseManager.query('SELECT * FROM users');
      
      expect(results).toBe(mockResults);
      expect(mockSequelize.query).toHaveBeenCalledWith('SELECT * FROM users', {
        replacements: {},
        type: 'SELECT'
      });
    });

    it('should handle execute with undefined replacements', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockResult = { results: { affectedRows: 1 }, metadata: {} };
      mockSequelize.query.mockResolvedValueOnce([mockResult.results, mockResult.metadata]);

      const result = await databaseManager.execute('DELETE FROM users');
      
      expect(result).toEqual(mockResult);
      expect(mockSequelize.query).toHaveBeenCalledWith('DELETE FROM users', {
        replacements: {},
        type: 'RAW'
      });
    });

    it('should handle getTransaction with connected state', async () => {
      databaseManager.isConnected = true;
      databaseManager.sequelize = mockSequelize;
      const mockTransaction = { id: 'txn_123' };
      mockSequelize.transaction.mockResolvedValueOnce(mockTransaction);

      const transaction = await databaseManager.getTransaction();
      
      expect(transaction).toBe(mockTransaction);
      expect(mockSequelize.transaction).toHaveBeenCalled();
    });

    it('should handle health status when not connected', async () => {
      databaseManager.isConnected = false;
      databaseManager.sequelize = mockSequelize;
      mockSequelize.query.mockRejectedValueOnce(new Error('Database not connected'));

      const health = await databaseManager.getHealthStatus();
      
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
      expect(health.error).toBe('Database not connected');
      expect(health.timestamp).toBeDefined();
    }, 10000);

    it('should handle close when sequelize is null', async () => {
      databaseManager.isConnected = false;
      databaseManager.sequelize = null;

      await databaseManager.close();
      
      expect(databaseManager.isConnected).toBe(false);
      expect(databaseManager.sequelize).toBeNull();
    });
  });

  describe('CRUDOperations', () => {
    beforeEach(() => {
      databaseManager.isConnected = true;
      databaseManager.execute = jest.fn();
      databaseManager.query = jest.fn();
    });

    it('should create record', async () => {
      const mockResult = { results: { insertId: 1 }, metadata: { affectedRows: 1 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.create('users', { name: 'John', email: 'john@example.com' });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'INSERT INTO `users` (`name`, `email`) VALUES (?, ?)',
        ['John', 'john@example.com']
      );
    });

    it('should read records with conditions', async () => {
      const mockResults = [{ id: 1, name: 'John' }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users', { name: 'John' }, { limit: 10 });
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` WHERE `name` = ? ORDER BY `id` ASC LIMIT 10 OFFSET 0',
        ['John']
      );
    });

    it('should read all records without conditions', async () => {
      const mockResults = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users');
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` ORDER BY `id` ASC LIMIT 100 OFFSET 0',
        []
      );
    });

    it('should update record', async () => {
      const mockResult = { results: { affectedRows: 1 }, metadata: { changedRows: 1 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.update('users', { name: 'Jane' }, { id: 1 });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'UPDATE `users` SET `name` = ? WHERE `id` = ?',
        ['Jane', 1]
      );
    });

    it('should delete record', async () => {
      const mockResult = { results: { affectedRows: 1 }, metadata: {} };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.delete('users', { id: 1 });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'DELETE FROM `users` WHERE `id` = ?',
        [1]
      );
    });

    it('should handle CRUD operation errors', async () => {
      const error = new Error('Database error');
      databaseManager.execute.mockRejectedValueOnce(error);

      await expect(crudOps.create('users', { name: 'John' })).rejects.toThrow('Database error');
      
      databaseManager.query.mockRejectedValueOnce(error);
      await expect(crudOps.read('users')).rejects.toThrow('Database error');
      
      databaseManager.execute.mockRejectedValueOnce(error);
      await expect(crudOps.update('users', { name: 'Jane' }, { id: 1 })).rejects.toThrow('Database error');
      
      databaseManager.execute.mockRejectedValueOnce(error);
      await expect(crudOps.delete('users', { id: 1 })).rejects.toThrow('Database error');
    });

    it('should handle create with empty data', async () => {
      const mockResult = { results: { insertId: 1 }, metadata: { affectedRows: 1 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.create('users', {});
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'INSERT INTO `users` () VALUES ()',
        []
      );
    });

    it('should handle complex conditions in read operations', async () => {
      const mockResults = [{ id: 1, name: 'John', age: 25 }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users', { name: 'John', age: 25 }, { orderBy: 'age', orderDir: 'DESC' });
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` WHERE `name` = ? AND `age` = ? ORDER BY `age` DESC LIMIT 100 OFFSET 0',
        ['John', 25]
      );
    });

    it('should handle read with custom pagination', async () => {
      const mockResults = [{ id: 1, name: 'John' }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users', {}, { limit: 50, offset: 100 });
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` ORDER BY `id` ASC LIMIT 50 OFFSET 100',
        []
      );
    });

    it('should handle update with multiple conditions', async () => {
      const mockResult = { results: { affectedRows: 1 }, metadata: { changedRows: 1 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.update('users', { name: 'Jane', email: 'jane@example.com' }, { id: 1, status: 'active' });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'UPDATE `users` SET `name` = ?, `email` = ? WHERE `id` = ? AND `status` = ?',
        ['Jane', 'jane@example.com', 1, 'active']
      );
    });

    it('should handle delete with multiple conditions', async () => {
      const mockResult = { results: { affectedRows: 1 }, metadata: {} };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.delete('users', { id: 1, status: 'inactive' });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'DELETE FROM `users` WHERE `id` = ? AND `status` = ?',
        [1, 'inactive']
      );
    });

    it('should handle read with empty conditions and custom options', async () => {
      const mockResults = [{ id: 1, name: 'John' }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users', {}, { limit: 25, offset: 50, orderBy: 'name', orderDir: 'DESC' });
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` ORDER BY `name` DESC LIMIT 25 OFFSET 50',
        []
      );
    });

    it('should handle create with special characters in field names', async () => {
      const mockResult = { results: { insertId: 1 }, metadata: { affectedRows: 1 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.create('users', { 'first-name': 'John', 'last_name': 'Doe' });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'INSERT INTO `users` (`first-name`, `last_name`) VALUES (?, ?)',
        ['John', 'Doe']
      );
    });

    it('should handle read with single condition', async () => {
      const mockResults = [{ id: 1, name: 'John' }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users', { id: 1 });
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` WHERE `id` = ? ORDER BY `id` ASC LIMIT 100 OFFSET 0',
        [1]
      );
    });

    it('should handle update with single field and condition', async () => {
      const mockResult = { results: { affectedRows: 1 }, metadata: { changedRows: 1 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.update('users', { name: 'Jane' }, { id: 1 });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'UPDATE `users` SET `name` = ? WHERE `id` = ?',
        ['Jane', 1]
      );
    });

    it('should handle delete with single condition', async () => {
      const mockResult = { results: { affectedRows: 1 }, metadata: {} };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.delete('users', { id: 1 });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'DELETE FROM `users` WHERE `id` = ?',
        [1]
      );
    });

    it('should handle query with execution time logging', async () => {
      const mockResults = [{ id: 1, name: 'John' }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users', { id: 1 });
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalled();
    });

    it('should handle execute with execution time logging', async () => {
      const mockResult = { results: { affectedRows: 1 }, metadata: {} };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.create('users', { name: 'John' });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalled();
    });

    it('should handle create with numeric and boolean values', async () => {
      const mockResult = { results: { insertId: 1 }, metadata: { affectedRows: 1 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.create('users', { age: 25, active: true, score: 95.5 });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'INSERT INTO `users` (`age`, `active`, `score`) VALUES (?, ?, ?)',
        [25, true, 95.5]
      );
    });

    it('should handle read with null values in conditions', async () => {
      const mockResults = [{ id: 1, name: 'John', email: null }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users', { email: null });
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` WHERE `email` = ? ORDER BY `id` ASC LIMIT 100 OFFSET 0',
        [null]
      );
    });

    it('should handle update with empty data object', async () => {
      const mockResult = { results: { affectedRows: 0 }, metadata: { changedRows: 0 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.update('users', {}, { id: 1 });
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'UPDATE `users` SET  WHERE `id` = ?',
        [1]
      );
    });

    it('should handle delete with empty conditions', async () => {
      const mockResult = { results: { affectedRows: 5 }, metadata: {} };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const result = await crudOps.delete('users', {});
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'DELETE FROM `users` WHERE ',
        []
      );
    });

    it('should handle read with special table names', async () => {
      const mockResults = [{ id: 1, name: 'John' }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('user_profiles', { status: 'active' });
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `user_profiles` WHERE `status` = ? ORDER BY `id` ASC LIMIT 100 OFFSET 0',
        ['active']
      );
    });

    it('should handle create with many fields', async () => {
      const mockResult = { results: { insertId: 1 }, metadata: { affectedRows: 1 } };
      databaseManager.execute.mockResolvedValueOnce(mockResult);

      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        city: 'New York',
        country: 'USA',
        active: true
      };

      const result = await crudOps.create('users', data);
      
      expect(result).toBe(mockResult);
      expect(databaseManager.execute).toHaveBeenCalledWith(
        'INSERT INTO `users` (`name`, `email`, `age`, `city`, `country`, `active`) VALUES (?, ?, ?, ?, ?, ?)',
        ['John Doe', 'john@example.com', 30, 'New York', 'USA', true]
      );
    });

    it('should handle read with orderBy and orderDir defaults', async () => {
      const mockResults = [{ id: 1, name: 'John' }];
      databaseManager.query.mockResolvedValueOnce(mockResults);

      const results = await crudOps.read('users', {}, {});
      
      expect(results).toBe(mockResults);
      expect(databaseManager.query).toHaveBeenCalledWith(
        'SELECT * FROM `users` ORDER BY `id` ASC LIMIT 100 OFFSET 0',
        []
      );
    });

    it('should handle CRUD operations with error propagation', async () => {
      const error = new Error('Connection lost');
      
      databaseManager.execute.mockRejectedValueOnce(error);
      await expect(crudOps.create('users', { name: 'John' })).rejects.toThrow('Connection lost');
      
      databaseManager.query.mockRejectedValueOnce(error);
      await expect(crudOps.read('users')).rejects.toThrow('Connection lost');
      
      databaseManager.execute.mockRejectedValueOnce(error);
      await expect(crudOps.update('users', { name: 'Jane' }, { id: 1 })).rejects.toThrow('Connection lost');
      
      databaseManager.execute.mockRejectedValueOnce(error);
      await expect(crudOps.delete('users', { id: 1 })).rejects.toThrow('Connection lost');
    });
  });

  describe('Singleton Instances', () => {
    it('should have singleton dbManager instance', () => {
      expect(dbManager).toBeDefined();
      expect(dbManager.initialize).toBeDefined();
      expect(dbManager.close).toBeDefined();
    });

    it('should have singleton crudOperations instance', () => {
      expect(crudOperations).toBeDefined();
      expect(crudOperations.create).toBeDefined();
      expect(crudOperations.read).toBeDefined();
      expect(crudOperations.update).toBeDefined();
      expect(crudOperations.delete).toBeDefined();
    });
  });
});