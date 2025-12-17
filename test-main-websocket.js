// Test the main WebSocket endpoint
const WebSocket = require('ws');

async function testMainWebSocketEndpoint() {
    console.log('🚀 Testing main WebSocket endpoint...\n');
    
    const ws = new WebSocket('ws://localhost:3000/ws/stream');
    
    ws.on('open', () => {
        console.log('✅ Connected to main WebSocket endpoint');
        
        // Send a ping message
        const pingMessage = { type: 'ping' };
        console.log('📡 Sending ping message:', pingMessage);
        ws.send(JSON.stringify(pingMessage));
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📡 Received message:', message);
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
    
    // Keep the connection open for 5 seconds
    setTimeout(() => {
        console.log('\n⏰ Test completed, closing connection...');
        ws.close();
    }, 5000);
}

// Run the test
testMainWebSocketEndpoint();