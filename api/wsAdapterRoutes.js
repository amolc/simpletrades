const express = require('express');
const router = express.Router();
const tvWsAdapter = require('./tvWsAdapterController');

// Global state for WebSocket feed
let wsCleanup = null;
let isWsFeedActive = false;
let wsFeedData = [];

// Start WebSocket adapter feed
router.post('/ws/start', async (req, res) => {
  try {
    console.log('Starting WebSocket adapter feed...');
    
    // Stop existing feed if active
    if (isWsFeedActive && wsCleanup) {
      console.log('Stopping existing WebSocket feed...');
      wsCleanup();
      wsCleanup = null;
      isWsFeedActive = false;
      wsFeedData = [];
    }

    // Extract session ID from cookies if available
    const sessionId = req.cookies ? (req.cookies.tv_session || req.cookies.sessionid || null) : null;
    if (sessionId) {
      console.log('Using session ID from cookies for authentication');
    }

    // Build symbols list
    const symbols = await tvWsAdapter.buildSymbolsList(req);
    
    if (symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No symbols to subscribe to'
      });
    }

    console.log(`Starting WebSocket feed for ${symbols.length} symbols...`);

    // Data callback function
    const onDataReceived = (data) => {
      // Update or add to feed data
      const existingIndex = wsFeedData.findIndex(item => item.symbol === data.symbol);
      if (existingIndex >= 0) {
        wsFeedData[existingIndex] = data;
      } else {
        wsFeedData.push(data);
      }
    };

    // Start WebSocket feed with session ID
    wsCleanup = await tvWsAdapter.startWebSocketFeed(symbols, onDataReceived, sessionId);
    isWsFeedActive = true;

    // Wait a bit for initial data
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = {
      success: true,
      message: `Started WebSocket feed for ${symbols.length} symbols`,
      symbols: symbols.map(s => `${s.exchange}:${s.symbol}`),
      symbolCount: symbols.length,
      data: wsFeedData
    };

    console.log('✓ WebSocket feed started successfully');
    res.json(response);

  } catch (error) {
    console.error('❌ Error starting WebSocket feed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to start WebSocket feed',
      error: error.message
    });
  }
});

// Stop WebSocket adapter feed
router.post('/ws/stop', async (req, res) => {
  try {
    console.log('Stopping WebSocket adapter feed...');
    
    if (isWsFeedActive && wsCleanup) {
      wsCleanup();
      wsCleanup = null;
      isWsFeedActive = false;
      wsFeedData = [];
      
      await tvWsAdapter.stopWebSocketFeed();
      
      console.log('✓ WebSocket feed stopped successfully');
      res.json({
        success: true,
        message: 'WebSocket feed stopped'
      });
    } else {
      res.json({
        success: true,
        message: 'WebSocket feed was not active'
      });
    }
    
  } catch (error) {
    console.error('❌ Error stopping WebSocket feed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to stop WebSocket feed',
      error: error.message
    });
  }
});

// Get current WebSocket feed data
router.get('/ws/data', (req, res) => {
  try {
    res.json({
      success: true,
      isActive: isWsFeedActive,
      dataCount: wsFeedData.length,
      data: wsFeedData,
      lastUpdate: wsFeedData.length > 0 ? Math.max(...wsFeedData.map(d => d.timestamp)) : null
    });
  } catch (error) {
    console.error('❌ Error getting WebSocket data:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get WebSocket data',
      error: error.message
    });
  }
});

// Get WebSocket connection status
router.get('/ws/status', (req, res) => {
  try {
    res.json({
      success: true,
      isActive: isWsFeedActive,
      dataCount: wsFeedData.length,
      symbols: wsFeedData.map(d => d.symbol)
    });
  } catch (error) {
    console.error('❌ Error getting WebSocket status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get WebSocket status',
      error: error.message
    });
  }
});

module.exports = router;