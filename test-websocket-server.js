// Simple test to verify WebSocket fallback is working
// This creates a minimal HTML page to test the WebSocketManager

const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple HTML test page
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Fallback Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .log { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .error { color: red; }
        .success { color: green; }
        .info { color: blue; }
    </style>
</head>
<body>
    <h1>WebSocket Fallback Test</h1>
    <div id="status">Connecting...</div>
    <div id="logs"></div>
    
    <script>
        // Add logging function
        function log(message, type = 'info') {
            const logs = document.getElementById('logs');
            const div = document.createElement('div');
            div.className = 'log ' + type;
            div.textContent = new Date().toLocaleTimeString() + ' - ' + message;
            logs.appendChild(div);
            console.log(message);
        }
        
        // Test the WebSocketManager
        async function testWebSocket() {
            try {
                log('Initializing WebSocketManager...', 'info');
                
                // Wait for WebSocketManager to be available
                if (typeof window.wsManager === 'undefined') {
                    log('WebSocketManager not found, waiting...', 'error');
                    setTimeout(testWebSocket, 1000);
                    return;
                }
                
                // Add price update callback
                window.wsManager.on('price_update', (data) => {
                    log('Price update: ' + JSON.stringify(data), 'success');
                });
                
                // Test connection
                log('Attempting connection...', 'info');
                await window.wsManager.connect();
                log('✅ Connection successful!', 'success');
                
                // Test subscription
                const symbols = [
                    { symbol: 'BTCUSDT', exchange: 'BINANCE' },
                    { symbol: 'RELIANCE', exchange: 'NSE' }
                ];
                
                log('Subscribing to symbols: ' + JSON.stringify(symbols), 'info');
                window.wsManager.subscribe(symbols);
                log('✅ Subscription sent!', 'success');
                
                // Update status
                document.getElementById('status').innerHTML = 
                    '<span class="success">✅ Connected and subscribed!</span>';
                
                // Keep connection alive for testing
                setTimeout(() => {
                    log('Test completed - disconnecting...', 'info');
                    window.wsManager.disconnect();
                    log('✅ Disconnected!', 'info');
                }, 30000);
                
            } catch (error) {
                log('❌ Test failed: ' + error.message, 'error');
                document.getElementById('status').innerHTML = 
                    '<span class="error">❌ Connection failed: ' + error.message + '</span>';
            }
        }
        
        // Start test when page loads
        window.addEventListener('load', testWebSocket);
    </script>
    
    <!-- Load the WebSocketManager -->
    <script src="/assets/js/websocketManager.js"></script>
</body>
</html>
`;

// Create HTTP server
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    } else if (req.url === '/assets/js/websocketManager.js') {
        // Read the WebSocketManager file
        const filePath = path.join(__dirname, 'assets', 'js', 'websocketManager.js');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('WebSocketManager not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log('🚀 WebSocket fallback test server running at http://localhost:' + PORT);
    console.log('Open the URL in your browser to test the WebSocket fallback functionality');
});