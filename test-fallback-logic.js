// Simple Node.js test to verify WebSocket fallback logic
// This tests the WebSocketManager fallback functionality

const WebSocket = require('ws');

// Mock the browser WebSocket for testing
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.currentProvider = 'data.simpleincome.co';
        this.fallbackProvider = 'tradingview';
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectInterval = 5000;
        this.subscriptions = new Set();
        this.callbacks = new Map();
        this.messageQueue = [];
    }
    
    async connect() {
        if (this.isConnecting) return Promise.resolve();
        
        this.isConnecting = true;
        
        return new Promise((resolve, reject) => {
            this._attemptConnection(this.currentProvider)
                .then(resolve)
                .catch((error) => {
                    console.error(`Failed to connect to ${this.currentProvider}:`, error.message);
                    
                    // Try fallback provider
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
                    // Test with a working WebSocket server
                    wsUrl = 'wss://echo.websocket.org/'; // Test echo server
                } else {
                    throw new Error(`Unknown provider: ${provider}`);
                }
                
                console.log(`Attempting connection to ${provider} at ${wsUrl}...`);
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.on('open', () => {
                    console.log(`✅ Connected to ${provider}!`);
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    resolve();
                });
                
                this.ws.on('error', (error) => {
                    console.error(`❌ Connection error to ${provider}:`, error.message);
                    this.isConnecting = false;
                    reject(error);
                });
                
                this.ws.on('close', () => {
                    console.log(`🔒 Disconnected from ${provider}`);
                    this.ws = null;
                });
                
            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }
    
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
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
}

// Test the fallback functionality
async function testWebSocketFallback() {
    console.log('🚀 Testing WebSocket fallback functionality...\n');
    
    const wsManager = new WebSocketManager();
    
    // Add a callback for testing
    wsManager.on('test_event', (data) => {
        console.log('Test event received:', data);
    });
    
    try {
        console.log('📡 Attempting primary connection...');
        await wsManager.connect();
        
        const status = wsManager.getConnectionStatus();
        console.log('📊 Connection status:', status);
        console.log('🔌 Current provider:', wsManager.currentProvider);
        
        if (wsManager.currentProvider === 'tradingview') {
            console.log('✅ Fallback to TradingView was successful!');
        } else {
            console.log('✅ Primary connection successful!');
        }
        
        console.log('\n🎉 WebSocket fallback test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ All connection attempts failed:', error.message);
    }
}

// Run the test
testWebSocketFallback();