/**
 * Data.SimpleIncome.co WebSocket integration module
 * @module websocket/data-simpleincome-websocket
 */

const WebSocket = require('ws');
const axios = require('axios');
const { logger, PerformanceUtils } = require('../utils/helpers');

/**
 * Data.SimpleIncome.co WebSocket connection states
 */
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

/**
 * Data.SimpleIncome.co WebSocket client for real-time market data
 */
class DataSimpleIncomeWebSocket {
  constructor(options = {}) {
    this.ws = null;
    this.connectionState = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.subscriptions = new Map(); // Stores { key: { symbol, exchange, callback } }
    this.messageHandlers = new Map();
    
    // Performance tracking
    this.metrics = {
      messagesReceived: 0,
      messagesSent: 0,
      connectionDuration: 0,
      lastMessageTime: null,
      errors: 0
    };
    
    this.connectionStartTime = null;
    this.reconnectTimer = null;
  }

  /**
   * Initialize WebSocket connection
   * @returns {Promise<boolean>} Connection success
   */
  async connect() {
    const timer = PerformanceUtils.createTimer('DataSimpleIncome WebSocket Connect');
    timer.start();
    
    try {
      if (this.connectionState === ConnectionState.CONNECTED) {
        logger.info('Already connected to Data.SimpleIncome.co');
        return true;
      }
      
      if (this.connectionState === ConnectionState.CONNECTING) {
        logger.info('Connection already in progress');
        return false;
      }
      
      this.connectionState = ConnectionState.CONNECTING;
      logger.info('Connecting to Data.SimpleIncome.co WebSocket...');
      
      // Create WebSocket connection to data.simpleincome.co
      const wsUrl = 'wss://data.simpleincome.co/ws/stream/';
      this.ws = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.connectionState = ConnectionState.ERROR;
          reject(new Error('Connection timeout'));
        }, 30000);
        
        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.connectionState = ConnectionState.CONNECTED;
          this.connectionStartTime = Date.now();
          this.reconnectAttempts = 0;

          logger.info('Connected to Data.SimpleIncome.co WebSocket');
          timer.stop();

          // Resubscribe to existing subscriptions
          this.resubscribeAll();

          resolve(true);
        });
        
        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });
        
        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          this.connectionState = ConnectionState.ERROR;
          this.metrics.errors++;
          logger.error('Data.SimpleIncome.co WebSocket error:', error);
          reject(error);
        });
        
        this.ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          this.connectionState = ConnectionState.DISCONNECTED;
          
          const duration = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
          this.metrics.connectionDuration += duration;
          this.connectionStartTime = null;
          
          logger.info('Data.SimpleIncome.co WebSocket disconnected', { code, reason: reason.toString() });
          
          // Attempt reconnection if not manually disconnected
          if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        });
      });
      
    } catch (error) {
      this.connectionState = ConnectionState.ERROR;
      this.metrics.errors++;
      logger.error('Failed to connect to Data.SimpleIncome.co:', error);
      timer.stop();
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Buffer} data - Message data
   */
  handleMessage(data) {
    try {
      this.metrics.messagesReceived++;
      this.metrics.lastMessageTime = Date.now();
      
      const message = JSON.parse(data.toString());
      logger.debug('Received message from Data.SimpleIncome.co:', message);
      
      // Handle different message types
      if (message.type === 'price_update' && message.data) {
        this.handlePriceUpdate(message.data);
      } else if (message.type === 'subscription_confirmed') {
        logger.info('Subscription confirmed:', message.symbols);
      } else if (message.type === 'error') {
        logger.error('Data.SimpleIncome.co error:', message.error);
      }
      
    } catch (error) {
      this.metrics.errors++;
      logger.error('Error handling Data.SimpleIncome.co message:', error);
    }
  }

  /**
   * Handle price update messages
   * @param {object} data - Price data
   */
  handlePriceUpdate(data) {
    try {
      if (!data.symbol || !data.price) return;
      
      const symbolKey = `${data.exchange || 'NSE'}:${data.symbol}`;
      const subscription = this.subscriptions.get(symbolKey);
      
      if (subscription && subscription.callback) {
        // Transform data to match expected format
        const transformedData = {
          s: symbolKey,
          lp: data.price,
          ask: data.ask || null,
          bid: data.bid || null,
          ch: data.change || null,
          chp: data.changePercent || null,
          volume: data.volume || null,
          timestamp: data.timestamp || Date.now()
        };
        
        subscription.callback(transformedData);
      }
      
    } catch (error) {
      logger.error('Error handling price update:', error);
    }
  }

  /**
   * Subscribe to symbol
   * @param {string} symbol - Symbol name
   * @param {string} exchange - Exchange name
   * @param {function} callback - Price update callback
   * @returns {boolean} Subscription success
   */
  subscribe(symbol, exchange = 'NSE', callback) {
    try {
      if (this.connectionState !== ConnectionState.CONNECTED) {
        logger.warn('Cannot subscribe - not connected to Data.SimpleIncome.co');
        return false;
      }
      
      const symbolKey = `${exchange}:${symbol}`.toUpperCase();
      
      // Store subscription
      this.subscriptions.set(symbolKey, {
        symbol: symbol.toUpperCase(),
        exchange: exchange.toUpperCase(),
        callback,
        subscribedAt: Date.now()
      });
      
      // Send subscription message
      const message = {
        type: 'subscribe',
        symbols: [{
          symbol: symbol.toUpperCase(),
          exchange: exchange.toUpperCase()
        }]
      };
      
      this.send(message);
      logger.info(`Subscribed to ${symbolKey} on Data.SimpleIncome.co`);
      return true;
      
    } catch (error) {
      logger.error('Subscribe error:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from symbol
   * @param {string} symbol - Symbol name
   * @param {string} exchange - Exchange name
   * @returns {boolean} Unsubscription success
   */
  unsubscribe(symbol, exchange = 'NSE') {
    try {
      if (this.connectionState !== ConnectionState.CONNECTED) {
        logger.warn('Cannot unsubscribe - not connected to Data.SimpleIncome.co');
        return false;
      }
      
      const symbolKey = `${exchange}:${symbol}`.toUpperCase();
      
      // Remove subscription
      this.subscriptions.delete(symbolKey);
      
      // Send unsubscription message
      const message = {
        type: 'unsubscribe',
        symbols: [{
          symbol: symbol.toUpperCase(),
          exchange: exchange.toUpperCase()
        }]
      };
      
      this.send(message);
      logger.info(`Unsubscribed from ${symbolKey} on Data.SimpleIncome.co`);
      return true;
      
    } catch (error) {
      logger.error('Unsubscribe error:', error);
      return false;
    }
  }

  /**
   * Resubscribe to all existing subscriptions
   */
  resubscribeAll() {
    try {
      if (this.subscriptions.size === 0) return;
      
      const symbols = Array.from(this.subscriptions.values()).map(sub => ({
        symbol: sub.symbol,
        exchange: sub.exchange
      }));
      
      const message = {
        type: 'subscribe',
        symbols
      };
      
      this.send(message);
      logger.info(`Resubscribed to ${symbols.length} symbols on Data.SimpleIncome.co`);
      
    } catch (error) {
      logger.error('Resubscribe error:', error);
    }
  }

  /**
   * Send message through WebSocket
   * @param {object} message - Message to send
   */
  send(message) {
    try {
      if (this.connectionState !== ConnectionState.CONNECTED || !this.ws) {
        logger.warn('Cannot send message - WebSocket not connected');
        return false;
      }
      
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      this.metrics.messagesSent++;
      
      logger.debug('Sent message to Data.SimpleIncome.co:', message);
      return true;
      
    } catch (error) {
      logger.error('Send message error:', error);
      return false;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    this.connectionState = ConnectionState.RECONNECTING;
    
    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    
    logger.info(`Scheduling reconnection to Data.SimpleIncome.co in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        logger.error('Reconnection attempt failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect WebSocket
   * @returns {Promise<boolean>} Disconnect success
   */
  async disconnect() {
    try {
      logger.info('Disconnecting from Data.SimpleIncome.co WebSocket...');
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      this.connectionState = ConnectionState.DISCONNECTED;
      
      if (this.ws) {
        this.ws.close(1000, 'Manual disconnect');
        this.ws = null;
      }
      
      logger.info('Disconnected from Data.SimpleIncome.co WebSocket');
      return true;
      
    } catch (error) {
      logger.error('Disconnect error:', error);
      return false;
    }
  }

  /**
   * Get connection status
   * @returns {object} Status information
   */
  getStatus() {
    const isConnected = this.connectionState === ConnectionState.CONNECTED;
    
    return {
      connected: isConnected,
      status: this.connectionState,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      metrics: { ...this.metrics },
      connectionDuration: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
    };
  }

  /**
   * Get metrics
   * @returns {object} Metrics data
   */
  getMetrics() {
    return {
      ...this.metrics,
      subscriptions: this.subscriptions.size,
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

module.exports = {
  DataSimpleIncomeWebSocket,
  ConnectionState
};