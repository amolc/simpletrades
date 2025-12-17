// Simple test to monitor WebSocket connection in the browser
// This script can be run in the browser console on the signals page

(function testWebSocketFallback() {
    console.log('🚀 Starting WebSocket fallback test...');
    
    // Monitor WebSocket connection attempts
    const originalWebSocket = window.WebSocket;
    let connectionAttempts = 0;
    
    window.WebSocket = function(url, protocols) {
        connectionAttempts++;
        console.log('🔌 WebSocket connection attempt ' + connectionAttempts + ' to: ' + url);
        
        const ws = new originalWebSocket(url, protocols);
        
        // Monitor connection events
        const originalOnOpen = ws.onopen;
        const originalOnError = ws.onerror;
        const originalOnClose = ws.onclose;
        
        ws.onopen = function(event) {
            console.log('✅ WebSocket connected successfully to: ' + url);
            if (originalOnOpen) originalOnOpen.call(this, event);
        };
        
        ws.onerror = function(event) {
            console.log('❌ WebSocket error for: ' + url, event);
            if (originalOnError) originalOnError.call(this, event);
        };
        
        ws.onclose = function(event) {
            console.log('🔒 WebSocket closed for: ' + url, event);
            if (originalOnClose) originalOnClose.call(this, event);
        };
        
        return ws;
    };
    
    // Test the WebSocketManager if it exists
    if (window.wsManager) {
        console.log('📡 Found WebSocketManager, testing connection...');
        
        // Add price update callback
        window.wsManager.on('price_update', (data) => {
            console.log('💰 Price update received:', data);
        });
        
        // Test connection
        window.wsManager.connect().then(() => {
            console.log('✅ WebSocketManager connected successfully!');
            
            // Test subscription with sample symbols
            const symbols = [
                { symbol: 'BTCUSDT', exchange: 'BINANCE' },
                { symbol: 'RELIANCE', exchange: 'NSE' }
            ];
            
            console.log('📊 Subscribing to symbols:', symbols);
            window.wsManager.subscribe(symbols);
            console.log('✅ Subscription request sent!');
            
            // Check connection status
            setTimeout(() => {
                const status = window.wsManager.getConnectionStatus();
                console.log('📈 Current connection status:', status);
                console.log('🔗 Total connection attempts:', connectionAttempts);
                
                if (connectionAttempts > 1) {
                    console.log('🔄 Fallback mechanism was triggered!');
                }
                
            }, 5000);
            
        }).catch((error) => {
            console.error('❌ WebSocketManager connection failed:', error);
        });
        
    } else {
        console.log('⚠️ WebSocketManager not found on page');
    }
    
    console.log('🧪 WebSocket monitoring active - check console for updates');
})();