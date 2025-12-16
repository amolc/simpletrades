const { TradingViewWebSocket } = require('./modules/websocket/tradingview-websocket');

async function testTcsWithNse() {
  console.log('Testing TCS with NSE exchange...');
  
  const ws = new TradingViewWebSocket();
  
  try {
    console.log('Connecting to WebSocket...');
    await ws.connect();
    console.log('WebSocket connected successfully');
    
    // Test TCS with NSE exchange directly
    console.log('Subscribing to TCS with NSE exchange...');
    ws.subscribe('TCS', 'NSE', (data) => {
      console.log('Received TCS data:', data);
    });
    
    // Wait a bit to see if we get data
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('TCS with NSE test completed');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    ws.disconnect();
  }
}

testTcsWithNse();