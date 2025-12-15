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
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.host}/ws/stream`;
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    
                    // Send any queued messages
                    while (this.messageQueue.length > 0) {
                        const message = this.messageQueue.shift();
                        this.sendMessage(message);
                    }
                    
                    // Resubscribe to existing subscriptions
                    if (this.subscriptions.size > 0) {
                        const symbols = Array.from(this.subscriptions).map(sub => {
                            const [exchange, ...symbolParts] = sub.split(':');
                            return { symbol: symbolParts.join(':'), exchange };
                        });
                        this.sendMessage({ type: 'subscribe', symbols });
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
                    console.log('WebSocket disconnected');
                    this.ws = null;
                    this.isConnecting = false;
                    
                    // Attempt reconnection
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                        setTimeout(() => this.connect(), this.reconnectInterval);
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.isConnecting = false;
                    reject(error);
                };
                
            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }
    
    disconnect() {
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        this.messageQueue = [];
    }
    
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for when connection is established
            this.messageQueue.push(message);
        }
    }
    
    subscribe(symbols) {
        if (!Array.isArray(symbols)) {
            symbols = [symbols];
        }
        
        const validSymbols = [];
        symbols.forEach(symbolData => {
            let { symbol, exchange = 'NSE' } = symbolData;
            if (symbol) {
                // Sanitize input
                symbol = String(symbol).toUpperCase().trim();
                exchange = String(exchange).toUpperCase().trim();

                const seriesKey = `${exchange}:${symbol}`.replace(/\s+/g, '');
                this.subscriptions.add(seriesKey);
                validSymbols.push({ symbol, exchange });
            }
        });
        
        if (validSymbols.length > 0) {
            this.sendMessage({ type: 'subscribe', symbols: validSymbols });
        }
        
        return validSymbols;
    }
    
    unsubscribe(symbols) {
        if (!Array.isArray(symbols)) {
            symbols = [symbols];
        }
        
        const validSymbols = [];
        symbols.forEach(symbolData => {
            let { symbol, exchange = 'NSE' } = symbolData;
            if (symbol) {
                // Sanitize input
                symbol = String(symbol).toUpperCase().trim();
                exchange = String(exchange).toUpperCase().trim();

                const seriesKey = `${exchange}:${symbol}`.replace(/\s+/g, '');
                this.subscriptions.delete(seriesKey);
                validSymbols.push({ symbol, exchange });
            }
        });
        
        if (validSymbols.length > 0) {
            this.sendMessage({ type: 'unsubscribe', symbols: validSymbols });
        }
        
        return validSymbols;
    }
    
    handleMessage(data) {
        // Trigger callbacks for specific event types
        if (data.type && this.callbacks.has(data.type)) {
            this.callbacks.get(data.type).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in WebSocket callback:', error);
                }
            });
        }
        
        // Handle price updates specifically
        if (data.type === 'price_update' && data.data) {
            const { seriesKey, symbol, exchange, lp: price, ts: timestamp } = data.data;
            
            // Trigger symbol-specific callbacks
            const symbolKey = `price:${seriesKey}`;
            if (this.callbacks.has(symbolKey)) {
                this.callbacks.get(symbolKey).forEach(callback => {
                    try {
                        callback({ price, timestamp, symbol, exchange, seriesKey });
                    } catch (error) {
                        console.error('Error in price update callback:', error);
                    }
                });
            }
            
            // Trigger general price update callbacks
            if (this.callbacks.has('price_update')) {
                this.callbacks.get('price_update').forEach(callback => {
                    try {
                        callback({ price, timestamp, symbol, exchange, seriesKey });
                    } catch (error) {
                        console.error('Error in general price update callback:', error);
                    }
                });
            }
        }
    }
    
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
        
        // Return unsubscribe function
        return () => {
            if (this.callbacks.has(event)) {
                const callbacks = this.callbacks.get(event);
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
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
    
    // Helper method to subscribe to multiple symbols from signals
    subscribeToSignals(signals) {
        const symbols = signals.map(signal => ({
            symbol: signal.symbol,
            exchange: signal.exchange || 'NSE'
        })).filter(item => item.symbol);
        
        return this.subscribe(symbols);
    }
    
    // Helper method to subscribe to watchlist items
    subscribeToWatchlist(watchlistItems) {
        const symbols = watchlistItems.map(item => ({
            symbol: item.stockName,
            exchange: item.exchange || 'NSE'
        })).filter(item => item.symbol);
        
        return this.subscribe(symbols);
    }
    
    // Get current connection status
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
    
    // Check if WebSocket is connected
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Create global instance
window.wsManager = new WebSocketManager();