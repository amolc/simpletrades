const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws/stream');

ws.on('open', () => {
  console.log('Connected');
  
  // Subscribe to a common stock
  const msg = {
    type: 'subscribe',
    symbols: [
      { symbol: 'BTCUSDT', exchange: 'BINANCE' }
    ]
  };
  
  console.log('Sending subscribe:', JSON.stringify(msg));
  ws.send(JSON.stringify(msg));
});

ws.on('message', (data) => {
  const str = data.toString();
  console.log('Received:', str);
  
  try {
    const json = JSON.parse(str);
    if (json.type === 'price_update') {
      console.log('Price Update:', json.data.symbol, json.data.lp || json.data.price);
    }
  } catch (e) {
    console.error('Parse error:', e);
  }
});

ws.on('error', (err) => {
  console.error('Error:', err);
});

ws.on('close', () => {
  console.log('Closed');
});

// Keep alive for 30 seconds
setTimeout(() => {
  console.log('Test finished');
  ws.close();
  process.exit(0);
}, 30000);
