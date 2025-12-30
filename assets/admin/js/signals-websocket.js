// Connect to data.simpleincome.co WebSocket and subscribe to all symbols

// Function to update live price in UI
function updateLivePrice(fullSymbol, price) {
    const [exchange, symbol] = fullSymbol.split(':');

    // Update signals table
    const signalRows = document.querySelectorAll('#signalsBody tr');
    signalRows.forEach(row => {
        const symbolCell = row.querySelector('td:nth-child(4) a');
        const exchangeCell = row.querySelector('td:nth-child(3)');
        if (symbolCell && exchangeCell) {
            const rowSymbol = symbolCell.textContent.trim();
            const rowExchange = exchangeCell.textContent.trim();

            console.log('--- Debugging updateLivePrice in signals-websocket.js ---');
            console.log('Incoming fullSymbol:', fullSymbol, 'price:', price);
            console.log('Parsed exchange:', exchange, 'symbol:', symbol);
            console.log('Row symbol (from table):', rowSymbol, 'Row exchange (from table):', rowExchange);
            console.log('Match result:', rowSymbol === symbol && rowExchange === exchange);
            if (rowSymbol === symbol && rowExchange === exchange) {
                // Find the live price cell (column 7)
                const priceCell = row.querySelector('td:nth-child(7)');
                if (priceCell) {
                    priceCell.textContent = price.toFixed(2);
                    priceCell.classList.add('live-price');
                }

                // Calculate and update live P&L (column 9) only for IN_PROGRESS signals
                const status = row.getAttribute('data-status');
                if (status === 'IN_PROGRESS') {
                    const signalType = row.getAttribute('data-type').toUpperCase();
                    const entryCell = row.querySelector('td:nth-child(6)'); // Entry column
                    const pnlCell = row.querySelector('td:nth-child(9)'); // P&L column

                    if (entryCell && pnlCell) {
                        const entryText = entryCell.textContent.trim().replace('Rs ', '');
                        const entryPrice = parseFloat(entryText);

                        if (!isNaN(entryPrice)) {
                            let pnl = 0;
                            if (signalType === 'BUY') {
                                pnl = price - entryPrice;
                            } else if (signalType === 'SELL') {
                                pnl = entryPrice - price;
                            }

                            const pnlText = pnl >= 0 ?
                                `<span class="text-success">+${pnl.toFixed(2)}</span>` :
                                `<span class="text-danger">-${Math.abs(pnl).toFixed(2)}</span>`;

                            pnlCell.innerHTML = pnlText;
                        }
                    }
                }

                row.classList.add('price-updated');

                // Remove highlight after animation
                setTimeout(() => {
                    row.classList.remove('price-updated');
                }, 1000);

                console.log('🔄 Updated price and P&L for signal', fullSymbol, 'to', price);
            }
        }
    });

    // Update watchlist table
    const watchlistRows = document.querySelectorAll('#watchlistBody tr');
    watchlistRows.forEach(row => {
        const symbolCell = row.querySelector('td:nth-child(2) a');
        const exchangeCell = row.querySelector('td:nth-child(3)');
        if (symbolCell && exchangeCell) {
            const rowSymbol = symbolCell.textContent.trim();
            const rowExchange = exchangeCell.textContent.trim() || 'NSE';

            if (rowSymbol === symbol && rowExchange === exchange) {
                // Find the live price cell (column 4)
                 const priceCell = row.querySelector('td:nth-child(4)');
                 if (priceCell) {
                     priceCell.textContent = price.toFixed(2);
                     priceCell.classList.add('live-price');
                 }

                // Update difference (column 6) = alert - live with percentage
                const alertCell = row.querySelector('td:nth-child(5)');
                const differenceCell = row.querySelector('td:nth-child(6)');
                if (alertCell && differenceCell) {
                    const alertText = alertCell.textContent.trim().replace('Rs ', '');
                    const alertPrice = parseFloat(alertText);
                    if (!isNaN(alertPrice)) {
                        const diff = price - alertPrice;
                        let pct = 0;
                        if (alertPrice !== 0) {
                            pct = (diff / alertPrice) * 100;
                        }
                        const diffText = diff >= 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`;
                        const pctText = pct >= 0 ? `(+${pct.toFixed(2)}%)` : `(${pct.toFixed(2)}%)`;
                        differenceCell.textContent = `${diffText} ${pctText}`;
                        differenceCell.className = diff >= 0 ? 'text-success' : 'text-danger';
                    }
                }

                row.classList.add('price-updated');

                // Remove highlight after animation
                setTimeout(() => {
                    row.classList.remove('price-updated');
                }, 1000);

                console.log('🔄 Updated live price and difference for watchlist', fullSymbol, 'to', price);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing direct WebSocket connection to data.simpleincome.co');
    
    // Get all symbols from the page
    const symbolsToSubscribe = [];
    
    // Collect symbols from signals table
    const signalRows = document.querySelectorAll('#signalsBody tr');
    signalRows.forEach(row => {
        const symbolCell = row.querySelector('td:nth-child(4) a'); // Corrected selector
        const exchangeCell = row.querySelector('td:nth-child(3)');
        
        if (symbolCell && exchangeCell) {
            const symbol = symbolCell.textContent.trim();
            const exchange = exchangeCell.textContent.trim();
            if (symbol) {
                symbolsToSubscribe.push({ symbol, exchange });
            }
        }
    });
    
    // Collect symbols from watchlist table
    const watchlistRows = document.querySelectorAll('#watchlistBody tr');
    watchlistRows.forEach(row => {
        const symbolCell = row.querySelector('td:nth-child(2) a'); // Corrected selector
        const exchangeCell = row.querySelector('td:nth-child(3)');
        
        if (symbolCell && exchangeCell) {
            const symbol = symbolCell.textContent.trim();
            const exchange = exchangeCell.textContent.trim();
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
                    updateLivePrice(seriesKey, data.price);
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