// Enhanced WebSocket Manager with TradingView fallback support
// This version connects to our server endpoint for TradingView data

class WebSocketManager {
    constructor() {
        this.ws = null;
        this.subscriptions = new Set();
        this.callbacks = new Map();
        this.reconnectInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.isConnecting = false;
        this.messageQueue = [];
        this.currentProvider = 'data.simpleincome.co'; // Track current provider
        this.fallbackProvider = 'tradingview'; // Fallback provider
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.on = this.on.bind(this);
        this.off = this.off.bind(this);
    }
    
    connect() {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return Promise.resolve();
        }
        
        this.isConnecting = true;
        
        return new Promise((resolve, reject) => {
            this._attemptConnection(this.currentProvider)
                .then(resolve)
                .catch((error) => {
                    console.error(`Failed to connect to ${this.currentProvider}:`, error.message);
                    
                    if (this.currentProvider !== this.fallbackProvider) {
                        console.log(`Attempting fallback connection to ${this.fallbackProvider}...`);
                        this.currentProvider = this.fallbackProvider;
                        this._attemptConnection(this.fallbackProvider)
                            .then(resolve)
                            .catch((fallbackError) => {
                                console.error(`Fallback connection to ${this.fallbackProvider} also failed:`, fallbackError.message);
                                this.isConnecting = false;
                                reject(fallbackError);
                            });
                    } else {
                        this.isConnecting = false;
                        reject(error);
                    }
                });
        });
    }
    
    _attemptConnection(provider) {
        return new Promise((resolve, reject) => {
            try {
                let wsUrl;
                
                if (provider === 'data.simpleincome.co') {
                    wsUrl = 'wss://data.simpleincome.co/ws/stream/';
                } else if (provider === 'tradingview') {
                    // Connect to our server endpoint that uses tradingview-ws
                    wsUrl = 'ws://localhost:3000/ws/tradingview';
                } else {
                    throw new Error(`Unknown provider: ${provider}`);
                }
                
                console.log(`Attempting connection to ${provider} at ${wsUrl}...`);
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log(`✅ Connected to ${provider}!`);
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    
                    // Send any queued messages
                    while (this.messageQueue.length > 0) {
                        const message = this.messageQueue.shift();
                        this.sendMessage(message);
                    }
                    
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };
                
                this.ws.onclose = () => {
                    console.log(`WebSocket disconnected from ${provider}`);
                    this.ws = null;
                    this.isConnecting = false;
                    
                    // Attempt reconnection with same provider
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} to ${provider}`);
                        setTimeout(() => this._attemptConnection(provider), this.reconnectInterval);
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error(`WebSocket error with ${provider}:`, error);
                    this.isConnecting = false;
                    reject(error);
                };
                
            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }
    
    handleMessage(data) {
        try {
            console.log('📡 WebSocket message received:', data);
            
            if (this.currentProvider === 'tradingview') {
                this._handleTradingViewMessage(data);
            } else {
                this._handleDataSimpleIncomeMessage(data);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
    
    _handleTradingViewMessage(data) {
        try {
            console.log('📡 TradingView WebSocket message received:', data);
            
            // Handle TradingView quote data format
            if (data.name === 'qsd' && data.params && data.params.length >= 2) {
                const [sessionId, quoteData] = data.params;
                
                if (quoteData && quoteData.n && quoteData.v) {
                    const symbol = quoteData.n;
                    const values = quoteData.v;
                    
                    // Extract price and other data
                    const price = values.lp || values.lastPrice;
                    const timestamp = Date.now();
                    
                    if (price !== undefined) {
                        const [exchange, symbolName] = symbol.split(':');
                        
                        console.log(`💰 TradingView price update: ${symbol} = ${price}`);
                        
                        // Trigger callbacks for specific symbol
                        const symbolKey = `price:${symbol}`;
                        if (this.callbacks.has(symbolKey)) {
                            this.callbacks.get(symbolKey).forEach(callback => {
                                try {
                                    callback({ 
                                        price, 
                                        timestamp, 
                                        symbol: symbolName, 
                                        exchange, 
                                        seriesKey: symbol,
                                        bid: values.bid,
                                        ask: values.ask,
                                        change: values.ch,
                                        changePercent: values.chp,
                                        volume: values.volume,
                                        high: values.high,
                                        low: values.low,
                                        open: values.open
                                    });
                                } catch (error) {
                                    console.error('Error in TradingView price update callback:', error);
                                }
                            });
                        }
                        
                        // Trigger general price update callback
                        if (this.callbacks.has('price_update')) {
                            this.callbacks.get('price_update').forEach(callback => {
                                try {
                                    callback({ 
                                        price, 
                                        timestamp, 
                                        symbol: symbolName, 
                                        exchange, 
                                        seriesKey: symbol,
                                        bid: values.bid,
                                        ask: values.ask,
                                        change: values.ch,
                                        changePercent: values.chp,
                                        volume: values.volume,
                                        high: values.high,
                                        low: values.low,
                                        open: values.open
                                    });
                                } catch (error) {
                                    console.error('Error in general TradingView price update callback:', error);
                                }
                            });
                        }
                    }
                }
            }
            
            // Handle simple price updates (alternative format)
            if (data.symbol && data.lp !== undefined) {
                const symbol = data.symbol;
                const price = data.lp;
                const timestamp = data.ts || Date.now();
                const exchange = data.exchange || 'NSE';
                const seriesKey = `${exchange}:${symbol}`;
                
                console.log(`💰 TradingView price update: ${seriesKey} = ${price}`);
                
                const symbolKey = `price:${seriesKey}`;
                if (this.callbacks.has(symbolKey)) {
                    this.callbacks.get(symbolKey).forEach(callback => {
                        try {
                            callback({ 
                                price, 
                                timestamp, 
                                symbol, 
                                exchange, 
                                seriesKey 
                            });
                        } catch (error) {
                            console.error('Error in TradingView price update callback:', error);
                        }
                    });
                }
                
                if (this.callbacks.has('price_update')) {
                    this.callbacks.get('price_update').forEach(callback => {
                        try {
                            callback({ 
                                price, 
                                timestamp, 
                                symbol, 
                                exchange, 
                                seriesKey 
                            });
                        } catch (error) {
                            console.error('Error in general TradingView price update callback:', error);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error handling TradingView message:', error);
        }
    }
    
    _handleDataSimpleIncomeMessage(data) {
        try {
            console.log('📡 data.simpleincome.co message received:', data);
            
            // Handle data.simpleincome.co format
            if (data.symbol && data.price !== undefined) {
                const symbol = data.symbol;
                const price = data.price;
                const timestamp = data.timestamp || Date.now();
                const exchange = data.exchange || 'NSE';
                const seriesKey = `${exchange}:${symbol}`;
                
                console.log(`💰 data.simpleincome.co price update: ${seriesKey} = ${price}`);
                
                // Trigger callbacks for specific symbol
                const symbolKey = `price:${seriesKey}`;
                if (this.callbacks.has(symbolKey)) {
                    this.callbacks.get(symbolKey).forEach(callback => {
                        try {
                            callback({ 
                                price, 
                                timestamp, 
                                symbol, 
                                exchange, 
                                seriesKey 
                            });
                        } catch (error) {
                            console.error('Error in price update callback:', error);
                        }
                    });
                }
                
                // Trigger general price update callback
                if (this.callbacks.has('price_update')) {
                    this.callbacks.get('price_update').forEach(callback => {
                        try {
                            callback({ 
                                price, 
                                timestamp, 
                                symbol, 
                                exchange, 
                                seriesKey 
                            });
                        } catch (error) {
                            console.error('Error in general price update callback:', error);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error handling data.simpleincome.co message:', error);
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        this.messageQueue = [];
        this.reconnectAttempts = 0;
    }
    
    subscribe(symbols) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('Cannot subscribe - WebSocket not connected');
            return [];
        }
        
        const subscribedSymbols = [];
        
        symbols.forEach(symbolData => {
            const { symbol, exchange } = symbolData;
            const seriesKey = `${exchange}:${symbol}`;
            
            if (this.currentProvider === 'data.simpleincome.co') {
                // Send subscription message for data.simpleincome.co
                const message = {
                    action: 'subscribe',
                    client_id: `client_${Date.now()}`,
                    symbols: [seriesKey]
                };
                
                this.sendMessage(message);
                subscribedSymbols.push(seriesKey);
                console.log(`📈 Subscribed to ${seriesKey}`);
                
            } else if (this.currentProvider === 'tradingview') {
                // Send subscription message for TradingView
                const message = {
                    method: 'subscribe',
                    params: {
                        symbols: [seriesKey]
                    }
                };
                
                this.sendMessage(message);
                subscribedSymbols.push(seriesKey);
                console.log(`📈 Subscribed to ${seriesKey} via TradingView`);
            }
        });
        
        return subscribedSymbols;
    }
    
    unsubscribe(symbols) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('Cannot unsubscribe - WebSocket not connected');
            return;
        }
        
        symbols.forEach(symbolData => {
            const { symbol, exchange } = symbolData;
            const seriesKey = `${exchange}:${symbol}`;
            
            if (this.currentProvider === 'data.simpleincome.co') {
                const message = {
                    action: 'unsubscribe',
                    client_id: `client_${Date.now()}`,
                    symbols: [seriesKey]
                };
                
                this.sendMessage(message);
                console.log(`📈 Unsubscribed from ${seriesKey}`);
                
            } else if (this.currentProvider === 'tradingview') {
                const message = {
                    method: 'unsubscribe',
                    params: {
                        symbols: [seriesKey]
                    }
                };
                
                this.sendMessage(message);
                console.log(`📈 Unsubscribed from ${seriesKey} via TradingView`);
            }
        });
    }
    
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for later
            this.messageQueue.push(message);
            console.log('Message queued - WebSocket not connected');
        }
    }
    
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.callbacks.has(event)) {
            const callbacks = this.callbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    getConnectionStatus() {
        if (!this.ws) return 'disconnected';
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'closed';
            default: return 'unknown';
        }
    }
    
    getCurrentProvider() {
        return this.currentProvider;
    }
}

// Create global instance (browser only)
if (typeof window !== 'undefined') {
    window.wsManager = new WebSocketManager();
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketManager;
}