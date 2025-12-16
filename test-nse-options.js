const TradingViewWebSocket = require('./modules/websocket/tradingview-websocket').TradingViewWebSocket;

async function testNseOptions() {
  console.log('Testing NSE options subscription...');
  
  const ws = new TradingViewWebSocket();
  
  try {
    console.log('Connecting to WebSocket...');
    await ws.connect();
    console.log('WebSocket connected successfully');
    
    // Test NIFTY option (this should work with NSE exchange)
    console.log('Subscribing to NIFTY option (NSE)...');
    ws.subscribe('NIFTY', 'NSE', (data) => {
      console.log('Received NIFTY data:', data);
    });
    
    // Wait a bit to see if we get data
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('NSE options test completed');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    ws.disconnect();
  }
}

testNseOptions();