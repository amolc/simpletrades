/**
 * Database migration module for one-time schema operations
 * @module database/migrations
 */

const { dbManager } = require('./sql');
const { logger } = require('../utils/helpers');

/**
 * Migration manager for handling database schema changes
 */
class MigrationManager {
  constructor() {
    this.migrations = new Map();
    this.appliedMigrations = new Set();
  }

  /**
   * Register a migration
   * @param {string} name - Migration name
   * @param {function} up - Migration up function
   * @param {function} down - Migration down function
   */
  registerMigration(name, up, down) {
    this.migrations.set(name, { up, down });
    logger.info('Migration registered:', name);
  }

  /**
   * Apply all pending migrations
   * @returns {Promise<Array>} Applied migrations
   */
  async applyMigrations() {
    const applied = [];
    
    try {
      // Check if migrations table exists
      const migrationsTableExists = await this.checkMigrationsTable();
      if (!migrationsTableExists) {
        await this.createMigrationsTable();
      }
      
      // Get applied migrations
      await this.loadAppliedMigrations();
      
      // Apply pending migrations
      for (const [name, migration] of this.migrations) {
        if (!this.appliedMigrations.has(name)) {
          logger.info('Applying migration:', name);
          await migration.up();
          await this.recordMigration(name);
          applied.push(name);
          logger.info('Migration applied successfully:', name);
        }
      }
      
      return applied;
    } catch (error) {
      logger.error('Migration application failed:', error);
      throw error;
    }
  }

  /**
   * Check if migrations table exists
   * @returns {Promise<boolean>} Table existence
   */
  async checkMigrationsTable() {
    try {
      const result = await dbManager.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'migrations'"
      );
      return result[0].count > 0;
    } catch (error) {
      logger.error('Failed to check migrations table:', error);
      return false;
    }
  }

  /**
   * Create migrations table
   */
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await dbManager.execute(sql);
    logger.info('Migrations table created');
  }

  /**
   * Load applied migrations from database
   */
  async loadAppliedMigrations() {
    try {
      const results = await dbManager.query('SELECT name FROM migrations ORDER BY applied_at');
      this.appliedMigrations = new Set(results.map(row => row.name));
      logger.info('Loaded applied migrations:', this.appliedMigrations.size);
    } catch (error) {
      logger.error('Failed to load applied migrations:', error);
      throw error;
    }
  }

  /**
   * Record applied migration
   * @param {string} name - Migration name
   */
  async recordMigration(name) {
    const sql = 'INSERT INTO migrations (name) VALUES (?)';
    await dbManager.execute(sql, [name]);
  }

  /**
   * Revert a specific migration
   * @param {string} name - Migration name
   */
  async revertMigration(name) {
    try {
      const migration = this.migrations.get(name);
      if (!migration) {
        throw new Error(`Migration not found: ${name}`);
      }
      
      logger.info('Reverting migration:', name);
      await migration.down();
      
      // Remove from applied migrations
      const sql = 'DELETE FROM migrations WHERE name = ?';
      await dbManager.execute(sql, [name]);
      
      this.appliedMigrations.delete(name);
      logger.info('Migration reverted successfully:', name);
    } catch (error) {
      logger.error('Migration revert failed:', error);
      throw error;
    }
  }
}

/**
 * Database schema migrations
 */
class SchemaMigrations {
  constructor() {
    this.migrationManager = new MigrationManager();
    this.registerMigrations();
  }

  /**
   * Register all schema migrations
   */
  registerMigrations() {
    // Users table migration
    this.migrationManager.registerMigration(
      'create_users_table',
      async () => {
        const sql = `
          CREATE TABLE IF NOT EXISTS Users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phoneNumber VARCHAR(20),
            role VARCHAR(50) DEFAULT 'user',
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `;
        await dbManager.execute(sql);
        
        // Add phoneNumber index if not exists
        try {
          await dbManager.execute('CREATE UNIQUE INDEX uniq_phoneNumber ON Users(phoneNumber)');
        } catch (error) {
          // Index might already exist, ignore
        }
      },
      async () => {
        await dbManager.execute('DROP TABLE IF EXISTS Users');
      }
    );

    // Products table migration
    this.migrationManager.registerMigration(
      'create_products_table',
      async () => {
        const sql = `
          CREATE TABLE IF NOT EXISTS Products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            description TEXT,
            price DECIMAL(10,2),
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `;
        await dbManager.execute(sql);
      },
      async () => {
        await dbManager.execute('DROP TABLE IF EXISTS Products');
      }
    );

    // Plans table migration
    this.migrationManager.registerMigration(
      'create_plans_table',
      async () => {
        const sql = `
          CREATE TABLE IF NOT EXISTS Plans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            planName VARCHAR(255) NOT NULL,
            productId INT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            duration INT NOT NULL,
            features JSON,
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE
          )
        `;
        await dbManager.execute(sql);
      },
      async () => {
        await dbManager.execute('DROP TABLE IF EXISTS Plans');
      }
    );

    // Signals table migration
    this.migrationManager.registerMigration(
      'create_signals_table',
      async () => {
        const sql = `
          CREATE TABLE IF NOT EXISTS Signals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            symbol VARCHAR(255) NOT NULL,
            exchange VARCHAR(50) DEFAULT 'NSE',
            productId INT,
            userId INT,
            type VARCHAR(50),
            signal VARCHAR(50) NOT NULL,
            entryPrice DECIMAL(10,2),
            targetPrice DECIMAL(10,2),
            stopLoss DECIMAL(10,2),
            status VARCHAR(50) DEFAULT 'IN_PROGRESS',
            confidence DECIMAL(5,2),
            notes TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE SET NULL,
            FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE SET NULL
          )
        `;
        await dbManager.execute(sql);
      },
      async () => {
        await dbManager.execute('DROP TABLE IF EXISTS Signals');
      }
    );

    // Watchlists table migration
    this.migrationManager.registerMigration(
      'create_watchlists_table',
      async () => {
        const sql = `
          CREATE TABLE IF NOT EXISTS Watchlists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            stockName VARCHAR(255) NOT NULL,
            exchange VARCHAR(50) DEFAULT 'NSE',
            product VARCHAR(50),
            alertPrice DECIMAL(10,2),
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
          )
        `;
        await dbManager.execute(sql);
      },
      async () => {
        await dbManager.execute('DROP TABLE IF EXISTS Watchlists');
      }
    );

    // Subscriptions table migration
    this.migrationManager.registerMigration(
      'create_subscriptions_table',
      async () => {
        const sql = `
          CREATE TABLE IF NOT EXISTS Subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            planId INT NOT NULL,
            startDate DATE NOT NULL,
            endDate DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
            FOREIGN KEY (planId) REFERENCES Plans(id) ON DELETE CASCADE
          )
        `;
        await dbManager.execute(sql);
      },
      async () => {
        await dbManager.execute('DROP TABLE IF EXISTS Subscriptions');
      }
    );

    // Transactions table migration
    this.migrationManager.registerMigration(
      'create_transactions_table',
      async () => {
        const sql = `
          CREATE TABLE IF NOT EXISTS Transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            subscriptionId INT,
            amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'INR',
            status VARCHAR(50) DEFAULT 'pending',
            paymentMethod VARCHAR(50),
            paymentId VARCHAR(255),
            notes TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
            FOREIGN KEY (subscriptionId) REFERENCES Subscriptions(id) ON DELETE SET NULL
          )
        `;
        await dbManager.execute(sql);
      },
      async () => {
        await dbManager.execute('DROP TABLE IF EXISTS Transactions');
      }
    );

    // SessionData table migration
    this.migrationManager.registerMigration(
      'create_sessiondata_table',
      async () => {
        const sql = `
          CREATE TABLE IF NOT EXISTS SessionData (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            sessionToken VARCHAR(255) UNIQUE NOT NULL,
            data JSON,
            expiresAt TIMESTAMP NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
          )
        `;
        await dbManager.execute(sql);
      },
      async () => {
        await dbManager.execute('DROP TABLE IF EXISTS SessionData');
      }
    );
  }

  /**
   * Apply all migrations
   * @returns {Promise<Array>} Applied migrations
   */
  async applyAll() {
    return await this.migrationManager.applyMigrations();
  }

  /**
   * Revert specific migration
   * @param {string} name - Migration name
   */
  async revert(name) {
    await this.migrationManager.revertMigration(name);
  }
}

/**
 * Schema optimization migrations
 */
class OptimizationMigrations {
  constructor() {
    this.migrationManager = new MigrationManager();
    this.registerOptimizations();
  }

  /**
   * Register optimization migrations
   */
  registerOptimizations() {
    // Add indexes for better performance
    this.migrationManager.registerMigration(
      'add_performance_indexes',
      async () => {
        const indexes = [
          'CREATE INDEX idx_signals_symbol ON Signals(symbol)',
          'CREATE INDEX idx_signals_status ON Signals(status)',
          'CREATE INDEX idx_signals_created ON Signals(createdAt)',
          'CREATE INDEX idx_watchlists_user ON Watchlists(userId)',
          'CREATE INDEX idx_watchlists_symbol ON Watchlists(stockName)',
          'CREATE INDEX idx_subscriptions_user ON Subscriptions(userId)',
          'CREATE INDEX idx_subscriptions_status ON Subscriptions(status)',
          'CREATE INDEX idx_transactions_user ON Transactions(userId)',
          'CREATE INDEX idx_transactions_status ON Transactions(status)'
        ];
        
        for (const sql of indexes) {
          try {
            await dbManager.execute(sql);
          } catch (error) {
            logger.warn('Index creation failed (might already exist):', sql);
          }
        }
      },
      async () => {
        const indexes = [
          'DROP INDEX idx_signals_symbol ON Signals',
          'DROP INDEX idx_signals_status ON Signals',
          'DROP INDEX idx_signals_created ON Signals',
          'DROP INDEX idx_watchlists_user ON Watchlists',
          'DROP INDEX idx_watchlists_symbol ON Watchlists',
          'DROP INDEX idx_subscriptions_user ON Subscriptions',
          'DROP INDEX idx_subscriptions_status ON Subscriptions',
          'DROP INDEX idx_transactions_user ON Transactions',
          'DROP INDEX idx_transactions_status ON Transactions'
        ];
        
        for (const sql of indexes) {
          try {
            await dbManager.execute(sql);
          } catch (error) {
            logger.warn('Index drop failed:', sql);
          }
        }
      }
    );
  }

  /**
   * Apply optimization migrations
   * @returns {Promise<Array>} Applied optimizations
   */
  async applyAll() {
    return await this.migrationManager.applyMigrations();
  }
}

// Create singleton instances
const migrationManager = new MigrationManager();
const schemaMigrations = new SchemaMigrations();
const optimizationMigrations = new OptimizationMigrations();

module.exports = {
  MigrationManager,
  SchemaMigrations,
  OptimizationMigrations,
  migrationManager,
  schemaMigrations,
  optimizationMigrations
};