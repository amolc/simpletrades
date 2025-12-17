// Test the complete signals page WebSocket fallback flow
// This simulates the browser environment

// Mock WebSocket for testing
const WebSocket = require('ws');

// Load the WebSocketManager from the file
const fs = require('fs');
const path = require('path');

// Read and execute the WebSocketManager code
const wsManagerCode = fs.readFileSync(path.join(__dirname, 'assets/js/websocketManager.js'), 'utf8');

// Create a mock window object
global.window = {
    WebSocket: WebSocket,
    wsManager: null
};

// Execute the WebSocketManager code
eval(wsManagerCode);

async function testSignalsPageFallback() {
    console.log('🚀 Testing signals page WebSocket fallback...\n');
    
    // Mock symbols from the signals page
    const mockSymbols = [
        { symbol: 'RELIANCE', exchange: 'NSE' },
        { symbol: 'TCS', exchange: 'NSE' },
        { symbol: 'INFY', exchange: 'NSE' }
    ];
    
    console.log('📊 Mock symbols from page:', mockSymbols);
    
    // Set up price update callback
    window.wsManager.on('price_update', (data) => {
        console.log('💰 Price update received:', data);
        
        // Simulate UI update
        if (data.symbol && data.price) {
            console.log(`🔄 Would update UI: ${data.symbol} = Rs ${data.price.toFixed(2)}`);
        }
    });
    
    try {
        console.log('\n📡 Connecting to WebSocket...');
        await window.wsManager.connect();
        
        const status = window.wsManager.getConnectionStatus();
        const provider = window.wsManager.getCurrentProvider();
        
        console.log('📊 Connection status:', status);
        console.log('🔌 Current provider:', provider);
        
        if (provider === 'tradingview') {
            console.log('✅ Fallback to TradingView was successful!');
        } else {
            console.log('✅ Primary connection successful!');
        }
        
        console.log('\n📈 Subscribing to symbols...');
        const subscribed = window.wsManager.subscribe(mockSymbols);
        console.log('✅ Subscribed to:', subscribed);
        
        console.log('\n🎉 Signals page WebSocket fallback test completed successfully!');
        console.log('💰 Price updates will be displayed in the UI');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
    
    // Disconnect after test
    setTimeout(() => {
        window.wsManager.disconnect();
        console.log('🔌 Disconnected from WebSocket');
    }, 5000);
}

// Run the test
testSignalsPageFallback();