#!/usr/bin/env node

/**
 * Simple TradingView Adapter Feed Debugger
 * Tests with common, well-known symbols across different exchanges
 */

const { TvApiAdapter } = require('tradingview-api-adapter');

// Color codes for console output
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
  let color = colors.reset;
  let prefix = '';
  
  switch (level.toUpperCase()) {
    case 'INFO':
      color = colors.blue;
      prefix = 'ℹ️';
      break;
    case 'SUCCESS':
      color = colors.green;
      prefix = '✅';
      break;
    case 'WARNING':
      color = colors.yellow;
      prefix = '⚠️';
      break;
    case 'ERROR':
      color = colors.red;
      prefix = '❌';
      break;
    case 'DATA':
      color = colors.cyan;
      prefix = '📊';
      break;
    default:
      prefix = '📝';
  }
  
  console.log(`${color}[${timestamp}] ${prefix} ${level}: ${message}${colors.reset}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

class SimpleFeedDebugger {
  constructor() {
    this.tvAdapter = null;
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
    }
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

  generateReport() {
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
        this.channel.pause();
        this.channel = null;
        log('SUCCESS', 'Disconnected successfully');
      } catch (error) {
        log('ERROR', 'Error disconnecting:', error);
      }
    }
  }

  async run() {
    log('INFO', 'Starting Simple TradingView Adapter Feed Debugger...');
    
    // Test with simple, common symbols
    const simpleSymbols = [
      // Major cryptocurrencies
      { symbol: "BTCUSD", exchange: "COINBASE" },
      { symbol: "ETHUSD", exchange: "BINANCE" },
      
      // Major forex pairs
      { symbol: "EURUSD", exchange: "OANDA" },
      { symbol: "GBPUSD", exchange: "OANDA" },
      
      // Major commodities
      { symbol: "XAUUSD", exchange: "OANDA" }, // Gold
      { symbol: "USOIL", exchange: "TVC" }, // Oil
      
      // Major indices (try different exchanges)
      { symbol: "SPX", exchange: "SP" },
      { symbol: "DJI", exchange: "DJ" },
      { symbol: "NASDAQ", exchange: "NASDAQ" },
      
      // Try some European exchanges
      { symbol: "DAX", exchange: "XETR" },
      { symbol: "FTSE", exchange: "FTSE" }
    ];
    
    // Connect to TradingView API
    const connected = await this.connect();
    if (!connected) {
      log('ERROR', 'Failed to connect to TradingView API');
      return;
    }
    
    // Subscribe to symbols
    log('INFO', '=== SUBSCRIBING TO SIMPLE SYMBOLS ===');
    this.subscriptionStats.total = simpleSymbols.length;
    await this.subscribeToSymbols(simpleSymbols);
    
    // Wait for data
    log('INFO', '=== WAITING FOR DATA (30 seconds) ===');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Generate reports
    this.generateReport();
    this.getDataReport();
    
    // Disconnect
    await this.disconnect();
    
    log('SUCCESS', 'Simple debug session completed');
    
    return {
      totalSubscribed: this.subscribedSymbols.size,
      totalReceived: this.receivedData.size,
      subscriptionStats: this.subscriptionStats,
      activeSubscriptions: Array.from(this.subscribedSymbols.keys()),
      symbolsWithData: Array.from(this.receivedData.keys())
    };
  }
}

// Run the debugger
if (require.main === module) {
  const feedDebugger = new SimpleFeedDebugger();
  feedDebugger.run().catch(error => {
    log('ERROR', 'Debugger failed:', error);
    process.exit(1);
  });
}

module.exports = SimpleFeedDebugger;