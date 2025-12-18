// Product-specific Signals Management
class ProductSignalsManager {
    constructor(productName) {
        this.productName = productName;
        this.signals = [];
        this.filteredSignals = [];
        this.currentFilters = {
            status: '',
            symbol: '',
            date: ''
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFilters();
        try {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            tooltipTriggerList.forEach(el => { try { new bootstrap.Tooltip(el) } catch(e){} })
        } catch(e) {}
        
        // Signals are already loaded via server-side rendering
        try {
            this.loadSignalsFromTable();
        } catch (error) {
            console.warn('Could not load signals from table:', error);
        }
        try {
            this.initStreamingForSignals();
        } catch(e){}
    }
    
    // Initialize event listeners and setup
    bindEvents() {
        // Filter events
        
        // Filter events
        const statusFilter = document.getElementById('statusFilter');
        const symbolFilter = document.getElementById('symbolFilter');
        const dateFilter = document.getElementById('dateFilter');
        const resetFilters = document.getElementById('resetFilters');
        

        
        statusFilter?.addEventListener('change', (e) => this.applyFilter('status', e.target.value));
        symbolFilter?.addEventListener('input', (e) => this.applyFilter('symbol', e.target.value));
        dateFilter?.addEventListener('change', (e) => this.applyFilter('date', e.target.value));
        resetFilters?.addEventListener('click', () => this.resetFilters());
        
        // Signal action events (delegated to handle dynamically added elements)
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const signalId = btn.dataset.id || btn.dataset.sid;
            if (!action) return;
            if (action === 'edit' || action === 'edit-signal') {
                this.editSignal(signalId);
            } else if (action === 'delete' || action === 'delete-signal') {
                this.deleteSignal(signalId);
            } else if (action === 'close' || action === 'close-signal') {
                const symbol = btn.dataset.symbol || '';
                this.openCloseModal(signalId, symbol, btn);
            } else if (action === 'edit-watchlist') {
                const watchlistId = e.target.dataset.wid;
                this.editWatchlist(watchlistId);
            } else if (action === 'delete-watchlist') {
                const watchlistId = e.target.dataset.wid;
                this.deleteWatchlist(watchlistId);
            } else if (action === 'buy' || action === 'sell') {
                // Handle buy/sell actions - open signal creation form
                const isBuy = action === 'buy';
                
                // Get watchlist item data from the row
                const row = e.target.closest('tr');
                const cells = row.querySelectorAll('td');
                const stockName = cells[0].textContent.trim();
                const exchangeName = cells[1] ? cells[1].textContent.trim() : '';
                let currentPrice = parseFloat(cells[2].textContent.replace(/Rs\s?|₹/g, ''));
                
                // Populate and show the signal creation modal
                document.getElementById('signalCreateTitle').textContent = `Create ${isBuy ? 'BUY' : 'SELL'} Signal`;
                document.getElementById('signalStock').value = stockName;
                document.getElementById('signalTime').value = new Date().toLocaleString();
                const setEntry = (p) => {
                    currentPrice = Number(p) || 0;
                    document.getElementById('signalCurrentPrice').value = currentPrice;
                    document.getElementById('signalEntry').value = currentPrice;
                };
                if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
                    try {
                        const r = await fetch(`/api/price?symbol=${encodeURIComponent(stockName)}&exchange=${encodeURIComponent(exchangeName)}`);
                        const d = await r.json();
                        if (d && d.success && typeof d.price === 'number') setEntry(d.price); else setEntry(0);
                    } catch(e){ setEntry(0); }
                } else {
                    setEntry(currentPrice);
                }
                document.getElementById('signalSide').value = isBuy ? 'BUY' : 'SELL';
                document.getElementById('signalExchange').value = exchangeName;
                
                // Set default percentage offsets
                const targetPctEl = document.getElementById('targetPct');
                const stopPctEl = document.getElementById('stopPct');
                const targetLabel = document.getElementById('targetPctLabel');
                const stopLabel = document.getElementById('stopPctLabel');
                const targetSign = document.getElementById('targetPctSign');
                const stopSign = document.getElementById('stopPctSign');
                
                targetPctEl.value = 0.5;
                stopPctEl.value = 0.5;
                
                const applyPercentages = () => {
                    const tp = parseFloat(targetPctEl.value);
                    const sp = parseFloat(stopPctEl.value);
                    targetLabel.textContent = tp;
                    stopLabel.textContent = sp;
                    targetSign.textContent = isBuy ? '+' : '-';
                    stopSign.textContent = isBuy ? '-' : '+';
                    
                    const targetVal = isBuy ? currentPrice * (1 + tp/100) : currentPrice * (1 - tp/100);
                    const stopVal = isBuy ? currentPrice * (1 - sp/100) : currentPrice * (1 + sp/100);
                    
                    document.getElementById('signalTarget').value = targetVal.toFixed(2);
                    document.getElementById('signalStop').value = stopVal.toFixed(2);
                };
                
                // Apply initial percentages
                applyPercentages();
                
                // Add event listeners for percentage sliders
                targetPctEl.addEventListener('input', applyPercentages);
                stopPctEl.addEventListener('input', applyPercentages);
                
                // Show the modal
                const modal = new bootstrap.Modal(document.getElementById('signalCreateModal'));
                modal.show();
            }
        });

        // Watchlist events
        const addWatchlistBtn = document.getElementById('addWatchlistBtn');
        const saveWatchlistBtn = document.getElementById('saveWatchlistBtn');
        const watchlistForm = document.getElementById('watchlistForm');
        

        
        if (addWatchlistBtn) {
            addWatchlistBtn.addEventListener('click', () => {
                this.showWatchlistModal();
            });
        } else {
            // Use event delegation as fallback
            document.addEventListener('click', (e) => {
                if (e.target.id === 'addWatchlistBtn' || e.target.closest('#addWatchlistBtn')) {
                    e.preventDefault();
                    this.showWatchlistModal();
                }
            });
        }
        
        if (saveWatchlistBtn) {
            saveWatchlistBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveWatchlist();
            });
        }
        
        if (watchlistForm) {
            watchlistForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveWatchlist();
            });
        }

        const genBtn = document.getElementById('generateOptionSymbolsBtn');
        if (genBtn) {
            genBtn.addEventListener('click', async () => {
                const underlying = (document.getElementById('optionUnderlying')?.value || '').trim();
                const exchange = (document.getElementById('optionExchange')?.value || '').trim();
                const expiry = document.getElementById('optionExpiry')?.value || '';
                const stockSelect = document.getElementById('watchlistStockName');
                if (!underlying || !exchange || !expiry) { alert('Please fill Underlying, Exchange and Expiry'); return; }

                // Fetch underlying price to compute ATM
                let priceVal = NaN;
                try {
                    const resp = await fetch(`/api/price?symbol=${encodeURIComponent(underlying)}&exchange=${encodeURIComponent(exchange)}`);
                    const d = await resp.json();
                    if (d && d.success && typeof d.price === 'number') priceVal = d.price;
                } catch(e){}
                if (isNaN(priceVal)) { alert('Could not fetch underlying price'); return; }

                const step = (() => {
                    const sym = underlying.toUpperCase();
                    if (sym === 'NIFTY') return 50;
                    if (sym === 'BANKNIFTY') return 100;
                    if (priceVal < 100) return 5;
                    if (priceVal < 200) return 10;
                    if (priceVal < 1000) return 20;
                    return 50;
                })();

                const atm = Math.round(priceVal / step) * step;
                const strikes = [];
                for (let i = -3; i <= 3; i++) { strikes.push(atm + i * step); }

                const fmtYYMMDD = (dateStr) => {
                    const d = new Date(dateStr);
                    const yy = String(d.getFullYear()).slice(-2);
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yy}${mm}${dd}`;
                };
                const expYYMMDD = fmtYYMMDD(expiry);
                const u = underlying.toUpperCase();
                const makeSym = (s, cpLetter) => `${u}${expYYMMDD}${cpLetter}${s}`;

                stockSelect.innerHTML = '<option value="">Select an option…</option>';
                strikes.forEach(s => {
                    ['C','P'].forEach(cp => {
                        const val = makeSym(s, cp);
                        const opt = document.createElement('option');
                        opt.value = val;
                        opt.textContent = val;
                        stockSelect.appendChild(opt);
                    });
                });

                stockSelect.value = makeSym(atm, 'C');
            });
        }

        // Autofill Current Price from TradingView when underlying/exchange changes
        async function autofillCurrentPriceTV() { }

        const underlyingEl = document.getElementById('optionUnderlying');
        const exchangeEl = document.getElementById('optionExchange');
        if (underlyingEl) underlyingEl.addEventListener('blur', autofillCurrentPriceTV);
        if (exchangeEl) exchangeEl.addEventListener('change', autofillCurrentPriceTV);
        
        // Signal creation events
        const signalCreateForm = document.getElementById('signalCreateForm');
        const createSignalBtn = document.getElementById('createSignalBtn');
        
        if (createSignalBtn) {
            createSignalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.createSignal();
            });
        }
        
        if (signalCreateForm) {
            signalCreateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createSignal();
            });
        }
        
        // Handle modal close buttons (both Bootstrap and manual)
        const closeButtons = document.querySelectorAll('.modal .btn-close, .modal .btn-secondary[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal);
                }
            });
        });
        
        // Handle clicking outside modal (backdrop)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target);
            }
        });
    }

    setupFilters() {
        const tableEl = document.getElementById('productSignalsTable') || document.getElementById('signalsTable');
        const containerEl = tableEl ? (tableEl.closest('.card-body') || tableEl.parentElement) : (document.querySelector('.card-body') || document.querySelector('.table-responsive'));
        if (containerEl && !document.getElementById('signalFilters')) {
            const filterHTML = `
                <div id="signalFilters" class="row mb-3">
                    <div class="col-md-3">
                        <select id="statusFilter" class="form-select form-select-sm">
                            <option value="">All Status</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="PROFIT">Profit</option>
                            <option value="LOSS">Loss</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <input type="text" id="symbolFilter" class="form-control form-control-sm" placeholder="Search symbol...">
                    </div>
                    <div class="col-md-3">
                        <input type="date" id="dateFilter" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-3">
                        <button id="resetFilters" class="btn btn-sm btn-outline-secondary">Reset</button>
                    </div>
                </div>
            `;
            containerEl.insertAdjacentHTML('afterbegin', filterHTML);
            const statusFilter = document.getElementById('statusFilter');
            const symbolFilter = document.getElementById('symbolFilter');
            const dateFilter = document.getElementById('dateFilter');
            const resetFilters = document.getElementById('resetFilters');
            statusFilter?.addEventListener('change', (e) => this.applyFilter('status', e.target.value));
            symbolFilter?.addEventListener('input', (e) => this.applyFilter('symbol', e.target.value));
            dateFilter?.addEventListener('change', (e) => this.applyFilter('date', e.target.value));
            resetFilters?.addEventListener('click', () => this.resetFilters());
        }
    }

    loadSignalsFromTable() {
        // Load signals from the existing table rows
        const table = document.getElementById('productSignalsTable');
        if (!table) {
            console.warn('productSignalsTable not found, skipping signal loading');
            return;
        }
        
        const rows = table.querySelectorAll('tbody tr');
        this.signals = [];
        
        rows.forEach(row => {
            if (row.dataset.signalId) {
                const cells = row.cells;
                // Table has ID at index 0, so shift all indices by +1
                this.signals.push({
                    id: row.dataset.signalId,
                    symbol: cells[1].textContent.trim(),
                    exchange: cells[2] ? cells[2].textContent.trim() : '',
                    signalType: cells[4].textContent.trim(),
                    entry: parseFloat(cells[5].textContent.replace(/Rs\s?|₹/g, '')),
                    target: parseFloat(cells[6].textContent.replace(/Rs\s?|₹/g, '')),
                    stopLoss: parseFloat(cells[7].textContent.replace(/Rs\s?|₹/g, '')),
                    entryDateTime: cells[8].textContent.trim(),
                    exitPrice: cells[9].textContent.trim() !== '-' ? parseFloat(cells[9].textContent.replace(/Rs\s?|₹/g, '')) : null,
                    exitDateTime: cells[10].textContent.trim(),
                    status: this.getStatusFromBadge(cells[11].innerHTML),
                    profitLoss: this.getProfitLossFromCell(cells[12]),
                    createdAt: cells[13].textContent.trim()
                });
            }
        });
        
        this.filteredSignals = [...this.signals];
    }

    async initStreamingForSignals() {
        if (!window.wsManager) {
            console.warn('wsManager not found, skipping WebSocket initialization');
            return;
        }

        try {
            await window.wsManager.connect();
        } catch (e) {
            console.error('WS Connect error', e);
        }

        const subscriptions = [];
        const symbolMap = new Map(); // key -> callbacks

        // Helper to add subscription
        const addSub = (symbol, exchange, callback) => {
            if (!symbol) return;
            const key = `${exchange}:${symbol}`.toUpperCase().replace(/\s+/g, '');
            subscriptions.push({ symbol, exchange });
            if (!symbolMap.has(key)) symbolMap.set(key, []);
            symbolMap.get(key).push(callback);
        };

        // 1. Signals Table
        const signalsBody = document.querySelector('#productSignalsTable tbody');
        if (signalsBody) {
            const rows = Array.from(signalsBody.querySelectorAll('tr'));
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                // 0: ID, 1: Symbol, 2: Exchange, 3: Live Price, 4: Type, 5: Entry, 12: P&L
                const symbolCell = cells[1];
                const symbol = String(symbolCell?.textContent || '').trim();
                const exCell = String(cells[2]?.textContent || '').trim();
                const exchange = exCell && exCell !== '-' ? exCell : 'NSE';
                const priceCell = cells[3];
                
                if (symbol && priceCell) {
                    addSub(symbol, exchange, (data) => {
                        const price = data.price;
                        if (Number.isFinite(price)) {
                            priceCell.textContent = `Rs ${price.toFixed(2)}`;
                            
                            // Update P&L
                            const typeTxt = String(cells[4]?.textContent || '').trim().toUpperCase();
                            const entryVal = parseFloat(String(cells[5]?.textContent || '').replace(/Rs\s?|₹/g, ''));
                            const plCell = cells[12];
                            
                            if (Number.isFinite(entryVal) && plCell) {
                                let pl = 0;
                                if (typeTxt === 'BUY') pl = price - entryVal;
                                else if (typeTxt === 'SELL') pl = entryVal - price;
                                
                                const abs = Math.abs(pl).toFixed(2);
                                plCell.innerHTML = pl >= 0 
                                    ? `<span class="text-success">+Rs ${abs}</span>`
                                    : `<span class="text-danger">-Rs ${abs}</span>`;
                            }
                        }
                    });
                }
            });
        }

        // 2. Watchlist Table
        const watchlistBody = document.getElementById('productWatchlistBody');
        if (watchlistBody) {
             const rows = Array.from(watchlistBody.querySelectorAll('tr'));
             rows.forEach(row => {
                 const cells = row.querySelectorAll('td');
                 // 0: Stock Name, 1: Exchange, 2: Current Price
                 const symbol = String(cells[0]?.textContent || '').trim();
                 const exCell = String(cells[1]?.textContent || '').trim();
                 const exchange = exCell && exCell !== '-' ? exCell : 'NSE';
                 const priceCell = cells[2];
                 
                 if (symbol && priceCell) {
                     addSub(symbol, exchange, (data) => {
                         if (Number.isFinite(data.price)) {
                             priceCell.textContent = `Rs ${data.price.toFixed(2)}`;
                         }
                     });
                 }
             });
        }

        if (subscriptions.length > 0) {
            window.wsManager.subscribe(subscriptions);
            window.wsManager.on('price_update', (data) => {
                // Log received price for debugging
                console.log(`[Product Price Update] ${data.exchange}:${data.symbol} = Rs ${data.price}`);

                const key = `${data.exchange}:${data.symbol}`.toUpperCase().replace(/\s+/g, '');
                const handlers = symbolMap.get(key);
                if (handlers) handlers.forEach(h => h(data));
            });
        }
    }

    getStatusFromBadge(badgeHtml) {
        if (badgeHtml.includes('bg-primary')) return 'IN_PROGRESS';
        if (badgeHtml.includes('bg-success')) return 'PROFIT';
        if (badgeHtml.includes('bg-danger')) return 'LOSS';
        return 'UNKNOWN';
    }

    getProfitLossFromCell(cell) {
        const text = cell.textContent.trim();
        if (text === '-') return null;
        const value = parseFloat(text.replace(/[Rs\s₹+-]/g, ''));
        return cell.querySelector('.text-success') ? value : -value;
    }

    applyFilter(filterType, value) {
        this.currentFilters[filterType] = value;
        this.filterSignals();
    }

    filterSignals() {
        this.filteredSignals = this.signals.filter(signal => {
            return (
                (!this.currentFilters.status || signal.status === this.currentFilters.status) &&
                (!this.currentFilters.symbol || 
                    signal.symbol.toLowerCase().includes(this.currentFilters.symbol.toLowerCase())) &&
                (!this.currentFilters.date || 
                    (signal.createdAt && signal.createdAt.includes(this.currentFilters.date)))
            );
        });
        this.renderFilteredSignals();
    }

    renderFilteredSignals() {
        const tbody = document.querySelector('#productSignalsTable tbody') || document.querySelector('#signalsTable tbody');
        if (!tbody) return;

        if (this.filteredSignals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center text-muted">
                        <i class="fas fa-chart-line fa-2x mb-2"></i>
                        <p>No signals found matching your filters</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Show only filtered signals by hiding/showing rows
        const allRows = Array.from(tbody.querySelectorAll('tr'));
        allRows.forEach(row => {
            const signalId = row.dataset.signalId;
            const shouldShow = this.filteredSignals.some(s => s.id == signalId);
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    resetFilters() {
        this.currentFilters = {
            status: '',
            symbol: '',
            date: ''
        };
        
        const statusFilter = document.getElementById('statusFilter');
        const symbolFilter = document.getElementById('symbolFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        if (statusFilter) statusFilter.value = '';
        if (symbolFilter) symbolFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        
        this.filteredSignals = [...this.signals];
        this.renderFilteredSignals();
    }

    openCloseModal(signalId, symbol, triggerEl) {
        const modalEl = document.getElementById('signalCloseModal');
        if (!modalEl) return;
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) modal = new bootstrap.Modal(modalEl);
        let entry = '';
        let target = '';
        let finalSymbol = symbol || '';
        const s = this.signals.find(x => x.id == signalId);
        if (s) {
            entry = s.entry;
            target = s.target;
            finalSymbol = s.symbol || finalSymbol;
        } else if (triggerEl) {
            const row = triggerEl.closest('tr');
            if (row) {
                const cells = row.querySelectorAll('td');
                finalSymbol = finalSymbol || (cells[0]?.textContent.trim() || '');
                const parseAmt = (t) => parseFloat(String(t || '').replace(/Rs\s?|₹/g, ''));
                entry = parseAmt(cells[5]?.textContent);
                target = parseAmt(cells[6]?.textContent);
            }
        }
        const idEl = document.getElementById('closeSignalId');
        const symEl = document.getElementById('closeSignalSymbol');
        const entryEl = document.getElementById('closeSignalEntry');
        const targetEl = document.getElementById('closeSignalTarget');
        const exitEl = document.getElementById('closeExitPrice');
        if (idEl) idEl.value = signalId;
        if (symEl) symEl.value = finalSymbol || '';
        if (entryEl) entryEl.value = entry || '';
        if (targetEl) targetEl.value = target || '';
        if (exitEl) exitEl.value = target || '';
        const btn = document.getElementById('closeSignalBtn');
        if (btn) {
            btn.onclick = async () => {
                console.log('Product page modal close request start', { signalId });
                try {
                    const res = await fetch(`/api/signals/${signalId}/close`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    });
                    console.log('Product page modal close response', { ok: res.ok, status: res.status });
                    const result = await res.json();
                    console.log('Product page modal close parsed', result);
                    if (result.success) {
                        this.showSuccess(`Signal closed as ${result.data.status}`);
                        modal.hide();
                        setTimeout(() => location.reload(), 1200);
                    } else {
                        this.showError(result.error || 'Failed to close signal');
                    }
                } catch (err) {
                    this.showError('Error closing signal');
                }
            };
        }
        modal.show();
    }

    async closeSignal(signalId, symbol) {
        if (!confirm(`Are you sure you want to close the signal for ${symbol}?`)) return;

        try {
            const signal = this.signals.find(s => s.id == signalId);
            if (!signal) return;

            const exitPrice = prompt(`Enter exit price for ${symbol}:`, signal.target);
            if (!exitPrice || isNaN(exitPrice)) return;

            const response = await fetch(`/api/signals/${signalId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'CLOSED',
                    exitPrice: parseFloat(exitPrice),
                    exitDateTime: new Date().toISOString()
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('Signal closed successfully');
                // Reload the page to show updated data
                setTimeout(() => location.reload(), 1500);
            } else {
                this.showError('Failed to close signal');
            }
        } catch (error) {
            console.error('Error closing signal:', error);
            this.showError('Error closing signal');
        }
    }

    async editSignal(signalId) {
        // For now, show a simple prompt for editing
        // In a full implementation, this would open a modal with the current signal data
        this.showError('Edit functionality will be implemented soon. For now, you can close and recreate the signal if needed.');
    }

    async deleteSignal(signalId) {
        if (!confirm('Are you sure you want to delete this signal? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/api/signals/${signalId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('Signal deleted successfully');
                // Reload the page to show updated data
                setTimeout(() => location.reload(), 1500);
            } else {
                this.showError('Failed to delete signal');
            }
        } catch (error) {
            console.error('Error deleting signal:', error);
            this.showError('Error deleting signal');
        }
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999;">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', alertHTML);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            const alert = document.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 3000);
    }

    // Watchlist Management Methods
    showWatchlistModal(watchlistId = null) {
        const modalElement = document.getElementById('watchlistModal');
        if (!modalElement) {
            return;
        }
        
        try {
            // Check if Bootstrap modal is available
            if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
                this.showModalManual(modalElement);
                return;
            }
            
            // Get existing modal instance or create new one
            let modal = bootstrap.Modal.getInstance(modalElement);
            if (!modal) {
                modal = new bootstrap.Modal(modalElement);
            }
            
            const title = document.getElementById('watchlistModalTitle');
            const form = document.getElementById('watchlistForm');
            
            if (watchlistId) {
                // Edit mode
                title.textContent = 'Edit Watchlist Item';
                this.loadWatchlistItem(watchlistId);
            } else {
                // Add mode
                title.textContent = 'Add to Watchlist';
                form.reset();
                document.getElementById('watchlistId').value = '';
            }
            
            modal.show();
            
        } catch (error) {
            console.error('Error with Bootstrap modal:', error);
           this.showModalManual(modalElement);
            return;}
    }
    
    // Manual modal method as fallback
    showModalManual(modalElement) {

        try {
            // Show modal manually
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
            modalElement.setAttribute('aria-modal', 'true');
            modalElement.setAttribute('role', 'dialog');
            
            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.id = 'manualModalBackdrop';
            document.body.appendChild(backdrop);
            
            // Add body class to prevent scrolling
            document.body.classList.add('modal-open');
            

            
        } catch (manualError) {
            console.error('Manual modal method also failed:', manualError);
        }
    }
    
    // Hide modal (works with both Bootstrap and manual methods)
    hideModal(modalElement) {
        try {
            // Try Bootstrap method first
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            } else {
                // Manual hide method
                modalElement.style.display = 'none';
                modalElement.classList.remove('show');
                modalElement.removeAttribute('aria-modal');
                modalElement.removeAttribute('role');
                
                // Remove backdrop
                const backdrop = document.getElementById('manualModalBackdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                
                // Remove body class
                document.body.classList.remove('modal-open');
            }
        } catch (error) {
            console.error('Error hiding modal:', error);
            // Fallback to manual hide
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
        }
    }

    async loadWatchlistItem(watchlistId) {
        try {
            const response = await fetch(`/api/watchlist/${watchlistId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const item = result.data;
                document.getElementById('watchlistId').value = item.id;
                document.getElementById('watchlistStockName').value = item.stockName;
                
                const exchEl = document.getElementById('optionExchange');
                if (exchEl) exchEl.value = item.exchange || '';
                const symEl = document.getElementById('optionSymbol');
                const symExEl = document.getElementById('optionSymbolExchange');
                if (symEl) symEl.value = item.stockName || '';
                if (symExEl) symExEl.value = item.exchange || '';
            } else {
                this.showError('Failed to load watchlist item');
            }
        } catch (error) {
            console.error('Error loading watchlist item:', error);
            this.showError('Error loading watchlist item');
        }
    }

    async saveWatchlist() {
        const watchlistId = document.getElementById('watchlistId').value;
        
        const manualSymbol = (document.getElementById('optionSymbol')?.value || '').trim();
        const manualExchange = (document.getElementById('optionSymbolExchange')?.value || '').trim();
        const generatedSymbol = (document.getElementById('watchlistStockName')?.value || '').trim();
        const generatedExchange = (document.getElementById('optionExchange')?.value || '').trim();
        const stockName = manualSymbol || generatedSymbol;
        const exchange = manualExchange || generatedExchange;

        if (!stockName || !exchange) {
            this.showError('Please fill Symbol and Exchange');
            return;
        }

        // Show loading state
        const saveBtn = document.getElementById('saveWatchlistBtn');
        const originalBtnText = saveBtn?.textContent || 'Save';
        if (saveBtn) {
            saveBtn.textContent = 'Fetching Price...';
            saveBtn.disabled = true;
        }

        let cp = 0;
        let priceFetchSuccess = false;
        
        try {
            console.log(`[Watchlist] Fetching price for ${exchange}:${stockName}`);
            const r = await fetch(`/api/price?symbol=${encodeURIComponent(stockName)}&exchange=${encodeURIComponent(exchange)}`);
            const d = await r.json();
            
            if (d && d.success && typeof d.price === 'number') {
                cp = d.price;
                priceFetchSuccess = true;
                console.log(`[Watchlist] Price fetched successfully: ${cp}`);
            } else {
                console.error(`[Watchlist] Price fetch failed: ${d.error || 'Unknown error'}`);
                this.showError(`Price not available: ${d.error || 'Unable to fetch price for this symbol'}`);
                
                // Restore button state
                if (saveBtn) {
                    saveBtn.textContent = originalBtnText;
                    saveBtn.disabled = false;
                }
                return;
            }
        } catch(e) {
            console.error(`[Watchlist] Price fetch error: ${e.message}`);
            this.showError('Failed to fetch price - please check your symbol and exchange');
            
            // Restore button state
            if (saveBtn) {
                saveBtn.textContent = originalBtnText;
                saveBtn.disabled = false;
            }
            return;
        }

        const watchlistData = {
            stockName,
            product: this.productName,
            exchange,
            currentPrice: cp,
            alertPrice: cp  // Set alert price to match current price
        };

        try {
            const url = watchlistId ? `/api/watchlist/${watchlistId}` : '/api/watchlist';
            const method = watchlistId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(watchlistData)
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess(watchlistId ? 'Watchlist item updated successfully' : 'Watchlist item added successfully');
                // Close modal and reload page
                const modalElement = document.getElementById('watchlistModal');
                this.hideModal(modalElement);
                setTimeout(() => location.reload(), 1500);
            } else {
                this.showError(result.message || 'Failed to save watchlist item');
            }
        } catch (error) {
            console.error('Error saving watchlist item:', error);
            this.showError('Error saving watchlist item');
        } finally {
            // Restore button state
            if (saveBtn) {
                saveBtn.textContent = originalBtnText;
                saveBtn.disabled = false;
            }
        }
    }

    editWatchlist(watchlistId) {
                this.showWatchlistModal(watchlistId);
    }

    async deleteWatchlist(watchlistId) {
        if (!confirm('Are you sure you want to delete this watchlist item?')) return;

        try {
            const response = await fetch(`/api/watchlist/${watchlistId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('Watchlist item deleted successfully');
                // Reload the page to show updated data
                setTimeout(() => location.reload(), 1500);
            } else {
                this.showError('Failed to delete watchlist item');
            }
        } catch (error) {
            console.error('Error deleting watchlist item:', error);
            this.showError('Error deleting watchlist item');
        }
    }
    
    async createSignal() {
        const stockName = document.getElementById('signalStock').value;
        const entryPrice = parseFloat(document.getElementById('signalEntry').value);
        const targetPrice = parseFloat(document.getElementById('signalTarget').value);
        const stopLoss = parseFloat(document.getElementById('signalStop').value);
        const side = document.getElementById('signalSide').value;
        const notes = document.getElementById('signalNotes').value;

        if (!stockName || isNaN(entryPrice) || isNaN(targetPrice) || isNaN(stopLoss) || !side) {
            this.showError('Please fill in all required fields');
            return;
        }

        const productIdStr = document.body.dataset.productId || '';
        const productId = productIdStr ? parseInt(productIdStr) : null;
        const productName = document.body.dataset.productName || '';
        
        const signalData = {
            productId,
            symbol: stockName,
            exchange: (document.getElementById('signalExchange')?.value || '').trim() || null,
            entry: entryPrice,
            target: targetPrice,
            stopLoss: stopLoss,
            signalType: side,
            notes: notes
        };

        try {
            const response = await fetch('/api/signals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(signalData)
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess(`Signal created successfully`);
                // Close modal and reload page
                const modalElement = document.getElementById('signalCreateModal');
                this.hideModal(modalElement);
                setTimeout(() => location.reload(), 1500);
            } else {
                this.showError(result.message || 'Failed to create signal');
            }
        } catch (error) {
            console.error('Error creating signal:', error);
            this.showError('Error creating signal');
        }
    }
    
    // Test function to manually trigger watchlist modal

}

// Initialize the product signals manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        const signalsTable = document.getElementById('productSignalsTable');
        const pageTitle = document.title;
        
        // Check if we're on a product signals page
        if (pageTitle.includes('Product Signals')) {
            // Extract product name from title (format: "Product Signals - ProductName")
            const productName = pageTitle.replace('Product Signals - ', '');
            
            // Initialize even if table is not found - we can handle missing elements gracefully
            window.productSignalsManager = new ProductSignalsManager(productName);
        }
    } catch (error) {
        console.error('Error initializing ProductSignalsManager:', error);
    }
});
