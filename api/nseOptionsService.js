const { connect } = require('tradingview-ws');
const EventEmitter = require('events');

class NSEOptionsService extends EventEmitter {
  constructor() {
    super();
    this.wsConnection = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.debugMode = process.env.DEBUG === 'true';
    this.quoteSessionId = null;
  }

  log(message, data = '') {
    if (this.debugMode) {
      console.log(`[NSEOptions] ${message}`, data);
    }
  }

  async connect() {
    if (this.isConnected && this.wsConnection) {
      this.log('Already connected');
      return true;
    }

    try {
      this.log('Initializing TradingView WebSocket connection...');
      
      this.wsConnection = await connect({});
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      this.log('WebSocket connected');
      
      // Set up event handler
      this.wsConnection.subscribe((event) => {
        this.handleWebSocketEvent(event);
      });
      
      // Create quote session
      this.quoteSessionId = `qs_nse_${Date.now()}`;
      this.wsConnection.send('quote_create_session', [this.quoteSessionId]);
      this.wsConnection.send('quote_set_fields', [this.quoteSessionId, 'lp', 'ch', 'chp', 'bid', 'ask', 'volume']);
      
      return true;
    } catch (error) {
      this.log('Connection failed', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  handleWebSocketEvent(event) {
    if (event.type === 'qsd' && event.data && event.data[1]) {
      const quoteData = event.data[1];
      const symbol = quoteData.n;
      const values = quoteData.v;
      
      if (symbol && values) {
        this.log(`Received quote for ${symbol}`, values);
        
        // Extract price data
        const priceData = {
          symbol: symbol,
          price: values.lp || values.bid || values.ask || 0,
          bid: values.bid,
          ask: values.ask,
          change: values.ch,
          changePercent: values.chp,
          volume: values.volume,
          timestamp: Date.now()
        };

        // Emit price update
        this.emit('priceUpdate', priceData);
        
        // Store in subscriptions
        if (this.subscriptions.has(symbol)) {
          this.subscriptions.set(symbol, priceData);
        }
      }
    }
  }

  async subscribe(symbol) {
    await this.connect();
    
    const fullSymbol = symbol.startsWith('NSE:') ? symbol : `NSE:${symbol}`;
    
    this.log(`Subscribing to ${fullSymbol}`);
    
    // Add to subscriptions
    this.subscriptions.set(fullSymbol, null);
    
    // Send subscription message using tradingview-ws
    if (this.wsConnection && this.quoteSessionId) {
      this.wsConnection.send('quote_add_symbols', [this.quoteSessionId, fullSymbol]);
    }
    
    // Return current price if available
    return new Promise((resolve) => {
      const checkPrice = () => {
        const priceData = this.subscriptions.get(fullSymbol);
        if (priceData && priceData.price > 0) {
          resolve(priceData);
        } else {
          setTimeout(checkPrice, 100);
        }
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        resolve({ symbol: fullSymbol, price: 0, error: 'timeout' });
      }, 10000);
      
      checkPrice();
    });
  }

  unsubscribe(symbol) {
    const fullSymbol = symbol.startsWith('NSE:') ? symbol : `NSE:${symbol}`;
    
    this.log(`Unsubscribing from ${fullSymbol}`);
    
    this.subscriptions.delete(fullSymbol);
    
    const unsubscribeMsg = `~m~${59 + fullSymbol.length}~m~{"m":"quote_remove_symbols","p":["qs_nse_options","${fullSymbol}"]}`;
    this.sendMessage(unsubscribeMsg);
  }

  getPrice(symbol) {
    const fullSymbol = symbol.startsWith('NSE:') ? symbol : `NSE:${symbol}`;
    return this.subscriptions.get(fullSymbol);
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect().catch(() => {
          this.log('Reconnection failed');
        });
      }, this.reconnectDelay);
    }
  }

  disconnect() {
    this.log('Disconnecting');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.subscriptions.clear();
  }
}

// Create singleton instance
const nseOptionsService = new NSEOptionsService();

module.exports = nseOptionsService;