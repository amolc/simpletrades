/**
 * TradingView WebSocket Adapter Controller
 * Uses the working tradingview-ws library instead of the broken tradingview-api-adapter
 */

const { connect } = require('tradingview-ws');
const db = require('../models');

// Global connection and state
let wsConnection = null;
let isConnectionActive = false;
let feedCache = new Map();
let activeSymbols = new Set();
let dataCallback = null;

// Initialize WebSocket connection with optional session authentication
async function initializeConnection(sessionId = null) {
  try {
    if (wsConnection && isConnectionActive) {
      console.log('WebSocket connection already active');
      return true;
    }

    console.log('Initializing TradingView WebSocket connection...');
    
    // Prepare connection options
    const connectionOptions = {};
    
    // Add session ID if provided (from cookies)
    if (sessionId) {
      connectionOptions.session = sessionId;
      console.log('Using session ID for authentication');
    }
    
    wsConnection = await connect(connectionOptions);
    isConnectionActive = true;
    
    console.log('✓ TradingView WebSocket connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to TradingView WebSocket:', error.message);
    isConnectionActive = false;
    return false;
  }
}

// Normalize MCX symbols
function normalizeMcxSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return symbol;
  
  // Remove any date/option suffixes and clean up the symbol
  const cleanSymbol = symbol.replace(/\d{6}[CP]\d+$/i, '');
  return cleanSymbol;
}



// Start WebSocket feed for symbols
async function startWebSocketFeed(symbols, callback, sessionId = null) {
  try {
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('No symbols provided');
    }

    // Initialize connection if needed
    const connected = await initializeConnection(sessionId);
    if (!connected) {
      throw new Error('Failed to establish WebSocket connection');
    }

    // Store callback for data updates
    dataCallback = callback;

    // Clear existing subscriptions
    activeSymbols.clear();

    // Subscribe to WebSocket events
    const unsubscribe = wsConnection.subscribe((event) => {
      handleWebSocketEvent(event, callback);
    });

    // Create quote session and subscribe to symbols
    const quoteSessionId = `qs_${Date.now()}`;
    
    // Send WebSocket commands
    wsConnection.send('quote_create_session', [quoteSessionId]);
    wsConnection.send('quote_set_fields', [quoteSessionId, 'lp', 'ch', 'chp', 'bid', 'ask', 'volume', 'high', 'low', 'open']);
    
    // Add symbols
    for (const symbolData of symbols) {
      const { symbol, exchange } = symbolData;
      const fullSymbol = `${exchange}:${symbol}`;
      
      console.log(`DEBUG: Original symbol: ${symbol}, exchange: ${exchange}, full symbol: ${fullSymbol}`);
      console.log(`Subscribing to: ${fullSymbol}`);
      wsConnection.send('quote_add_symbols', [quoteSessionId, fullSymbol]);
      activeSymbols.add(fullSymbol);
    }

    console.log(`✓ Started WebSocket feed for ${symbols.length} symbols`);
    
    // Return cleanup function
    return () => {
      unsubscribe();
      wsConnection.send('quote_delete_session', [quoteSessionId]);
      activeSymbols.clear();
    };
    
  } catch (error) {
    console.error('❌ Failed to start WebSocket feed:', error.message);
    throw error;
  }
}

// Handle WebSocket events
function handleWebSocketEvent(event, callback) {
  try {
    console.log('📡 WebSocket event received:', JSON.stringify(event));
    
    if (event.name === 'qsd' && event.params && event.params.length >= 2) {
      const [sessionId, data] = event.params;
      
      if (data && data.n && data.v) {
        const symbol = data.n;
        const values = data.v;
        
        // Only process data for our active symbols
        if (!activeSymbols.has(symbol)) {
          console.log(`⏭️ Skipping symbol ${symbol} - not in active symbols`);
          return;
        }
        
        // Create formatted data object
        const quoteData = {
          symbol: symbol,
          lastPrice: values.lp || null,
          bid: values.bid || null,
          ask: values.ask || null,
          change: values.ch || null,
          changePercent: values.chp || null,
          volume: values.volume || null,
          high: values.high || null,
          low: values.low || null,
          open: values.open || null,
          timestamp: Date.now()
        };
        
        // Cache the data
        feedCache.set(symbol, quoteData);
        
        // Send to callback
        if (callback) {
          callback(quoteData);
        }
        
        console.log(`📊 ${symbol}: Last ${values.lp} | Change ${values.ch} (${values.chp}%) | Bid ${values.bid} | Ask ${values.ask}`);
      } else {
        console.log('⚠️ Event data structure unexpected:', data);
      }
    } else {
      console.log('⚠️ Event name or params unexpected:', event.name, event.params);
    }
  } catch (error) {
    console.error('❌ Error handling WebSocket event:', error.message);
  }
}

// Get cached data
function getCachedData(symbol) {
  return feedCache.get(symbol);
}

// Get all cached data
function getAllCachedData() {
  return Array.from(feedCache.values());
}

// Stop WebSocket feed
async function stopWebSocketFeed() {
  try {
    if (wsConnection && isConnectionActive) {
      console.log('Stopping WebSocket feed...');
      
      // Clear cache and active symbols
      feedCache.clear();
      activeSymbols.clear();
      
      // Close connection
      await wsConnection.close();
      wsConnection = null;
      isConnectionActive = false;
      dataCallback = null;
      
      console.log('✓ WebSocket feed stopped');
    }
  } catch (error) {
    console.error('❌ Error stopping WebSocket feed:', error.message);
  }
}

// Build symbols list from request body or watchlist
async function buildSymbolsList(req) {
  let symbols = [];
  
  // If symbols are provided in request body, use them exclusively
  if (req.body.symbols && Array.isArray(req.body.symbols) && req.body.symbols.length > 0) {
    for (const symbolData of req.body.symbols) {
      if (symbolData.symbol && symbolData.exchange) {
        let { symbol, exchange } = symbolData;
        
        // Keep NSE exchange code as is (not NSE_DLY)
        // if (exchange.toUpperCase() === 'NSE') {
        //   exchange = 'NSE_DLY';
        // }
        
        // Keep NSE symbols as-is (including options) - TradingView expects original format
        // No normalization needed for NSE symbols
        
        // Normalize MCX symbols
        if (exchange.toUpperCase() === 'MCX') {
          symbol = normalizeMcxSymbol(symbol);
        }
        
        symbols.push({
          symbol: symbol,
          exchange: exchange.toUpperCase()
        });
      }
    }
  } else {
    // Fall back to watchlist if no symbols provided
    const watchlistRows = await db.Watchlist.findAll();
    
    for (const row of watchlistRows) {
      let exchange = row.exchange || 'NSE';
      let symbol = row.stockName;
      
      // Keep NSE exchange code as is (not NSE_DLY)
      // if (exchange.toUpperCase() === 'NSE') {
      //   exchange = 'NSE_DLY';
      // }
      
      // Normalize MCX symbols
      if (exchange.toUpperCase() === 'MCX') {
        symbol = normalizeMcxSymbol(symbol);
      }
      
      symbols.push({
        symbol: symbol,
        exchange: exchange.toUpperCase(),
        watchlistId: row.id
      });
    }
  }
  
  return symbols;
}

module.exports = {
  initializeConnection,
  startWebSocketFeed,
  stopWebSocketFeed,
  getCachedData,
  getAllCachedData,
  buildSymbolsList
};