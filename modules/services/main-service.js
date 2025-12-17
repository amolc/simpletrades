/**
 * Main business logic service module
 * @module services/main-service
 */

const { logger, Validator, Formatter } = require('../utils/helpers');
const { dbManager, crudOperations } = require('../database/sql');
const { DataSimpleIncomeWebSocket } = require('../websocket/data-simpleincome-websocket');

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
      this.wsClient = new DataSimpleIncomeWebSocket({
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
      });
      
      // Connect to Data.SimpleIncome.co WebSocket
      try {
        await this.wsClient.connect();
      } catch (wsError) {
        logger.error('Failed to connect to Data.SimpleIncome.co WebSocket:', wsError);
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
   * Initialize WebSocket server for client connections
   * @param {http.Server} server - HTTP server instance
   * @returns {Promise<boolean>} Initialization success
   */
  async initializeWebSocket(server) {
    try {
      logger.info('Initializing WebSocket server for client connections...');
      
      const WebSocket = require('ws');
      
      // Create a single WebSocket server that handles multiple paths
      this.wss = new WebSocket.Server({ 
        server,
        verifyClient: (info) => {
          logger.debug('WebSocket client connection attempt', { origin: info.origin, path: info.req.url });
          return true;
        }
      });

      // Handle all WebSocket connections and route based on path
      this.wss.on('connection', (ws, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const path = url.pathname;
        
        logger.info('New WebSocket client connected', { 
          path: path,
          ip: req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });

        if (path === '/ws/tradingview') {
          // Handle TradingView WebSocket connections
          this.handleTradingViewConnection(ws, req);
        } else if (path === '/ws/stream') {
          // Handle regular WebSocket connections
          this.handleStreamConnection(ws, req);
        } else {
          // Unknown path, close connection
          logger.warn('Unknown WebSocket path:', path);
          ws.close(1002, 'Unknown WebSocket path');
        }
      });

      logger.info('WebSocket server initialized successfully');
      logger.info('TradingView WebSocket endpoint initialized at /ws/tradingview');
      return true;
    } catch (error) {
      logger.error('WebSocket server initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handle client WebSocket messages
   * @param {WebSocket} ws - Client WebSocket connection
   * @param {object} data - Message data
   */
  handleClientMessage(ws, data) {
    try {
      logger.debug('Received client message:', data);
      
      switch (data.type) {
        case 'subscribe':
          this.handleClientSubscribe(ws, data);
          break;
        case 'unsubscribe':
          this.handleClientUnsubscribe(ws, data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          logger.warn('Unknown client message type:', data.type);
          ws.send(JSON.stringify({ 
            type: 'error',
            message: `Unknown message type: ${data.type}`
          }));
      }
    } catch (error) {
      logger.error('Error handling client message:', error);
      ws.send(JSON.stringify({ 
        type: 'error',
        message: 'Internal server error'
      }));
    }
  }

  /**
   * Handle client subscription request
   * @param {WebSocket} ws - Client WebSocket connection
   * @param {object} data - Subscription data
   */
  handleClientSubscribe(ws, data) {
    try {
      if (!data.symbols || !Array.isArray(data.symbols)) {
        ws.send(JSON.stringify({ 
          type: 'error',
          message: 'symbols array is required'
        }));
        return;
      }

      const subscribedSymbols = [];
      
      data.symbols.forEach(symbolData => {
        const { symbol, exchange = 'NSE' } = symbolData;
        if (!symbol) return;

        const symbolKey = `${exchange}:${symbol}`.toUpperCase();
        
        // Subscribe to data.simpleincome.co WebSocket
        if (this.wsClient && this.wsClient.subscribe(symbol, exchange, (priceData) => {
          // Forward price updates to client
          ws.send(JSON.stringify({
            type: 'price_update',
            data: priceData
          }));
        })) {
          subscribedSymbols.push(symbolKey);
          
          // Store client subscription
          if (!this.clientSubscriptions) {
            this.clientSubscriptions = new Map();
          }
          
          if (!this.clientSubscriptions.has(ws)) {
            this.clientSubscriptions.set(ws, new Set());
          }
          this.clientSubscriptions.get(ws).add(symbolKey);
        }
      });

      ws.send(JSON.stringify({
        type: 'subscription_confirmed',
        symbols: subscribedSymbols,
        message: `Subscribed to ${subscribedSymbols.length} symbols`
      }));

      logger.info(`Client subscribed to ${subscribedSymbols.length} symbols`, subscribedSymbols);
      
    } catch (error) {
      logger.error('Error handling client subscription:', error);
      ws.send(JSON.stringify({ 
        type: 'error',
        message: 'Subscription failed'
      }));
    }
  }

  /**
   * Handle client unsubscription request
   * @param {WebSocket} ws - Client WebSocket connection
   * @param {object} data - Unsubscription data
   */
  handleClientUnsubscribe(ws, data) {
    try {
      if (!data.symbols || !Array.isArray(data.symbols)) {
        ws.send(JSON.stringify({ 
          type: 'error',
          message: 'symbols array is required'
        }));
        return;
      }

      const unsubscribedSymbols = [];
      
      data.symbols.forEach(symbolData => {
        const { symbol, exchange = 'NSE' } = symbolData;
        if (!symbol) return;

        const symbolKey = `${exchange}:${symbol}`.toUpperCase();
        
        // Unsubscribe from data.simpleincome.co WebSocket
        if (this.wsClient && this.wsClient.unsubscribe(symbol, exchange)) {
          unsubscribedSymbols.push(symbolKey);
          
          // Remove client subscription
          if (this.clientSubscriptions && this.clientSubscriptions.has(ws)) {
            this.clientSubscriptions.get(ws).delete(symbolKey);
          }
        }
      });

      ws.send(JSON.stringify({
        type: 'unsubscription_confirmed',
        symbols: unsubscribedSymbols,
        message: `Unsubscribed from ${unsubscribedSymbols.length} symbols`
      }));

      logger.info(`Client unsubscribed from ${unsubscribedSymbols.length} symbols`, unsubscribedSymbols);
      
    } catch (error) {
      logger.error('Error handling client unsubscription:', error);
      ws.send(JSON.stringify({ 
        type: 'error',
        message: 'Unsubscription failed'
      }));
    }
  }

  /**
   * Clean up client subscriptions when client disconnects
   * @param {WebSocket} ws - Client WebSocket connection
   */
  cleanupClientSubscriptions(ws) {
    try {
      if (!this.clientSubscriptions || !this.clientSubscriptions.has(ws)) {
        return;
      }

      const clientSubs = this.clientSubscriptions.get(ws);
      if (clientSubs && clientSubs.size > 0) {
        logger.info(`Cleaning up ${clientSubs.size} subscriptions for disconnected client`);
        
        // Unsubscribe from all symbols
        clientSubs.forEach(symbolKey => {
          const [exchange, symbol] = symbolKey.split(':');
          if (this.wsClient) {
            this.wsClient.unsubscribe(symbol, exchange);
          }
        });
      }

      this.clientSubscriptions.delete(ws);
      
    } catch (error) {
      logger.error('Error cleaning up client subscriptions:', error);
    }
  }

  /**
   * Get WebSocket connection status
   * @returns {object} WebSocket status
   */
  getWebSocketStatus() {
    const clientStatus = this.wsClient ? this.wsClient.getStatus() : null;
    const serverStatus = this.wss ? {
      clients: this.wss.clients.size,
      clientSubscriptions: this.clientSubscriptions ? this.clientSubscriptions.size : 0
    } : null;
    
    return {
      client: clientStatus,
      server: serverStatus,
      subscriptions: this.subscriptions.size,
      overall: clientStatus ? clientStatus.connected : false
    };
  }

  /**
   * Handle regular WebSocket connections (/ws/stream)
   * @param {WebSocket} ws - Client WebSocket connection
   * @param {http.IncomingMessage} req - HTTP request
   */
  handleStreamConnection(ws, req) {
    logger.info('Handling regular WebSocket connection');

    // Setup client message handling
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(ws, data);
      } catch (error) {
        logger.error('Client message parse error:', error);
        ws.send(JSON.stringify({ 
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle client disconnection
    ws.on('close', (code, reason) => {
      logger.info('WebSocket client disconnected', { 
        code, 
        reason: reason.toString(),
        ip: req.connection.remoteAddress 
      });
      
      // Clean up client subscriptions
      this.cleanupClientSubscriptions(ws);
    });

    // Handle client errors
    ws.on('error', (error) => {
      logger.error('WebSocket client error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to StockAgent WebSocket server',
      timestamp: Date.now()
    }));
  }

  /**
   * Handle TradingView WebSocket connections (/ws/tradingview)
   * @param {WebSocket} ws - Client WebSocket connection
   * @param {http.IncomingMessage} req - HTTP request
   */
  async handleTradingViewConnection(ws, req) {
    logger.info('Handling TradingView WebSocket connection');

    // Import TradingView adapter
    const tvWsAdapter = require('../../api/tvWsAdapterController');

    // Setup client message handling
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.method === 'subscribe' && data.params && data.params.symbols) {
          // Handle TradingView subscription
          const symbols = data.params.symbols.map(symbol => {
            const [exchange, symbolName] = symbol.split(':');
            return { symbol: symbolName, exchange: exchange || 'NSE' };
          });
          
          logger.info(`TradingView client subscribing to ${symbols.length} symbols`, symbols);
          
          // Start TradingView feed
          const cleanup = await tvWsAdapter.startWebSocketFeed(symbols, (quoteData) => {
            // Send quote data to client in TradingView format
            const response = {
              name: 'qsd',
              params: [
                `qs_${Date.now()}`,
                {
                  n: quoteData.symbol,
                  v: {
                    lp: quoteData.lastPrice,
                    bid: quoteData.bid,
                    ask: quoteData.ask,
                    ch: quoteData.change,
                    chp: quoteData.changePercent,
                    volume: quoteData.volume,
                    high: quoteData.high,
                    low: quoteData.low,
                    open: quoteData.open
                  }
                }
              ]
            };
            
            if (ws.readyState === require('ws').OPEN) {
              ws.send(JSON.stringify(response));
            }
          });
          
          // Store cleanup function for later
          ws.cleanupFunction = cleanup;
          
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            symbols: data.params.symbols,
            message: `Subscribed to ${data.params.symbols.length} symbols via TradingView`
          }));
          
        } else if (data.method === 'unsubscribe') {
          // Handle unsubscription
          if (ws.cleanupFunction) {
            ws.cleanupFunction();
            ws.cleanupFunction = null;
          }
          
          ws.send(JSON.stringify({
            type: 'unsubscription_confirmed',
            message: 'Unsubscribed from all symbols'
          }));
        }
        
      } catch (error) {
        logger.error('TradingView client message parse error:', error);
        ws.send(JSON.stringify({ 
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle client disconnection
    ws.on('close', (code, reason) => {
      logger.info('TradingView WebSocket client disconnected', { 
        code, 
        reason: reason.toString(),
        ip: req.connection.remoteAddress 
      });
      
      // Clean up TradingView subscriptions
      if (ws.cleanupFunction) {
        ws.cleanupFunction();
      }
    });

    // Handle client errors
    ws.on('error', (error) => {
      logger.error('TradingView WebSocket client error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to StockAgent TradingView WebSocket server',
      timestamp: Date.now()
    }));
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
      
      // Close WebSocket server
      if (this.wss) {
        logger.info('Closing WebSocket server...');
        this.wss.close();
        this.wss = null;
      }
      
      // Disconnect data.simpleincome.co WebSocket client
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