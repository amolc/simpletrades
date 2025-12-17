const WebSocket = require('ws');

async function testLocalTradingViewEndpoint() {
    console.log('🚀 Testing local TradingView WebSocket endpoint...');
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3000/ws/tradingview');
        
        ws.on('open', () => {
            console.log('✅ Connected to local TradingView endpoint');
            
            // Send subscription message
            const subscribeMessage = {
                method: 'subscribe',
                params: {
                    symbols: ['NSE:RELIANCE', 'NSE:TCS', 'NSE:INFY']
                }
            };
            
            console.log('📡 Sending subscription:', subscribeMessage);
            ws.send(JSON.stringify(subscribeMessage));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('📨 Received message:', message);
            
            if (message.type === 'connected') {
                console.log('✅ Server confirmed connection');
            } else if (message.name === 'qsd') {
                console.log('💰 Received price data:', message);
            }
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            reject(error);
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 Connection closed: ${code} - ${reason}`);
            resolve();
        });
        
        // Keep connection open for 10 seconds
        setTimeout(() => {
            console.log('⏰ Test timeout reached, closing connection...');
            ws.close();
        }, 10000);
    });
}

// Run the test
testLocalTradingViewEndpoint()
    .then(() => {
        console.log('✅ Test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });