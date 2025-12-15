#!/usr/bin/env node

/**
 * TradingView Adapter Feed Debugger
 * Console script to debug what's being subscribed and what data is received
 */

const { TvApiAdapter } = require('tradingview-api-adapter');

// Console colors for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const levelColors = {
    INFO: colors.cyan,
    SUCCESS: colors.green,
    ERROR: colors.red,
    WARNING: colors.yellow,
    DATA: colors.magenta
  };
  
  console.log(`${colors.bright}[${timestamp}] ${levelColors[level] || colors.reset}${level}${colors.reset}: ${message}`);
  if (data) {
    console.log(`${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
}

// Current watchlist from your database - FIXED VERSION
const watchlist = [
  { symbol: "BTCUSD", exchange: "COINBASE" },
  // Clean up malformed NSE option symbols - use simple indices instead
  { symbol: "NIFTY", exchange: "nse_dly" }, // Simplified NIFTY instead of complex options
  { symbol: "BANKNIFTY", exchange: "nse_dly" }, // Alternative index
  { symbol: "CRUDEOIL251216C5200", exchange: "MCX" },
  { symbol: "USOIL", exchange: "TVC" },
  // Clean up SBIN option - try simple stock first
  { symbol: "SBIN", exchange: "nse_dly" },
  { symbol: "XAUUSD", exchange: "OANDA" },
  { symbol: "ETHUSD", exchange: "BINANCE" },
  // Clean up INFY - try simple stock
  { symbol: "INFY", exchange: "nse_dly" },
  // Add some working NSE stocks
  { symbol: "RELIANCE", exchange: "nse_dly" },
  { symbol: "TCS", exchange: "nse_dly" },
  { symbol: "HDFC", exchange: "nse_dly" },
  { symbol: "ITC", exchange: "nse_dly" }
];

// Extra symbols to test - FIXED VERSION
const extraSymbols = [
  // Test with clean, simple symbols and correct exchange codes
  { symbol: "NIFTY", exchange: "nse_dly" },
  { symbol: "BANKNIFTY", exchange: "nse_dly" },
  { symbol: "RELIANCE", exchange: "nse_dly" },
  { symbol: "TCS", exchange: "nse_dly" }
];

class AdapterFeedDebugger {
  constructor() {
    this.channel = null;
    this.subscribedSymbols = new Map();
    this.receivedData = new Map();
    this.subscriptionStats = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  normalizeSymbol(symbol, exchange) {
    // MCX symbol normalization
    if (exchange?.toUpperCase() === 'MCX' && !symbol.includes('MCX:')) {
      return `MCX:${symbol}`;
    }
    // Handle other exchanges
    if (!symbol.includes(':')) {
      return `${exchange?.toUpperCase()}:${symbol}`;
    }
    return symbol;
  }

  async connect() {
    log('INFO', 'Connecting to TradingView API...');
    
    try {
      this.tvAdapter = new TvApiAdapter();
      log('SUCCESS', 'TradingView API adapter initialized successfully');
      return true;
    } catch (error) {
      log('ERROR', 'Failed to initialize TradingView API adapter:', error);
      return false;
    }
  }

  handleData(data) {
    const timestamp = Date.now();
    
    // Handle error messages from TradingView API
    if (data && data.s === 'permission_denied') {
      log('ERROR', `Permission denied for ${data.n}: ${data.errmsg}`, {
        symbol: data.n,
        status: data.s,
        message: data.errmsg,
        alternative: data.v?.alternative
      });
      return;
    }
    
    if (data && data.s === 'no_such_symbol') {
      log('ERROR', `No such symbol: ${data.n}`, {
        symbol: data.n,
        status: data.s
      });
      return;
    }
    
    // Handle the data format from TradingView API
    if (data && data.symbol && data.exchange) {
      const key = `${data.exchange}:${data.symbol}`;
      this.receivedData.set(key, {
        ...data,
        timestamp,
        receivedAt: new Date().toISOString()
      });
      
      log('DATA', `Received data for ${key}`, {
        price: data.lp || data.price,
        ask: data.ask,
        bid: data.bid,
        change: data.ch || data.change,
        changePercent: data.chp || data.changePercent,
        volume: data.volume
      });
    } else if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.symbol && item.exchange) {
          const key = `${item.exchange}:${item.symbol}`;
          this.receivedData.set(key, {
            ...item,
            timestamp,
            receivedAt: new Date().toISOString()
          });
          
          log('DATA', `Received data for ${key}`, {
            price: item.lp || item.price,
            ask: item.ask,
            bid: item.bid,
            change: item.ch || item.change,
            changePercent: item.chp || item.changePercent,
            volume: item.volume
          });
        }
      });
    }
  }

  async subscribeToSymbols(symbols) {
    log('INFO', `Creating QuoteChannel for ${symbols.length} symbols...`);
    
    try {
      // Create pair groups in the expected format: { exchange: [symbol1, symbol2, ...] }
      const pairGroups = {};
      for (const symbolData of symbols) {
        const exchange = symbolData.exchange.toUpperCase();
        if (!pairGroups[exchange]) {
          pairGroups[exchange] = [];
        }
        pairGroups[exchange].push(symbolData.symbol);
      }
      
      log('INFO', 'Pair groups created:', pairGroups);
      
      // Default fields to subscribe to
      const fields = ['lp', 'ask', 'bid', 'ch', 'chp', 'trade', 'minute-bar', 'daily-bar', 'prev-daily-bar'];
      
      this.channel = this.tvAdapter.QuoteChannel(pairGroups, fields);
      
      // Set up data listener
      this.channel.listen((data) => {
        this.handleData(data);
      });
      
      // Mark all symbols as subscribed
      symbols.forEach(symbolData => {
        const normalizedSymbol = `${symbolData.exchange.toUpperCase()}:${symbolData.symbol}`;
        this.subscribedSymbols.set(normalizedSymbol, {
          symbol: normalizedSymbol,
          originalSymbol: symbolData.symbol,
          exchange: symbolData.exchange,
          subscribedAt: new Date().toISOString(),
          status: 'subscribed'
        });
      });
      
      this.subscriptionStats.successful += symbols.length;
      log('SUCCESS', `Successfully created QuoteChannel for ${symbols.length} symbols`);
      
      return { success: true, symbols: symbols.length };
      
    } catch (error) {
      this.subscriptionStats.failed += symbols.length;
      const errorInfo = {
        symbols: symbols.length,
        error: error.message,
        errorType: error.constructor.name
      };
      
      this.subscriptionStats.errors.push(errorInfo);
      log('ERROR', `Failed to create QuoteChannel: ${error.message}`, errorInfo);
      
      return { success: false, error: error.message };
    }
  }

  async subscribeToWatchlist() {
    log('INFO', `Starting subscription to ${watchlist.length} watchlist symbols...`);
    return await this.subscribeToSymbols(watchlist);
  }

  async subscribeToExtraSymbols() {
    log('INFO', `Starting subscription to ${extraSymbols.length} extra symbols...`);
    return await this.subscribeToSymbols(extraSymbols);
  }

  getSubscriptionReport() {
    const totalSubscribed = this.subscribedSymbols.size;
    const totalReceived = this.receivedData.size;
    
    log('INFO', '=== SUBSCRIPTION REPORT ===');
    log('INFO', `Total symbols attempted: ${this.subscriptionStats.total}`);
    log('INFO', `Successfully subscribed: ${this.subscriptionStats.successful}`);
    log('INFO', `Failed subscriptions: ${this.subscriptionStats.failed}`);
    log('INFO', `Total active subscriptions: ${totalSubscribed}`);
    log('INFO', `Symbols with data received: ${totalReceived}`);
    
    if (this.subscriptionStats.errors.length > 0) {
      log('WARNING', 'Failed subscriptions:');
      this.subscriptionStats.errors.forEach(error => {
        console.log(`  - ${error.symbol}: ${error.error}`);
      });
    }
    
    log('INFO', 'Active subscriptions:');
    this.subscribedSymbols.forEach((info, symbol) => {
      const hasData = this.receivedData.has(symbol);
      const dataStatus = hasData ? '✅ Data received' : '⏳ Waiting for data';
      console.log(`  - ${symbol} (${info.exchange}): ${dataStatus}`);
    });
    
    return {
      totalSubscribed,
      totalReceived,
      subscriptionStats: this.subscriptionStats,
      activeSubscriptions: Array.from(this.subscribedSymbols.keys()),
      symbolsWithData: Array.from(this.receivedData.keys())
    };
  }

  getDataReport() {
    log('INFO', '=== DATA RECEIVED REPORT ===');
    
    if (this.receivedData.size === 0) {
      log('WARNING', 'No data received yet');
      return;
    }
    
    this.receivedData.forEach((data, symbol) => {
      console.log(`\n${colors.bright}${symbol}${colors.reset}:`);
      console.log(`  Price: ${data.lp || data.price || 'N/A'}`);
      console.log(`  Ask: ${data.ask || 'N/A'}`);
      console.log(`  Bid: ${data.bid || 'N/A'}`);
      console.log(`  Change: ${data.ch || data.change || 'N/A'}`);
      console.log(`  Change %: ${data.chp || data.changePercent || 'N/A'}`);
      console.log(`  Volume: ${data.volume || 'N/A'}`);
      console.log(`  Last updated: ${data.receivedAt}`);
    });
  }

  async disconnect() {
    log('INFO', 'Disconnecting from TradingView API...');
    
    if (this.channel) {
      try {
        // Try to close the channel if it has a close method
        if (typeof this.channel.close === 'function') {
          this.channel.close();
        } else if (typeof this.channel.pause === 'function') {
          this.channel.pause();
        }
        log('SUCCESS', 'Disconnected successfully');
      } catch (error) {
        log('ERROR', 'Error during disconnect:', error);
      }
    }
  }

  async run() {
    log('INFO', 'Starting TradingView Adapter Feed Debugger...');
    
    // Connect to TradingView
    const connected = await this.connect();
    if (!connected) {
      log('ERROR', 'Failed to connect, exiting...');
      return;
    }
    
    // Subscribe to watchlist
    log('INFO', '=== PHASE 1: Watchlist Subscription ===');
    await this.subscribeToWatchlist();
    
    // Subscribe to extra symbols
    log('INFO', '=== PHASE 2: Extra Symbols Subscription ===');
    await this.subscribeToExtraSymbols();
    
    // Wait for data to come in
    log('INFO', '=== PHASE 3: Waiting for Data (30 seconds) ===');
    log('INFO', 'Monitoring for incoming data...');
    
    // Update total attempts
    this.subscriptionStats.total = watchlist.length + extraSymbols.length;
    
    // Wait and collect data
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Generate reports
    log('INFO', '=== PHASE 4: Final Reports ===');
    const report = this.getSubscriptionReport();
    this.getDataReport();
    
    // Disconnect
    await this.disconnect();
    
    log('SUCCESS', 'Debugger completed successfully!');
    return report;
  }
}

// Main execution
if (require.main === module) {
  const feedDebugger = new AdapterFeedDebugger();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    log('INFO', 'Received SIGINT, shutting down gracefully...');
    await feedDebugger.disconnect();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    log('INFO', 'Received SIGTERM, shutting down gracefully...');
    await feedDebugger.disconnect();
    process.exit(0);
  });
  
  // Run the debugger
  feedDebugger.run()
    .then(report => {
      log('SUCCESS', 'Debug session completed', report);
      process.exit(0);
    })
    .catch(error => {
      log('ERROR', 'Debug session failed:', error);
      process.exit(1);
    });
}

module.exports = { AdapterFeedDebugger };