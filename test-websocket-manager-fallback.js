const WebSocketManager = require('./assets/js/websocketManager.js');

async function testWebSocketManagerFallback() {
    console.log('🚀 Testing WebSocketManager fallback functionality...');
    
    // Create WebSocketManager instance
    const wsManager = new WebSocketManager();
    
    // Mock symbols from signals page
    const mockSymbols = [
        { symbol: 'RELIANCE', exchange: 'NSE' },
        { symbol: 'TCS', exchange: 'NSE' },
        { symbol: 'INFY', exchange: 'NSE' }
    ];
    
    console.log('📊 Mock symbols from page:', mockSymbols);
    
    // Add price update callback
    wsManager.on('price_update', (data) => {
        console.log('💰 Price update received:', {
            symbol: data.symbol,
            price: data.price,
            exchange: data.exchange,
            timestamp: data.timestamp
        });
    });
    
    // Add specific symbol callbacks
    mockSymbols.forEach(({ symbol, exchange }) => {
        const symbolKey = `${exchange}:${symbol}`;
        wsManager.on(`price:${symbolKey}`, (data) => {
            console.log(`📈 Specific update for ${symbolKey}:`, {
                price: data.price,
                change: data.change,
                changePercent: data.changePercent
            });
        });
    });
    
    try {
        console.log('📡 Connecting to WebSocket...');
        await wsManager.connect();
        console.log('✅ WebSocket connected successfully');
        
        console.log('📡 Subscribing to symbols...');
        await wsManager.subscribe(mockSymbols);
        console.log('✅ Subscribed to symbols:', mockSymbols);
        
        // Keep connection open for 15 seconds to receive data
        console.log('⏳ Waiting for price updates...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        console.log('🔌 Disconnecting...');
        wsManager.disconnect();
        
        console.log('✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    }
}

// Run the test
testWebSocketManagerFallback()
    .then(() => {
        console.log('✅ All tests passed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });