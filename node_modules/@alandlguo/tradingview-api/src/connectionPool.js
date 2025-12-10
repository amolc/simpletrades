const Client = require('./client');
const EventEmitter = require('events');

// 简单的开发模式检测
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';

// 条件性的 debug 日志函数
const debugLog = isDevelopment ? console.debug : () => {};

/**
 * TradingView Connection Pool Manager
 * Manages multiple connections to handle TradingView's connection limits
 */
class ConnectionPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxConnections = options.maxConnections || 3;
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.clientOptions = options.clientOptions || {};
    
    this.connections = [];
    this.connectionIndex = 0;
    this.connectionLimitReached = false;
    this.backoffDelay = this.reconnectDelay;
    this.maxBackoffDelay = options.maxBackoffDelay || 60000;
  }

  /**
   * Initialize the connection pool
   */
  async initialize() {
    debugLog(`Initializing TradingView connection pool with ${this.maxConnections} connections`);
    
    for (let i = 0; i < this.maxConnections; i++) {
      await this.createConnection(i);
      // Stagger connection creation to avoid overwhelming the server
      if (i < this.maxConnections - 1) {
        await this.delay(1000);
      }
    }
  }

  /**
   * Create a new connection
   */
  async createConnection(index) {
    try {
      const client = new Client(this.clientOptions);
      
      const connection = {
        id: index,
        client,
        isActive: false,
        lastUsed: Date.now(),
        requestCount: 0,
        errorCount: 0,
        connectionLimitErrors: 0
      };

      // Set up event handlers
      client.onConnected(() => {
        debugLog(`TradingView connection ${index} established`);
        connection.isActive = true;
        this.connectionLimitReached = false;
        this.backoffDelay = this.reconnectDelay; // Reset backoff
        this.emit('connectionReady', connection);
      });

      client.onDisconnected(() => {
        debugLog(`TradingView connection ${index} disconnected`);
        connection.isActive = false;
        this.emit('connectionLost', connection);
        
        // Auto-reconnect with backoff
        setTimeout(() => {
          this.reconnectConnection(index);
        }, this.backoffDelay);
      });

      client.onError((error, metadata) => {
        console.error(`TradingView connection ${index} error:`, error.message);
        connection.errorCount++;
        
        if (metadata?.isConnectionLimit) {
          connection.connectionLimitErrors++;
          this.handleConnectionLimit(connection);
        }
        
        this.emit('connectionError', connection, error);
      });

      client.onConnectionLimitReached((errorData) => {
        console.warn(`Connection limit reached on connection ${index}:`, errorData);
        this.handleConnectionLimit(connection);
      });

      this.connections[index] = connection;
      
      return connection;
    } catch (error) {
      console.error(`Failed to create TradingView connection ${index}:`, error);
      throw error;
    }
  }

  /**
   * Handle connection limit reached
   */
  handleConnectionLimit(connection) {
    this.connectionLimitReached = true;
    connection.isActive = false;
    
    // Exponential backoff
    this.backoffDelay = Math.min(this.backoffDelay * 2, this.maxBackoffDelay);
    
    console.warn(`Connection limit reached. Backing off for ${this.backoffDelay}ms`);
    
    // Temporarily disable this connection
    setTimeout(() => {
      if (connection.client.isOpen) {
        connection.client.end();
      }
    }, 1000);
    
    this.emit('connectionLimitReached', {
      connection,
      backoffDelay: this.backoffDelay,
      activeConnections: this.getActiveConnectionCount()
    });
  }

  /**
   * Reconnect a specific connection
   */
  async reconnectConnection(index) {
    try {
      debugLog(`Attempting to reconnect TradingView connection ${index}`);
      
      const oldConnection = this.connections[index];
      if (oldConnection?.client?.isOpen) {
        await oldConnection.client.end();
      }
      
      await this.createConnection(index);
    } catch (error) {
      console.error(`Failed to reconnect connection ${index}:`, error);
      
      // Retry with longer delay
      setTimeout(() => {
        this.reconnectConnection(index);
      }, this.backoffDelay);
    }
  }

  /**
   * Get the next available connection using round-robin
   */
  getNextConnection() {
    const activeConnections = this.connections.filter(conn => 
      conn && conn.isActive && conn.client.isOpen
    );

    if (activeConnections.length === 0) {
      throw new Error('No active TradingView connections available');
    }

    // Round-robin selection
    const connection = activeConnections[this.connectionIndex % activeConnections.length];
    this.connectionIndex = (this.connectionIndex + 1) % activeConnections.length;
    
    connection.lastUsed = Date.now();
    connection.requestCount++;
    
    return connection;
  }

  /**
   * Get connection with least load
   */
  getLeastLoadedConnection() {
    const activeConnections = this.connections.filter(conn => 
      conn && conn.isActive && conn.client.isOpen
    );

    if (activeConnections.length === 0) {
      throw new Error('No active TradingView connections available');
    }

    // Find connection with lowest request count
    const connection = activeConnections.reduce((least, current) => 
      current.requestCount < least.requestCount ? current : least
    );
    
    connection.lastUsed = Date.now();
    connection.requestCount++;
    
    return connection;
  }

  /**
   * Get the best available connection
   */
  getBestConnection() {
    if (this.connectionLimitReached) {
      // During connection limit scenarios, prefer connections with fewer errors
      const activeConnections = this.connections.filter(conn => 
        conn && conn.isActive && conn.client.isOpen
      );

      if (activeConnections.length === 0) {
        throw new Error('No active TradingView connections available');
      }

      const connection = activeConnections.reduce((best, current) => 
        current.connectionLimitErrors < best.connectionLimitErrors ? current : best
      );
      
      connection.lastUsed = Date.now();
      connection.requestCount++;
      
      return connection;
    }
    
    // Normal operation: use least loaded
    return this.getLeastLoadedConnection();
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount() {
    return this.connections.filter(conn => 
      conn && conn.isActive && conn.client.isOpen
    ).length;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const activeCount = this.getActiveConnectionCount();
    const totalRequests = this.connections.reduce((sum, conn) => 
      sum + (conn?.requestCount || 0), 0
    );
    const totalErrors = this.connections.reduce((sum, conn) => 
      sum + (conn?.errorCount || 0), 0
    );
    const totalConnectionLimitErrors = this.connections.reduce((sum, conn) => 
      sum + (conn?.connectionLimitErrors || 0), 0
    );

    return {
      maxConnections: this.maxConnections,
      activeConnections: activeCount,
      totalRequests,
      totalErrors,
      totalConnectionLimitErrors,
      connectionLimitReached: this.connectionLimitReached,
      backoffDelay: this.backoffDelay,
      connections: this.connections.map(conn => ({
        id: conn?.id,
        isActive: conn?.isActive,
        requestCount: conn?.requestCount,
        errorCount: conn?.errorCount,
        connectionLimitErrors: conn?.connectionLimitErrors,
        lastUsed: conn?.lastUsed
      }))
    };
  }

  /**
   * Close all connections
   */
  async closeAll() {
    debugLog('Closing all TradingView connections');
    
    const closePromises = this.connections.map(async (conn) => {
      if (conn?.client?.isOpen) {
        await conn.client.end();
      }
    });
    
    await Promise.all(closePromises);
    this.connections = [];
  }

  /**
   * Utility method to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ConnectionPool;
