// Test the TradingView WebSocket endpoint
const WebSocket = require('ws');

async function testTradingViewEndpoint() {
    console.log('🚀 Testing TradingView WebSocket endpoint...\n');
    
    const ws = new WebSocket('ws://localhost:3000/ws/tradingview');
    
    ws.on('open', () => {
        console.log('✅ Connected to TradingView WebSocket endpoint');
        
        // Subscribe to some test symbols
        const subscribeMessage = {
            method: 'subscribe',
            params: {
                symbols: ['NSE:RELIANCE', 'NSE:TCS', 'NSE:INFY']
            }
        };
        
        console.log('📡 Sending subscription message:', subscribeMessage);
        ws.send(JSON.stringify(subscribeMessage));
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📡 Received message:', message);
            
            if (message.name === 'qsd' && message.params) {
                const [sessionId, quoteData] = message.params;
                if (quoteData && quoteData.n && quoteData.v) {
                    console.log(`💰 Price update: ${quoteData.n} = ${quoteData.v.lp}`);
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });
    
    ws.on('close', (code, reason) => {
        console.log(`🔒 WebSocket closed: ${code} - ${reason}`);
    });
    
    // Keep the connection open for 10 seconds to receive some data
    setTimeout(() => {
        console.log('\n⏰ Test completed, closing connection...');
        ws.close();
    }, 10000);
}

// Run the test
testTradingViewEndpoint();