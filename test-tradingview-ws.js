#!/usr/bin/env node

/**
 * Test script for tradingview-ws library
 * Tests if we can get real-time data with proper authentication
 */

const { connect, getCandles } = require('tradingview-ws');

async function testTradingViewWS() {
  console.log('Testing tradingview-ws library...');
  
  try {
    // First test without session ID (anonymous access)
    console.log('\n=== Test 1: Anonymous connection ===');
    const connection = await connect();
    console.log('✓ Anonymous connection established');
    
    // Test getting candles for BTCUSD
    console.log('\n=== Test 2: Getting BTCUSD candles ===');
    const candles = await getCandles({
      connection,
      symbols: ['BINANCE:BTCUSD'],
      amount: 10,
      timeframe: 60
    });
    
    console.log('✓ Candles received:', candles[0] ? `${candles[0].length} candles` : 'No data');
    if (candles[0] && candles[0].length > 0) {
      console.log('Sample candle:', candles[0][0]);
    }
    
    await connection.close();
    console.log('✓ Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If anonymous access fails, we need to investigate how to get session ID
    console.log('\n=== Investigation needed ===');
    console.log('We need to find out how to get TradingView session ID for authentication.');
    console.log('This might require:');
    console.log('1. Logging into TradingView web interface');
    console.log('2. Extracting sessionid cookie from browser');
    console.log('3. Using that session ID with the library');
  }
}

// Run the test
testTradingViewWS().catch(console.error);