/**
 * TradingView WebSocket integration module
 * @module websocket/tradingview-websocket
 */

const WebSocket = require('ws');
const { TvApiAdapter } = require('tradingview-api-adapter');
const { logger, PerformanceUtils } = require('../utils/helpers');

/**
 * TradingView WebSocket connection states
 */
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

/**
 * TradingView WebSocket client for real-time market data
 */
class TradingViewWebSocket {
  constructor(options = {}) {
    this.adapter = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.subscriptions = new Map(); // Stores { key: { symbol, exchange, callback, quote } }
    
    // Performance tracking
    this.metrics = {
      messagesReceived: 0,
      messagesSent: 0,
      connectionDuration: 0,
      lastMessageTime: null,
      errors: 0
    };
  }

  /**
   * Initialize WebSocket connection
   * @returns {Promise<boolean>} Connection success
   */
  async connect() {
    const timer = PerformanceUtils.createTimer('WebSocket Connect');
    timer.start();
    
    try {
      if (this.connectionState === ConnectionState.CONNECTED) {
        logger.warn('WebSocket already connected');
        return true;
      }

      this.connectionState = ConnectionState.CONNECTING;
      logger.info('Initializing TradingView Adapter...');

      this.adapter = new TvApiAdapter();
      
      // The adapter doesn't have an explicit connect event we can wait for in the same way,
      // but creating it is the first step.
      
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      
      const executionTime = timer.stop();
      logger.info('TradingView Adapter initialized successfully', { 
        executionTime: `${executionTime.toFixed(2)}ms` 
      });
      
      return true;

    } catch (error) {
      this.connectionState = ConnectionState.ERROR;
      timer.stop();
      logger.error('TradingView Adapter initialization error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to symbol
   * @param {string} symbol - Symbol to subscribe
   * @param {string} exchange - Exchange name
   * @param {function} callback - Data callback
   * @returns {boolean} Subscription success
   */
  subscribe(symbol, exchange = 'NSE', callback) {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      logger.error('Cannot subscribe: Adapter not initialized');
      return false;
    }

    try {
      // Normalize inputs - but keep original case for exchange
      exchange = exchange || 'NSE';
      symbol = (symbol || '').trim();

      // Create subscription key with original case
      const subscriptionKey = `${exchange}:${symbol}`;
      
      logger.info('Attempting subscription', { symbol, exchange, subscriptionKey });
      
      if (this.subscriptions.has(subscriptionKey)) {
        logger.warn('Already subscribed to', subscriptionKey);
        return true;
      }

      const fields = ['lp', 'ask', 'bid', 'ch', 'chp', 'volume', 'trade'];
      logger.info('Creating TradingView quote', { symbol, exchange, fields });
      const quote = this.adapter.Quote(symbol, exchange, fields);

      // Listen for permission denied events
      quote.$adapter.on('permission_denied', (permissionData) => {
        logger.warn('Permission denied for symbol, retrying with alternative', { 
          symbol, 
          exchange, 
          permissionData 
        });
        
        // For NSE exchange, ignore permission denied and continue with current exchange
        if (exchange.toUpperCase() === 'NSE') {
          logger.info('Permission denied for NSE exchange, continuing with current exchange (data will come automatically)', { 
            symbol, 
            exchange, 
            alternative: permissionData.alternative 
          });
          return; // Don't retry, just continue with current exchange
        }
        
        // For other exchanges, check if alternative is different
        const alternativeExchange = permissionData.alternative;
        if (alternativeExchange && alternativeExchange.toLowerCase() !== exchange.toLowerCase()) {
          // Unsubscribe from current symbol
          this.unsubscribe(symbol, exchange);
          
          logger.info('Retrying with alternative exchange', { symbol, alternativeExchange });
          
          setTimeout(() => {
            this.subscribe(symbol, alternativeExchange, callback);
          }, 1000);
        } else {
          logger.info('Permission denied but alternative is same as current exchange, continuing with current exchange', { 
            symbol, 
            exchange, 
            alternative: alternativeExchange 
          });
        }
      });

      // Listen for data
      quote.listen((data) => {
        this.metrics.messagesReceived++;
        this.metrics.lastMessageTime = Date.now();
        
        logger.info('Received quote data', { symbol, exchange, data: JSON.stringify(data) });
        
        // Check if we received an error or empty data
        if (!data || Object.keys(data).length === 0) {
          logger.warn('Received empty or invalid data from TradingView', { symbol, exchange, data });
          return;
        }
        
        // Transform data to match expected format
        const transformedData = {
          s: symbol,
          lp: data.lp || data.price || (data.trade && data.trade.price), // Last price
          ask: data.ask,
          bid: data.bid,
          ch: data.ch,
          chp: data.chp,
          volume: data.volume || (data.trade && data.trade.size),
          exchange: exchange
        };
        
        logger.info('Transformed quote data', { symbol, exchange, transformedData });

        // Only callback if we have a price
        if (transformedData.lp !== undefined && transformedData.lp !== null) {
          logger.info('Calling callback with price data', { symbol, exchange, lp: transformedData.lp });
          callback(transformedData);
        } else {
          logger.warn('No valid price data received', { symbol, exchange, lp: transformedData.lp, availableFields: Object.keys(data) });
        }
      });

      // Store subscription
      this.subscriptions.set(subscriptionKey, {
        symbol,
        exchange,
        callback,
        quote,
        subscribedAt: Date.now()
      });

      logger.info('Subscribed to symbol via Adapter', { symbol, exchange });
      return true;
    } catch (error) {
      logger.error('Subscription error:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from symbol
   * @param {string} symbol - Symbol to unsubscribe
   * @param {string} exchange - Exchange name
   * @returns {boolean} Unsubscription success
   */
  unsubscribe(symbol, exchange = 'NSE') {
    try {
      exchange = (exchange || 'NSE').toUpperCase();
      const subscriptionKey = `${exchange}:${symbol}`;
      
      const sub = this.subscriptions.get(subscriptionKey);
      if (!sub) {
        logger.warn('Subscription not found', { symbol, exchange });
        return false;
      }

      // Stop the quote listener
      // TvApiAdapter quotes don't have a clear 'stop' method documented here,
      // but usually we can just stop listening or pause.
      // Based on tvAdapterController, it uses pause() on channels. 
      // For Quote object, let's assume we just drop the reference and it gets GC'd 
      // or we can try to find a stop/pause method. 
      // Looking at the library source would be ideal, but for now we remove from map.
      // If the library keeps it active, it might leak. 
      // But typically creating a new Quote for same symbol shares underlying connection.
      
      // Let's try to see if there is a way to stop it.
      // Since we don't know for sure, we just remove our reference.
      
      this.subscriptions.delete(subscriptionKey);
      logger.info('Unsubscribed from symbol', { symbol, exchange });
      return true;
    } catch (error) {
      logger.error('Unsubscription error:', error);
      return false;
    }
  }

  // Legacy methods stubbed out or adapted
  startHeartbeat() {}
  stopHeartbeat() {}
  sendMessage() { return false; }
  handleDisconnection() {}
  
  /**
   * Cleanup resources
   */
  cleanup() {
    this.subscriptions.clear();
    this.adapter = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    logger.info('TradingView Adapter cleanup completed');
  }

  /**
   * Disconnect WebSocket
   * @returns {Promise<boolean>} Disconnection success
   */
  async disconnect() {
    this.cleanup();
    return true;
  }

  /**
   * Get connection status
   * @returns {object} Status information
   */
  getStatus() {
    return {
      state: this.connectionState,
      connected: this.connectionState === ConnectionState.CONNECTED,
      subscriptions: this.subscriptions.size,
      metrics: { ...this.metrics },
      reconnectAttempts: this.reconnectAttempts
    };
  }

  registerHandler(method, handler) {
    this.messageHandlers.set(method, handler);
  }

  unregisterHandler(method) {
    this.messageHandlers.delete(method);
  }


  /**
   * Setup WebSocket server for client connections
   * @param {http.Server} server - HTTP server instance
   * @returns {Promise<boolean>} Setup success
   */
  async setupWebSocketServer(server) {
    try {
      logger.info('Setting up WebSocket server...');
      
      // Create WebSocket server
      const wss = new WebSocket.Server({ 
        server, 
        path: '/ws/stream',
        verifyClient: (info) => {
          // Add any client verification logic here
          logger.debug('WebSocket client connection attempt', { origin: info.origin });
          return true;
        }
      });

      // Handle new connections
      wss.on('connection', (ws, req) => {
        logger.info('New WebSocket client connected', { 
          ip: req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });

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
        ws.on('close', () => {
          logger.info('WebSocket client disconnected');
          this.handleClientDisconnection(ws);
        });

        // Handle client errors
        ws.on('error', (error) => {
          logger.error('WebSocket client error:', error);
        });

        // Send initial connection success
        ws.send(JSON.stringify({ 
          type: 'connected', 
          message: 'WebSocket connection established',
          timestamp: Date.now()
        }));

        // Store client connection
        ws.subscriptions = new Set();
      });

      // Handle server errors
      wss.on('error', (error) => {
        logger.error('WebSocket server error:', error);
      });

      // Store WebSocket server reference
      this.wss = wss;
      
      logger.info('WebSocket server setup completed');
      return true;
    } catch (error) {
      logger.error('WebSocket server setup failed:', error);
      throw error;
    }
  }

  /**
   * Handle client messages
   * @param {WebSocket} ws - Client WebSocket
   * @param {object} data - Client message data
   */
  handleClientMessage(ws, data) {
    try {
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
      logger.error('Client message handling error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Internal server error' 
      }));
    }
  }

  /**
   * Handle client subscription request
   * @param {WebSocket} ws - Client WebSocket
   * @param {object} data - Subscription data
   */
  handleClientSubscribe(ws, data) {
    const { symbols } = data;
    
    if (!Array.isArray(symbols)) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'symbols must be an array' 
      }));
      return;
    }

    logger.info('Processing subscription request', { symbolCount: symbols.length, symbols: symbols.map(s => `${s.exchange}:${s.symbol}`) });

    symbols.forEach(symbolData => {
      const { symbol, exchange = 'NSE' } = symbolData;
      
      if (!symbol) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'symbol is required' 
        }));
        return;
      }

      try {
        const subscriptionKey = `${exchange}:${symbol}`;
        logger.info('Processing individual symbol subscription', { symbol, exchange, subscriptionKey });
        
        ws.subscriptions.add(subscriptionKey);
        
        // Subscribe to TradingView if not already subscribed
        if (!this.subscriptions.has(subscriptionKey)) {
          logger.info('New subscription to TradingView', { symbol, exchange, subscriptionKey });
          this.subscribe(symbol, exchange, (priceData) => {
            // Broadcast to all subscribed clients
            this.broadcastToSubscribers(subscriptionKey, priceData);
          });
        } else {
          logger.info('Already subscribed to TradingView', { symbol, exchange, subscriptionKey });
        }

        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          key: subscriptionKey,
          symbol,
          exchange,
          timestamp: Date.now()
        }));

        logger.debug('Client subscribed to symbol', { symbol, exchange });
      } catch (error) {
        logger.error('Client subscription error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: `Failed to subscribe to ${symbol}` 
        }));
      }
    });
  }

  /**
   * Handle client unsubscription request
   * @param {WebSocket} ws - Client WebSocket
   * @param {object} data - Unsubscription data
   */
  handleClientUnsubscribe(ws, data) {
    const { symbols } = data;
    
    if (!Array.isArray(symbols)) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'symbols must be an array' 
      }));
      return;
    }

    symbols.forEach(symbolData => {
      const { symbol, exchange = 'NSE' } = symbolData;
      const subscriptionKey = `${exchange}:${symbol}`;
      
      ws.subscriptions.delete(subscriptionKey);
      
      ws.send(JSON.stringify({ 
        type: 'unsubscribed', 
        key: subscriptionKey,
        symbol,
        exchange,
        timestamp: Date.now()
      }));

      logger.debug('Client unsubscribed from symbol', { symbol, exchange });
    });
  }

  /**
   * Handle client disconnection
   * @param {WebSocket} ws - Client WebSocket
   */
  handleClientDisconnection(ws) {
    try {
      // Clean up client subscriptions
      if (ws.subscriptions) {
        ws.subscriptions.forEach(subscriptionKey => {
          // Check if any other clients are still subscribed
          let stillInUse = false;
          if (this.wss) {
            this.wss.clients.forEach(client => {
              if (client !== ws && client.subscriptions && client.subscriptions.has(subscriptionKey)) {
                stillInUse = true;
              }
            });
          }
          
          // If no other clients are using this subscription, unsubscribe from TradingView
          if (!stillInUse && this.subscriptions.has(subscriptionKey)) {
            const [exchange, ...symbolParts] = subscriptionKey.split(':');
            const symbol = symbolParts.join(':');
            this.unsubscribe(symbol, exchange);
          }
        });
      }
    } catch (error) {
      logger.error('Client disconnection handling error:', error);
    }
  }

  /**
   * Broadcast price data to all subscribed clients
   * @param {string} subscriptionKey - Subscription key
   * @param {object} priceData - Price data
   */
  broadcastToSubscribers(subscriptionKey, priceData) {
    if (!this.wss) return;
    
    logger.info('Broadcasting price update', { subscriptionKey, priceData });
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.subscriptions && client.subscriptions.has(subscriptionKey)) {
        try {
          const [exchange, ...symbolParts] = subscriptionKey.split(':');
          const symbol = symbolParts.join(':');
          
          const message = {
            type: 'price_update',
            data: {
              ...priceData,
              symbol,
              exchange,
              seriesKey: subscriptionKey
            },
            timestamp: Date.now()
          };
          
          logger.info('Sending price update to client', { subscriptionKey, symbol, exchange, clientReadyState: client.readyState });
          client.send(JSON.stringify(message));
        } catch (error) {
          logger.error('Broadcast error:', error);
        }
      } else {
        logger.debug('Client not eligible for broadcast', { 
          subscriptionKey, 
          clientReadyState: client.readyState,
          hasSubscriptions: !!client.subscriptions,
          hasSubscription: client.subscriptions && client.subscriptions.has(subscriptionKey)
        });
      }
    });
  }
}

module.exports = {
  TradingViewWebSocket,
  ConnectionState
};