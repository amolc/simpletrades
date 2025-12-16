const { TradingViewWebSocket } = require('./modules/websocket/tradingview-websocket');

async function testTcsSubscription() {
  console.log('Testing TCS subscription...');
  
  const ws = new TradingViewWebSocket();
  
  try {
    console.log('Connecting to WebSocket...');
    await ws.connect();
    console.log('WebSocket connected successfully');
    
    // Test TCS subscription
    console.log('Subscribing to TCS (NSE_DLY)...');
    ws.subscribe('TCS', 'NSE_DLY', (data) => {
      console.log('Received TCS data:', data);
    });
    
    // Test with NSE exchange for comparison
    setTimeout(() => {
      console.log('Subscribing to TCS with NSE exchange...');
      ws.subscribe('TCS', 'NSE', (data) => {
        console.log('Received TCS (NSE) data:', data);
      });
    }, 5000);
    
    // Test HINDZINC for comparison (working symbol)
    setTimeout(() => {
      console.log('Subscribing to HINDZINC (NSE_DLY)...');
      ws.subscribe('HINDZINC', 'NSE_DLY', (data) => {
        console.log('Received HINDZINC data:', data);
      });
    }, 10000);
    
    // Test HINDZINC with NSE
    setTimeout(() => {
      console.log('Subscribing to HINDZINC (NSE)...');
      ws.subscribe('HINDZINC', 'NSE', (data) => {
        console.log('Received HINDZINC (NSE) data:', data);
      });
    }, 15000);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run for 30 seconds then exit
setTimeout(() => {
  console.log('Test completed');
  process.exit(0);
}, 30000);

testTcsSubscription();