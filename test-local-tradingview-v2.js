const WebSocket = require('ws');

async function testLocalTradingViewEndpoint() {
    console.log('🚀 Testing local TradingView WebSocket endpoint...');
    
    return new Promise((resolve, reject) => {
        // Try connecting without the 'ws://' prefix first
        const ws = new WebSocket('ws://localhost:3000/ws/tradingview', {
            headers: {
                'User-Agent': 'StockAgent-Test-Client/1.0'
            }
        });
        
        ws.on('open', () => {
            console.log('✅ Connected to local TradingView endpoint');
            
            // Send subscription message
            const subscribeMessage = {
                method: 'subscribe',
                params: {
                    symbols: ['NSE:RELIANCE', 'NSE:TCS', 'NSE:INFY']
                }
            };
            
            console.log('📡 Sending subscription:', JSON.stringify(subscribeMessage, null, 2));
            ws.send(JSON.stringify(subscribeMessage));
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received message:', JSON.stringify(message, null, 2));
                
                if (message.type === 'connected') {
                    console.log('✅ Server confirmed connection');
                } else if (message.name === 'qsd') {
                    console.log('💰 Received price data:', message);
                }
            } catch (error) {
                console.log('📨 Received raw message:', data.toString());
            }
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            console.error('Error details:', error);
            reject(error);
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 Connection closed: ${code} - ${reason.toString()}`);
            resolve();
        });
        
        // Keep connection open for 15 seconds
        setTimeout(() => {
            console.log('⏰ Test timeout reached, closing connection...');
            ws.close();
        }, 15000);
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