// Connect to data.simpleincome.co WebSocket and subscribe to all symbols
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing direct WebSocket connection to data.simpleincome.co');
    
    // Get all symbols from the page
    const symbolsToSubscribe = [];
    
    // Collect symbols from signals table
    const signalRows = document.querySelectorAll('#signalsBody tr');
    signalRows.forEach(row => {
        const symbolCell = row.querySelector('td:nth-child(2)');
        const exchangeCell = row.querySelector('td:nth-child(3)');
        
        if (symbolCell && exchangeCell) {
            const symbol = symbolCell.textContent.trim();
            const exchange = exchangeCell.textContent.trim() || 'NSE';
            if (symbol) {
                symbolsToSubscribe.push({ symbol, exchange });
            }
        }
    });
    
    // Collect symbols from watchlist table
    const watchlistRows = document.querySelectorAll('#watchlistBody tr');
    watchlistRows.forEach(row => {
        const symbolCell = row.querySelector('td:first-child');
        const exchangeCell = row.querySelector('td:nth-child(3)');
        
        if (symbolCell && exchangeCell) {
            const symbol = symbolCell.textContent.trim();
            const exchange = exchangeCell.textContent.trim() || 'NSE';
            if (symbol) {
                symbolsToSubscribe.push({ symbol, exchange });
            }
        }
    });
    
    // Remove duplicates
    const uniqueSymbols = symbolsToSubscribe.filter((item, index, self) =>
        index === self.findIndex((t) => (
            t.symbol === item.symbol && t.exchange === item.exchange
        ))
    );
    
    console.log('📊 Found symbols to subscribe:', uniqueSymbols);
    
    // Connect to WebSocket and subscribe to all symbols
    if (uniqueSymbols.length > 0) {
        // Initialize WebSocket manager
        window.wsManager.connect().then(() => {
            console.log('✅ Connected to data.simpleincome.co WebSocket');
            
            // Subscribe to all symbols
            const subscribedSymbols = window.wsManager.subscribe(uniqueSymbols);
            console.log('📈 Subscribed to symbols:', subscribedSymbols);
            
            // Set up price update handlers for each symbol
            uniqueSymbols.forEach(symbolData => {
                const seriesKey = `${symbolData.exchange}:${symbolData.symbol}`;
                
                // Update live price in signals table
                window.wsManager.on(`price:${seriesKey}`, function(data) {
                    console.log(`💰 Price update for ${seriesKey}: ${data.price}`);
                    
                    // Update live price in signals table
                    const signalRows = document.querySelectorAll('#signalsBody tr');
                    signalRows.forEach(row => {
                        const symbolCell = row.querySelector('td:nth-child(2)');
                        const exchangeCell = row.querySelector('td:nth-child(3)');
                        const priceCell = row.querySelector('td:nth-child(4)');
                        
                        if (symbolCell && exchangeCell && priceCell) {
                            const rowSymbol = symbolCell.textContent.trim();
                            const rowExchange = exchangeCell.textContent.trim() || 'NSE';
                            
                            if (rowSymbol === symbolData.symbol && rowExchange === symbolData.exchange) {
                                priceCell.innerHTML = `Rs <span class="text-primary fw-bold">${data.price.toFixed(2)}</span>`;
                                priceCell.classList.add('price-updated');
                                setTimeout(() => priceCell.classList.remove('price-updated'), 1000);
                            }
                        }
                    });
                    
                    // Update live price in watchlist table
                    const watchlistRows = document.querySelectorAll('#watchlistBody tr');
                    watchlistRows.forEach(row => {
                        const symbolCell = row.querySelector('td:first-child');
                        const exchangeCell = row.querySelector('td:nth-child(3)');
                        const priceCell = row.querySelector('td:nth-child(2)');
                        
                        if (symbolCell && exchangeCell && priceCell) {
                            const rowSymbol = symbolCell.textContent.trim();
                            const rowExchange = exchangeCell.textContent.trim() || 'NSE';
                            
                            if (rowSymbol === symbolData.symbol && rowExchange === symbolData.exchange) {
                                priceCell.innerHTML = `Rs <span class="text-primary fw-bold">${data.price.toFixed(2)}</span>`;
                                priceCell.classList.add('price-updated');
                                setTimeout(() => priceCell.classList.remove('price-updated'), 1000);
                            }
                        }
                    });
                });
            });
            
            // Handle connection errors
            window.wsManager.on('error', function(error) {
                console.error('WebSocket error:', error);
            });
            
            // Handle disconnection
            window.wsManager.on('disconnect', function() {
                console.log('WebSocket disconnected');
            });
            
        }).catch(error => {
            console.error('❌ Failed to connect to WebSocket:', error);
        });
    } else {
        console.log('No symbols found to subscribe to');
    }
});