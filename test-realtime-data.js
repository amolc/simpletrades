#!/usr/bin/env node

/**
 * Test real-time quote data with tradingview-ws library
 * Tests if we can get live streaming data
 */

const { connect } = require('tradingview-ws');

async function testRealTimeData() {
  console.log('Testing real-time quote data with tradingview-ws...');
  
  try {
    // Connect to TradingView WebSocket
    console.log('\n=== Connecting to TradingView WebSocket ===');
    const connection = await connect();
    console.log('✓ WebSocket connection established');
    
    // Subscribe to real-time events
    console.log('\n=== Subscribing to real-time events ===');
    const unsubscribe = connection.subscribe((event) => {
      console.log('📊 Real-time event:', JSON.stringify(event, null, 2));
    });
    
    // Send quote subscription command
    console.log('\n=== Subscribing to BTCUSD real-time quotes ===');
    connection.send('quote_create_session', ['qs_123456789']);
    connection.send('quote_set_fields', ['qs_123456789', 'lp', 'ch', 'chp', 'bid', 'ask', 'volume']);
    connection.send('quote_add_symbols', ['qs_123456789', 'BINANCE:BTCUSD']);
    
    console.log('✓ Subscription commands sent');
    
    // Wait for data to arrive
    console.log('\n=== Waiting for real-time data (30 seconds) ===');
    
    let dataReceived = false;
    const timer = setTimeout(() => {
      if (!dataReceived) {
        console.log('⚠️  No real-time data received in 30 seconds');
      }
    }, 30000);
    
    // Keep the connection open for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    clearTimeout(timer);
    unsubscribe();
    await connection.close();
    
    console.log('\n✓ Test completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testRealTimeData().catch(console.error);