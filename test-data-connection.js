// Test WebSocket connection to data.simpleincome.co
const WebSocket = require('ws');

console.log('Testing WebSocket connection to data.simpleincome.co...');

const ws = new WebSocket('wss://data.simpleincome.co/ws/stream/');

ws.on('open', function open() {
    console.log('✅ WebSocket connection opened successfully!');
    
    // Test subscription
    const subscribeMessage = {
        action: 'subscribe',
        client_id: 'test_client_' + Date.now(),
        symbols: ['NSE:RELIANCE', 'NSE:TCS']
    };
    
    console.log('Sending subscription:', subscribeMessage);
    ws.send(JSON.stringify(subscribeMessage));
});

ws.on('message', function message(data) {
    console.log('📨 Received message:', data.toString());
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err.message);
    console.error('Error details:', err);
});

ws.on('close', function close(code, reason) {
    console.log(`🔒 WebSocket closed. Code: ${code}, Reason: ${reason}`);
});

// Keep the script running for 10 seconds
setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
    process.exit(0);
}, 10000);