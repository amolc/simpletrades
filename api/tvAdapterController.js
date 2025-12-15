const { TvApiAdapter } = require('tradingview-api-adapter');
const db = require('../models');

// Global adapter instance
let tvAdapter = null;

// Singleton subscription channel and cache
let adapterChannel = null;
let adapterFeedCache = new Map();
let isChannelActive = false;

// Initialize TradingView adapter
function initializeTvAdapter() {
  try {
    tvAdapter = new TvApiAdapter();
    console.log('TradingView API adapter initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize TradingView API adapter:', error.message);
    return false;
  }
}

// Get quote using the new adapter
async function getQuoteWithAdapter(symbol, exchange, fields = ['lp', 'ask', 'bid', 'ch', 'chp', 'trade', 'minute-bar', 'daily-bar', 'prev-daily-bar']) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!tvAdapter) {
        reject(new Error('TradingView adapter not initialized'));
        return;
      }

      let market = String(exchange || '').trim();
      let normalizedSymbol = String(symbol || '').trim();

      try {
        if (market.toUpperCase() === 'MCX') {
          const td = tvAdapter.TickerDetails(normalizedSymbol, market);
          const alt = await new Promise((res) => {
            let done = false;
            const t = setTimeout(() => { if (!done) res(null); }, 1500);
            td.ready((model) => {
              if (done) return;
              done = true;
              clearTimeout(t);
              let pref = null;
              const prefixes = (model && model.prefixes) || [];
              if (Array.isArray(prefixes) && prefixes.length) {
                pref = String(prefixes[0] || '').toLowerCase();
              }
              if (!pref && model && typeof model.feedTicker === 'string') {
                const ft = String(model.feedTicker);
                const p = ft.split(':')[0];
                if (p) pref = p.toLowerCase();
              }
              res(pref || null);
            });
          });
          if (alt && /mcx/.test(alt)) market = alt;
        }
      } catch (_) {}

      console.log(`Getting quote for ${market}:${normalizedSymbol} with fields:`, fields);

      const quote = tvAdapter.Quote(normalizedSymbol, market, fields);

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) reject(new Error('Quote request timeout'));
      }, 12000);

      quote.listen((data) => {
        if (resolved) return;
        const toNum = (v) => v === undefined || v === null ? null : parseFloat(String(v));
        let price = toNum(data && data.lp);
        if (price === null) {
          if (data && data.trade && data.trade.price !== undefined) price = toNum(data.trade.price);
          else if (data && data['minute-bar'] && data['minute-bar'].close !== undefined) price = toNum(data['minute-bar'].close);
          else if (data && data['daily-bar'] && data['daily-bar'].close !== undefined) price = toNum(data['daily-bar'].close);
          else if (data && data['prev-daily-bar'] && data['prev-daily-bar'].close !== undefined) price = toNum(data['prev-daily-bar'].close);
        }

        if (price !== null) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            success: true,
            symbol: normalizedSymbol,
            exchange: market,
            price,
            ask: data && data.ask !== undefined ? toNum(data.ask) : null,
            bid: data && data.bid !== undefined ? toNum(data.bid) : null,
            change: data && data.ch !== undefined ? toNum(data.ch) : null,
            changePercent: data && data.chp !== undefined ? toNum(data.chp) : null,
            source: 'tradingview-api-adapter'
          });
        }
      });

    } catch (error) {
      reject(error);
    }
  });
}

// Handle MCX symbol normalization
function normalizeMcxSymbol(symbol) {
  // Handle MCX futures (add 1! for continuous futures)
  if (!symbol.includes('!') && !symbol.match(/\d{6}/)) {
    return symbol + '1!';
  }
  
  // Handle MCX options (convert format)
  // CRUDEOIL251216C5200 -> CRUDEOIL16DEC255200CE
  const optionMatch = symbol.match(/^(\w+)(\d{2})(\d{2})(\d{2})([CP])(\d+)$/);
  if (optionMatch) {
    const [, baseSymbol, yy, mm, dd, optionType, strike] = optionMatch;
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthName = monthNames[parseInt(mm) - 1];
    const optionTypeFull = optionType === 'C' ? 'CE' : 'PE';
    return `${baseSymbol}${dd}${monthName}${yy}${strike}${optionTypeFull}`;
  }
  
  return symbol;
}

// Main quote function using the new adapter
async function getQuote(req, res) {
  try {
    if (req.app && req.app.locals && Date.now() < (req.app.locals.tvCooldownUntil || 0)) {
      return res.status(429).json({ success: false, error: 'tradingview_rate_limited' })
    }
    const { symbol, exchange = 'NSE' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }

    console.log(`Quote request: ${symbol} @ ${exchange}`);

    // Normalize symbol for MCX
    let normalizedSymbol = symbol;
    if (exchange.toUpperCase() === 'MCX') {
      normalizedSymbol = normalizeMcxSymbol(symbol);
      console.log(`Normalized MCX symbol: ${symbol} -> ${normalizedSymbol}`);
    }

    // Initialize adapter if not already done
    if (!tvAdapter) {
      const initialized = initializeTvAdapter();
      if (!initialized) {
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to initialize TradingView adapter' 
        });
      }
    }

    // Get quote using the adapter
    const quoteData = await getQuoteWithAdapter(normalizedSymbol, exchange.toUpperCase());
    
    return res.json(quoteData);
    
  } catch (error) {
    console.error('Quote error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Test function for multiple symbols
async function testMultipleQuotes() {
  const testSymbols = [
    { symbol: 'CRUDEOIL1!', exchange: 'MCX' },
    { symbol: 'BTCUSD', exchange: 'BINANCE' },
    { symbol: 'NIFTY', exchange: 'NSE' }
  ];

  console.log('Testing multiple quotes...');
  
  for (const test of testSymbols) {
    try {
      console.log(`\nTesting ${test.exchange}:${test.symbol}...`);
      const result = await getQuoteWithAdapter(test.symbol, test.exchange);
      console.log('Result:', result);
    } catch (error) {
      console.error(`Failed for ${test.exchange}:${test.symbol}:`, error.message);
    }
  }
}

// Singleton subscription manager functions
async function startAdapterFeed(req, res) {
  try {
    if (req.app && req.app.locals && Date.now() < (req.app.locals.tvCooldownUntil || 0)) {
      return res.status(429).json({ success: false, error: 'tradingview_rate_limited' });
    }

    // Initialize adapter if not already done
    if (!tvAdapter) {
      const initialized = initializeTvAdapter();
      if (!initialized) {
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to initialize TradingView adapter' 
        });
      }
    }

    // Stop existing channel if active
    if (adapterChannel && isChannelActive) {
      try {
        adapterChannel.pause();
        adapterChannel = null;
        isChannelActive = false;
        adapterFeedCache.clear();
      } catch (error) {
        console.warn('Error closing existing channel:', error.message);
      }
    }

    // Build symbol list from request body or watchlist
    let symbols = [];
    
    // If symbols are provided in request body, use them exclusively
    if (req.body.symbols && Array.isArray(req.body.symbols) && req.body.symbols.length > 0) {
      for (const symbolData of req.body.symbols) {
        if (symbolData.symbol && symbolData.exchange) {
          let { symbol, exchange } = symbolData;
          
          // Fix NSE exchange code
          if (exchange.toUpperCase() === 'NSE') {
            exchange = 'nse_dly';
          }
          
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
        
        // Fix NSE exchange code
        if (exchange.toUpperCase() === 'NSE') {
          exchange = 'nse_dly';
        }
        
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

    // Add optional extra symbols from request body (only if main symbols were provided)
    if (req.body.symbols && req.body.extraSymbols && Array.isArray(req.body.extraSymbols)) {
      for (const extra of req.body.extraSymbols) {
        if (extra.symbol && extra.exchange) {
          let { symbol, exchange } = extra;
          
          // Fix NSE exchange code
          if (exchange.toUpperCase() === 'NSE') {
            exchange = 'nse_dly';
          }
          
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
    }

    if (symbols.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No symbols to subscribe to' 
      });
    }

    console.log(`Starting adapter feed for ${symbols.length} symbols...`);

    // Create QuoteChannel for multiple symbols
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
      
      // Default fields to subscribe to
      const fields = ['lp', 'ask', 'bid', 'ch', 'chp', 'trade', 'minute-bar', 'daily-bar', 'prev-daily-bar'];
      
      adapterChannel = tvAdapter.QuoteChannel(pairGroups, fields);
      
      // Set up data listener
      adapterChannel.listen((data) => {
        if (data && data.symbol && data.exchange) {
          const key = `${data.exchange}:${data.symbol}`;
          adapterFeedCache.set(key, {
            ...data,
            timestamp: Date.now()
          });
          
          console.log(`Feed update: ${key} = ${data.lp || 'N/A'}`);
        }
      });

      isChannelActive = true;

      return res.json({
        success: true,
        message: `Started adapter feed for ${symbols.length} symbols`,
        symbols: symbols.map(s => `${s.exchange}:${s.symbol}`),
        symbolCount: symbols.length
      });

    } catch (error) {
      console.error('Failed to create QuoteChannel:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create QuoteChannel',
        details: error.message
      });
    }

  } catch (error) {
    console.error('Start adapter feed error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function stopAdapterFeed(req, res) {
  try {
    if (adapterChannel && isChannelActive) {
      try {
        // Pause the channel instead of closing it
        adapterChannel.pause();
        adapterChannel = null;
        isChannelActive = false;
        adapterFeedCache.clear();
        
        return res.json({
          success: true,
          message: 'Adapter feed stopped and cache cleared'
        });
      } catch (error) {
        console.error('Error stopping adapter feed:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to stop adapter feed',
          details: error.message
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'No active adapter feed to stop'
      });
    }
  } catch (error) {
    console.error('Stop adapter feed error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function getAdapterFeed(req, res) {
  try {
    const cacheData = Array.from(adapterFeedCache.entries()).map(([key, data]) => ({
      symbol: key,
      ...data
    }));

    return res.json({
      success: true,
      isActive: isChannelActive,
      symbolCount: adapterFeedCache.size,
      data: cacheData,
      cacheAge: cacheData.length > 0 ? Math.max(...cacheData.map(d => Date.now() - d.timestamp)) : null
    });

  } catch (error) {
    console.error('Get adapter feed error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  initializeTvAdapter,
  getQuoteWithAdapter,
  getQuote,
  testMultipleQuotes,
  normalizeMcxSymbol,
  startAdapterFeed,
  stopAdapterFeed,
  getAdapterFeed,
  tvAdapterController: {
    getQuote,
    startAdapterFeed,
    stopAdapterFeed,
    getAdapterFeed
  }
};
