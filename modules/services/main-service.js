/**
 * Main business logic service module
 * @module services/main-service
 */

const { logger, Validator, Formatter } = require('../utils/helpers');
const { dbManager, crudOperations } = require('../database/sql');
const { TradingViewWebSocket } = require('../websocket/tradingview-websocket');

/**
 * Main service for handling business logic and data transformation
 */
class MainService {
  constructor() {
    this.wsClient = null;
    this.priceCache = new Map();
    this.subscriptions = new Map();
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      externalRequests: 0,
      errors: 0
    };
  }

  /**
   * Initialize the main service
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize() {
    try {
      logger.info('Initializing main service...');
      
      // Initialize database connection
      await dbManager.initialize();
      
      // Initialize WebSocket client
      this.wsClient = new TradingViewWebSocket({
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
      });
      
      // Connect to TradingView WebSocket
      try {
        await this.wsClient.connect();
      } catch (wsError) {
        logger.error('Failed to connect to TradingView WebSocket:', wsError);
        // Continue initialization even if WS fails, it will retry
      }
      
      logger.info('Main service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Main service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handle price updates from WebSocket
   * @param {object} data - Price data
   */
  handlePriceUpdate(data) {
    try {
      if (!data.s || !data.lp) return;
      
      const cacheKey = this.generateCacheKey(data.s);
      const priceData = {
        symbol: data.s,
        price: parseFloat(data.lp),
        ask: data.ask ? parseFloat(data.ask) : null,
        bid: data.bid ? parseFloat(data.bid) : null,
        change: data.ch ? parseFloat(data.ch) : null,
        changePercent: data.chp ? parseFloat(data.chp) : null,
        volume: data.volume ? parseInt(data.volume) : null,
        timestamp: Date.now()
      };
      
      this.priceCache.set(cacheKey, priceData);
      logger.debug('Price update cached:', priceData);
    } catch (error) {
      logger.error('Price update handling error:', error);
    }
  }

  /**
   * Get price for symbol
   * @param {string} symbol - Symbol name
   * @param {string} exchange - Exchange name
   * @param {object} options - Options
   * @returns {Promise<object>} Price data
   */
  async getPrice(symbol, exchange = 'NSE', options = {}) {
    try {
      // Validate inputs
      if (!Validator.isValidSymbol(symbol)) {
        throw new Error('Invalid symbol format');
      }
      
      if (!Validator.isValidExchange(exchange)) {
        throw new Error('Invalid exchange');
      }
      
      const formattedSymbol = Formatter.formatSymbol(symbol);
      const formattedExchange = Formatter.formatExchange(exchange);
      const cacheKey = this.generateCacheKey(`${formattedExchange}:${formattedSymbol}`);
      
      // Check cache first
      const cachedData = this.priceCache.get(cacheKey);
      if (cachedData && this.isCacheValid(cachedData, options.maxAgeMs)) {
        this.metrics.cacheHits++;
        logger.debug('Price served from cache', { symbol, exchange });
        return {
          success: true,
          data: cachedData,
          source: 'cache'
        };
      }
      
      this.metrics.cacheMisses++;
      
      // Try to get price from external source
      const externalData = await this.getExternalPrice(formattedSymbol, formattedExchange, options);
      
      if (externalData.success) {
        // Cache the result
        this.priceCache.set(cacheKey, externalData.data);
        this.metrics.externalRequests++;
        
        return {
          success: true,
          data: externalData.data,
          source: 'external'
        };
      }
      
      // If external fails, return error
      return {
        success: false,
        error: externalData.error || 'Failed to get price'
      };
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Get price error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get price from external source (WebSocket or API)
   * @param {string} symbol - Symbol name
   * @param {string} exchange - Exchange name
   * @param {object} options - Options
   * @returns {Promise<object>} External price data
   */
  async getExternalPrice(symbol, exchange, options = {}) {
    try {
      // Try WebSocket first
      if (this.wsClient && this.wsClient.getStatus().connected) {
        return await this.getWebSocketPrice(symbol, exchange, options);
      }
      
      // Fallback to other methods
      return await this.getAPIPrice(symbol, exchange, options);
      
    } catch (error) {
      logger.error('External price error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get price via WebSocket
   * @param {string} symbol - Symbol name
   * @param {string} exchange - Exchange name
   * @param {object} options - Options
   * @returns {Promise<object>} WebSocket price data
   */
  async getWebSocketPrice(symbol, exchange, options = {}) {
    return new Promise((resolve) => {
      const timeout = options.timeout || 10000;
      const subscriptionKey = `${exchange}:${symbol}`;
      
      // Subscribe to symbol
      const subscribed = this.wsClient.subscribe(symbol, exchange, (data) => {
        this.handlePriceUpdate(data);
        resolve({
          success: true,
          data: {
            symbol: data.s,
            price: parseFloat(data.lp),
            ask: data.ask ? parseFloat(data.ask) : null,
            bid: data.bid ? parseFloat(data.bid) : null,
            change: data.ch ? parseFloat(data.ch) : null,
            changePercent: data.chp ? parseFloat(data.chp) : null,
            volume: data.volume ? parseInt(data.volume) : null,
            timestamp: Date.now()
          }
        });
      });
      
      if (!subscribed) {
        resolve({
          success: false,
          error: 'Failed to subscribe to symbol'
        });
        return;
      }
      
      // Timeout fallback
      setTimeout(() => {
        this.wsClient.unsubscribe(symbol, exchange);
        resolve({
          success: false,
          error: 'WebSocket price request timeout'
        });
      }, timeout);
    });
  }

  /**
   * Get price via API (fallback method)
   * @param {string} symbol - Symbol name
   * @param {string} exchange - Exchange name
   * @param {object} options - Options
   * @returns {Promise<object>} API price data
   */
  async getAPIPrice(symbol, exchange, options = {}) {
    // This would be implemented based on your specific API requirements
    // For now, return error to indicate WebSocket is the primary method
    return {
      success: false,
      error: 'API method not implemented - WebSocket required'
    };
  }

  /**
   * Subscribe to real-time price updates
   * @param {string} symbol - Symbol name
   * @param {string} exchange - Exchange name
   * @param {function} callback - Update callback
   * @returns {boolean} Subscription success
   */
  subscribeToPrice(symbol, exchange = 'NSE', callback) {
    try {
      if (!Validator.isValidSymbol(symbol)) {
        throw new Error('Invalid symbol format');
      }
      
      if (!Validator.isValidExchange(exchange)) {
        throw new Error('Invalid exchange');
      }
      
      const formattedSymbol = Formatter.formatSymbol(symbol);
      const formattedExchange = Formatter.formatExchange(exchange);
      const subscriptionKey = `${formattedExchange}:${formattedSymbol}`;
      
      // Store subscription callback
      this.subscriptions.set(subscriptionKey, {
        symbol: formattedSymbol,
        exchange: formattedExchange,
        callback,
        subscribedAt: Date.now()
      });
      
      // Subscribe via WebSocket
      if (this.wsClient && this.wsClient.getStatus().connected) {
        return this.wsClient.subscribe(formattedSymbol, formattedExchange, (data) => {
          this.handlePriceUpdate(data);
          if (callback) callback(data);
        });
      }
      
      return true;
    } catch (error) {
      logger.error('Subscribe to price error:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from price updates
   * @param {string} symbol - Symbol name
   * @param {string} exchange - Exchange name
   * @returns {boolean} Unsubscription success
   */
  unsubscribeFromPrice(symbol, exchange = 'NSE') {
    try {
      const formattedSymbol = Formatter.formatSymbol(symbol);
      const formattedExchange = Formatter.formatExchange(exchange);
      const subscriptionKey = `${formattedExchange}:${formattedSymbol}`;
      
      // Remove subscription
      this.subscriptions.delete(subscriptionKey);
      
      // Unsubscribe via WebSocket
      if (this.wsClient && this.wsClient.getStatus().connected) {
        return this.wsClient.unsubscribe(formattedSymbol, formattedExchange);
      }
      
      return true;
    } catch (error) {
      logger.error('Unsubscribe from price error:', error);
      return false;
    }
  }

  /**
   * Get service metrics
   * @returns {object} Service metrics
   */
  getMetrics() {
    return {
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        size: this.priceCache.size
      },
      external: {
        requests: this.metrics.externalRequests
      },
      errors: this.metrics.errors,
      subscriptions: this.subscriptions.size,
      websocket: this.wsClient ? this.wsClient.getStatus() : null
    };
  }

  /**
   * Clear price cache
   * @param {string} symbol - Optional symbol to clear (clears all if not specified)
   * @param {string} exchange - Exchange name
   */
  clearCache(symbol, exchange = 'NSE') {
    try {
      if (symbol) {
        const cacheKey = this.generateCacheKey(`${exchange}:${symbol}`);
        this.priceCache.delete(cacheKey);
        logger.info('Cache cleared for symbol', { symbol, exchange });
      } else {
        this.priceCache.clear();
        logger.info('All cache cleared');
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Check if cache entry is valid
   * @param {object} data - Cached data
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {boolean} Cache validity
   */
  isCacheValid(data, maxAgeMs = 30000) {
    if (!data || !data.timestamp) return false;
    
    const age = Date.now() - data.timestamp;
    return age <= maxAgeMs;
  }

  /**
   * Generate cache key
   * @param {string} identifier - Symbol identifier
   * @returns {string} Cache key
   */
  generateCacheKey(identifier) {
    return identifier.toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   * @returns {Promise<boolean>} Initialization success
   */
  async initializeWebSocket(server) {
    try {
      logger.info('Initializing WebSocket server...');
      
      if (!this.wsClient) {
        throw new Error('WebSocket client not initialized');
      }
      
      // Setup WebSocket server on the HTTP server
      await this.wsClient.setupWebSocketServer(server);
      
      logger.info('WebSocket server initialized successfully');
      return true;
    } catch (error) {
      logger.error('WebSocket server initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get WebSocket connection status
   * @returns {object} WebSocket status
   */
  getWebSocketStatus() {
    if (!this.wsClient) {
      return {
        connected: false,
        status: 'not_initialized',
        subscriptions: 0
      };
    }
    
    const clientStatus = this.wsClient.getStatus();
    return {
      connected: clientStatus.connected,
      status: clientStatus.status,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: clientStatus.reconnectAttempts || 0
    };
  }

  /**
   * Shutdown the service gracefully
   * @returns {Promise<boolean>} Shutdown success
   */
  async shutdown() {
    try {
      logger.info('Shutting down main service...');
      
      // Clear subscriptions
      this.subscriptions.clear();
      
      // Clear cache
      this.priceCache.clear();
      
      // Disconnect WebSocket
      if (this.wsClient) {
        await this.wsClient.disconnect();
      }
      
      logger.info('Main service shutdown completed');
      return true;
    } catch (error) {
      logger.error('Service shutdown error:', error);
      return false;
    }
  }

  /**
   * Cleanup service resources
   */
  async cleanup() {
    try {
      logger.info('Cleaning up main service...');
      
      // Clear subscriptions
      this.subscriptions.clear();
      
      // Clear cache
      this.priceCache.clear();
      
      // Disconnect WebSocket
      if (this.wsClient) {
        await this.wsClient.disconnect();
      }
      
      // Close database connection
      await dbManager.close();
      
      logger.info('Main service cleanup completed');
    } catch (error) {
      logger.error('Service cleanup error:', error);
    }
  }
}

// Create singleton instance
const mainService = new MainService();

module.exports = {
  MainService,
  mainService
};