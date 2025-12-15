/**
 * Database module for handling all SQL operations
 * @module database/sql
 */

const { Sequelize, QueryTypes } = require('sequelize');
const logger = require('../utils/helpers').logger;

/**
 * Database connection pool configuration
 */
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'stockagent',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? logger.debug : false,
  retry: {
    max: 3,
    backoffBase: 1000,
    backoffExponent: 1.5
  }
};

/**
 * Database connection instance
 */
class DatabaseManager {
  constructor() {
    this.sequelize = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection with retry logic
   * @returns {Promise<boolean>} Connection success status
   */
  async initialize() {
    try {
      this.sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        pool: dbConfig.pool,
        logging: dbConfig.logging,
        retry: dbConfig.retry
      });

      await this.sequelize.authenticate();
      this.isConnected = true;
      logger.info('Database connection established successfully');
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.sequelize) {
      await this.sequelize.close();
      this.isConnected = false;
      logger.info('Database connection closed');
    }
  }

  /**
   * Execute raw SQL query with error handling
   * @param {string} sql - SQL query string
   * @param {object} replacements - Query parameters
   * @param {object} options - Query options
   * @returns {Promise<Array>} Query results
   */
  async query(sql, replacements = {}, options = {}) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const startTime = Date.now();
      const results = await this.sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
        ...options
      });
      
      const executionTime = Date.now() - startTime;
      logger.debug(`Query executed in ${executionTime}ms:`, sql.substring(0, 100));
      
      return results;
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute INSERT/UPDATE/DELETE queries
   * @param {string} sql - SQL query string
   * @param {object} replacements - Query parameters
   * @returns {Promise<object>} Query result metadata
   */
  async execute(sql, replacements = {}) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const startTime = Date.now();
      const [results, metadata] = await this.sequelize.query(sql, {
        replacements,
        type: QueryTypes.RAW
      });
      
      const executionTime = Date.now() - startTime;
      logger.debug(`Execute query completed in ${executionTime}ms`);
      
      return { results, metadata };
    } catch (error) {
      logger.error('Execute query failed:', error);
      throw error;
    }
  }

  /**
   * Get database transaction
   * @returns {Promise<object>} Transaction object
   */
  async getTransaction() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return await this.sequelize.transaction();
  }

  /**
   * Get table schema information
   * @param {string} tableName - Table name
   * @returns {Promise<object>} Table schema
   */
  async getTableSchema(tableName) {
    try {
      const qi = this.sequelize.getQueryInterface();
      return await qi.describeTable(tableName);
    } catch (error) {
      logger.error(`Failed to get schema for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check if table exists
   * @param {string} tableName - Table name
   * @returns {Promise<boolean>} Table existence
   */
  async tableExists(tableName) {
    try {
      const qi = this.sequelize.getQueryInterface();
      const tables = await qi.showAllTables();
      return tables.includes(tableName);
    } catch (error) {
      logger.error(`Failed to check table existence ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get database health status
   * @returns {Promise<object>} Health status
   */
  async getHealthStatus() {
    try {
      const startTime = Date.now();
      await this.sequelize.query('SELECT 1', { type: QueryTypes.SELECT });
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Alias for getHealthStatus
   */
  async healthCheck() {
    return this.getHealthStatus();
  }
}

/**
 * CRUD Operations for common tables
 */
class CRUDOperations {
  constructor(dbManager) {
    this.db = dbManager;
  }

  /**
   * Generic CREATE operation
   * @param {string} table - Table name
   * @param {object} data - Data to insert
   * @returns {Promise<object>} Insert result
   */
  async create(table, data) {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${table}\` (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${placeholders})`;
    
    return await this.db.execute(sql, Object.values(data));
  }

  /**
   * Generic READ operation
   * @param {string} table - Table name
   * @param {object} conditions - WHERE conditions
   * @param {object} options - Query options (limit, offset, order)
   * @returns {Promise<Array>} Query results
   */
  async read(table, conditions = {}, options = {}) {
    const { limit = 100, offset = 0, orderBy = 'id', orderDir = 'ASC' } = options;
    
    let sql = `SELECT * FROM \`${table}\``;
    const replacements = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(field => {
        replacements.push(conditions[field]);
        return `\`${field}\` = ?`;
      }).join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }
    
    sql += ` ORDER BY \`${orderBy}\` ${orderDir} LIMIT ${limit} OFFSET ${offset}`;
    
    return await this.db.query(sql, replacements);
  }

  /**
   * Generic UPDATE operation
   * @param {string} table - Table name
   * @param {object} data - Data to update
   * @param {object} conditions - WHERE conditions
   * @returns {Promise<object>} Update result
   */
  async update(table, data, conditions) {
    const setClause = Object.keys(data).map(field => `\`${field}\` = ?`).join(', ');
    const whereClause = Object.keys(conditions).map(field => `\`${field}\` = ?`).join(' AND ');
    
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`;
    const replacements = [...Object.values(data), ...Object.values(conditions)];
    
    return await this.db.execute(sql, replacements);
  }

  /**
   * Generic DELETE operation
   * @param {string} table - Table name
   * @param {object} conditions - WHERE conditions
   * @returns {Promise<object>} Delete result
   */
  async delete(table, conditions) {
    const whereClause = Object.keys(conditions).map(field => `\`${field}\` = ?`).join(' AND ');
    const sql = `DELETE FROM \`${table}\` WHERE ${whereClause}`;
    
    return await this.db.execute(sql, Object.values(conditions));
  }
}

// Create singleton instances
const dbManager = new DatabaseManager();
const crudOperations = new CRUDOperations(dbManager);

module.exports = {
  DatabaseManager,
  CRUDOperations,
  dbManager,
  crudOperations
};