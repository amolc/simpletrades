// Test script for WebSocket fallback functionality
const WebSocketManager = require('./assets/js/websocketManager.js');

async function testWebSocketFallback() {
    console.log('🚀 Testing WebSocket fallback functionality...');
    
    // Create a new WebSocketManager instance
    const wsManager = new WebSocketManager();
    
    // Add a callback to handle price updates
    wsManager.on('price_update', (data) => {
        console.log('📈 Price update received:', data);
    });
    
    // Test connection
    try {
        console.log('Attempting to connect...');
        await wsManager.connect();
        console.log('✅ Connection successful!');
        
        // Test subscription
        console.log('Testing subscription...');
        const symbols = [
            { symbol: 'BTCUSDT', exchange: 'BINANCE' },
            { symbol: 'RELIANCE', exchange: 'NSE' }
        ];
        
        wsManager.subscribe(symbols);
        console.log('✅ Subscription sent!');
        
        // Keep the connection alive for testing
        console.log('Keeping connection alive for 30 seconds...');
        setTimeout(() => {
            console.log('Disconnecting...');
            wsManager.disconnect();
            console.log('✅ Test completed!');
            process.exit(0);
        }, 30000);
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testWebSocketFallback();