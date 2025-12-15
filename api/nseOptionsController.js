const nseOptionsService = require('./nseOptionsService');

class NSEOptionsController {
  async getPrice(req, res) {
    try {
      const { symbol, debug } = req.query;
      
      if (!symbol) {
        return res.status(400).json({ 
          success: false, 
          error: 'Symbol parameter is required' 
        });
      }

      const debugMode = debug === 'true';
      
      if (debugMode) {
        console.log(`[NSEOptions] Getting price for symbol: ${symbol}`);
      }

      // Check if it's already cached
      const cachedPrice = nseOptionsService.getPrice(symbol);
      if (cachedPrice && cachedPrice.price > 0) {
        if (debugMode) {
          console.log(`[NSEOptions] Returning cached price: ${cachedPrice.price}`);
        }
        
        return res.json({
          success: true,
          symbol: symbol,
          price: cachedPrice.price,
          bid: cachedPrice.bid,
          ask: cachedPrice.ask,
          change: cachedPrice.change,
          changePercent: cachedPrice.changePercent,
          volume: cachedPrice.volume,
          timestamp: cachedPrice.timestamp,
          source: 'nse-options-service',
          cached: true
        });
      }

      // Subscribe and get fresh price
      if (debugMode) {
        console.log(`[NSEOptions] Subscribing to get fresh price`);
      }

      const priceData = await nseOptionsService.subscribe(symbol);
      
      if (priceData.error === 'timeout') {
        return res.status(504).json({
          success: false,
          error: 'Price request timed out',
          symbol: symbol
        });
      }

      if (!priceData || priceData.price === 0) {
        return res.status(404).json({
          success: false,
          error: 'Price not available',
          symbol: symbol
        });
      }

      if (debugMode) {
        console.log(`[NSEOptions] Returning fresh price: ${priceData.price}`);
      }

      return res.json({
        success: true,
        symbol: symbol,
        price: priceData.price,
        bid: priceData.bid,
        ask: priceData.ask,
        change: priceData.change,
        changePercent: priceData.changePercent,
        volume: priceData.volume,
        timestamp: priceData.timestamp,
        source: 'nse-options-service',
        cached: false
      });

    } catch (error) {
      console.error('[NSEOptions] Error getting price:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = new NSEOptionsController();