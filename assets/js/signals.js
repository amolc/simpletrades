// Signals Management System
class SignalsManager {
    constructor() {
        this.signals = [];
        this.filteredSignals = [];
        this.currentFilters = {
            status: '',
            type: '',
            stock: '',
            date: ''
        };
        this.priceUpdates = new Map(); // Store real-time price updates
        this.wsSubscriptions = new Set(); // Track WebSocket subscriptions
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSignals();
        this.setupFilters();
        this.setupWebSocket();
    }

    bindEvents() {
        // Filter events
        document.getElementById('statusFilter')?.addEventListener('change', (e) => this.applyFilter('status', e.target.value));
        document.getElementById('typeFilter')?.addEventListener('change', (e) => this.applyFilter('type', e.target.value));
        document.getElementById('stockFilter')?.addEventListener('input', (e) => this.applyFilter('stock', e.target.value));
        document.getElementById('dateFilter')?.addEventListener('change', (e) => this.applyFilter('date', e.target.value));
        
        // Reset filters
        document.getElementById('resetFilters')?.addEventListener('click', () => this.resetFilters());
        
        // Add new signal
        document.getElementById('addSignalBtn')?.addEventListener('click', () => this.showAddSignalModal());
        document.getElementById('saveSignalBtn')?.addEventListener('click', () => this.saveNewSignal());
    }

    setupWebSocket() {
        // Wait for WebSocket manager to be available
        if (!window.wsManager) {
            setTimeout(() => this.setupWebSocket(), 100);
            return;
        }

        // Connect to WebSocket
        window.wsManager.connect().then(() => {
            console.log('Signals WebSocket connected');
            
            // Subscribe to price updates for all active signals
            this.subscribeToActiveSignals();
            
            // Listen for price updates
            this.unsubscribePriceUpdate = window.wsManager.on('price_update', (data) => {
                this.handlePriceUpdate(data);
            });
            
        }).catch(error => {
            console.error('Failed to connect WebSocket for signals:', error);
        });
    }

    subscribeToActiveSignals() {
        if (!window.wsManager) return;
        
        // Get all active (IN_PROGRESS) signals
        const activeSignals = this.signals.filter(signal => signal.status === 'IN_PROGRESS');
        
        if (activeSignals.length === 0) return;
        
        // Subscribe to real-time prices for active signals
        const symbolsToSubscribe = activeSignals.map(signal => ({
            symbol: signal.symbol,
            exchange: signal.exchange || 'NSE'
        }));
        
        const subscribed = window.wsManager.subscribe(symbolsToSubscribe);
        
        // Track subscriptions
        subscribed.forEach(sub => {
            const seriesKey = `${sub.exchange}:${sub.symbol}`.toUpperCase().replace(/\s+/g, '');
            this.wsSubscriptions.add(seriesKey);
        });
        
        console.log(`Subscribed to ${subscribed.length} active signals for real-time price updates`);
    }

    handlePriceUpdate(data) {
        const { symbol, exchange, price, seriesKey } = data;
        
        // Store the price update
        this.priceUpdates.set(seriesKey, {
            price: price,
            timestamp: Date.now(),
            symbol: symbol,
            exchange: exchange
        });
        
        // Update the UI for signals that match this symbol
        this.updateSignalPrices(seriesKey, price);
    }

    updateSignalPrices(seriesKey, currentPrice) {
        // Find signals that match this series key
        const matchingSignals = this.signals.filter(signal => {
            const signalSeriesKey = `${signal.exchange || 'NSE'}:${signal.symbol}`.toUpperCase().replace(/\s+/g, '');
            return signalSeriesKey === seriesKey;
        });
        
        if (matchingSignals.length === 0) return;
        
        // Update the UI for matching signals
        matchingSignals.forEach(signal => {
            const row = document.querySelector(`tr[data-signal-id="${signal.id}"]`);
            if (row) {
                // Update current price display if it exists, or add it
                let priceCell = row.querySelector('.current-price-cell');
                if (!priceCell) {
                    // Add current price cell after entry price
                    const entryCell = row.querySelector('td:nth-child(2)');
                    if (entryCell) {
                        priceCell = document.createElement('td');
                        priceCell.className = 'current-price-cell';
                        entryCell.parentNode.insertBefore(priceCell, entryCell.nextSibling);
                        
                        // Update header if needed
                        const headerRow = document.querySelector('#signalsTable thead tr');
                        if (headerRow && !headerRow.querySelector('.current-price-header')) {
                            const currentPriceHeader = document.createElement('th');
                            currentPriceHeader.className = 'current-price-header';
                            currentPriceHeader.textContent = 'Current Price';
                            const headerEntry = headerRow.querySelector('th:nth-child(2)');
                            headerRow.insertBefore(currentPriceHeader, headerEntry.nextSibling);
                        }
                    }
                }
                
                if (priceCell) {
                    const profitLoss = this.calculateSignalPL(signal, currentPrice);
                    const plColor = profitLoss > 0 ? 'text-success' : profitLoss < 0 ? 'text-danger' : 'text-muted';
                    const plIcon = profitLoss > 0 ? 'fa-arrow-up' : profitLoss < 0 ? 'fa-arrow-down' : 'fa-minus';
                    
                    priceCell.innerHTML = `
                        <div class="${plColor}">
                            <i class="fas ${plIcon} fa-xs"></i> Rs ${currentPrice.toFixed(2)}
                            <br><small class="text-muted">${profitLoss > 0 ? '+' : ''}${profitLoss.toFixed(2)}</small>
                        </div>
                    `;
                }
            }
        });
    }

    calculateSignalPL(signal, currentPrice) {
        if (signal.status !== 'IN_PROGRESS') return 0;
        
        if (signal.signalType === 'BUY') {
            return currentPrice - signal.entry;
        } else if (signal.signalType === 'SELL') {
            return signal.entry - currentPrice;
        }
        return 0;
    }

    setupFilters() {
        // Add filter controls to the page if they don't exist
        const filterContainer = document.querySelector('.card-body') || document.querySelector('.table-responsive');
        if (filterContainer && !document.getElementById('signalFilters')) {
            const filterHTML = `
                <div id="signalFilters" class="row mb-3">
                    <div class="col-md-2">
                        <select id="statusFilter" class="form-select form-select-sm">
                            <option value="">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="CLOSED">Closed</option>
                            <option value="PENDING">Pending</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <select id="typeFilter" class="form-select form-select-sm">
                            <option value="">All Types</option>
                            <option value="BUY">Buy</option>
                            <option value="SELL">Sell</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <input type="text" id="stockFilter" class="form-control form-control-sm" placeholder="Search stock...">
                    </div>
                    <div class="col-md-2">
                        <input type="date" id="dateFilter" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-3">
                        <button id="resetFilters" class="btn btn-sm btn-outline-secondary">Reset</button>
                        <button id="addSignalBtn" class="btn btn-sm btn-primary ms-2">Add Signal</button>
                    </div>
                </div>
            `;
            filterContainer.insertAdjacentHTML('beforebegin', filterHTML);
        }
    }

    async loadSignals() {
        try {
            const response = await fetch('/api/signals');
            const result = await response.json();
            
            if (result.success) {
                this.signals = result.data;
                this.filteredSignals = [...this.signals];
                this.renderSignalsTable();
                this.updateStats();
                
                // Subscribe to WebSocket for active signals after loading
                this.subscribeToActiveSignals();
            } else {
                this.showError('Failed to load signals');
            }
        } catch (error) {
            console.error('Error loading signals:', error);
            this.showError('Error loading signals');
        }
    }

    renderSignalsTable() {
        const tbody = document.querySelector('#signalsTable tbody');
        if (!tbody) return;

        if (this.filteredSignals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        <i class="fas fa-chart-line fa-2x mb-2"></i>
                        <p>No signals found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredSignals.map(signal => this.createSignalRow(signal)).join('');
        
        // Bind action events
        this.bindActionEvents();
    }

    createSignalRow(signal) {
        const statusBadge = this.getStatusBadge(signal.status);
        const typeBadge = this.getTypeBadge(signal.signalType);
        const profitLossColor = signal.profitLoss > 0 ? 'text-success' : signal.profitLoss < 0 ? 'text-danger' : 'text-muted';
        const profitLossIcon = signal.profitLoss > 0 ? 'fa-arrow-up' : signal.profitLoss < 0 ? 'fa-arrow-down' : 'fa-minus';
        
        return `
            <tr data-signal-id="${signal.id}">
                <td><strong>${signal.symbol}</strong><br><small class="text-muted">${signal.exchange || 'NSE'}</small></td>
                <td>Rs ${signal.entry.toFixed(2)}</td>
                <td>Rs ${signal.target.toFixed(2)}</td>
                <td>Rs ${signal.stopLoss.toFixed(2)}</td>
                <td>${typeBadge}</td>
                <td>
                    <small class="text-muted" title="${signal.notes}">
                        ${signal.notes && signal.notes.length > 30 ? signal.notes.substring(0, 30) + '...' : (signal.notes || '')}
                    </small>
                </td>
                <td>
                    <small>${new Date(signal.createdAt).toLocaleString()}</small>
                </td>
                <td>
                    ${signal.status === 'CLOSED' ? 
                        `<span class="${profitLossColor}">
                            <i class="fas ${profitLossIcon}"></i> Rs ${Math.abs(signal.profitLoss || 0).toFixed(2)}
                        </span>` :
                        `<div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary btn-sm edit-signal" data-id="${signal.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-success btn-sm close-signal" data-id="${signal.id}" title="Close">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm delete-signal" data-id="${signal.id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>`
                    }
                </td>
            </tr>
        `;
    }

    getStatusBadge(status) {
        const badges = {
            'IN_PROGRESS': '<span class="badge bg-success">Active</span>',
            'PROFIT': '<span class="badge bg-success">Profit</span>',
            'LOSS': '<span class="badge bg-danger">Loss</span>'
        };
        return badges[status] || '<span class="badge bg-light text-dark">Unknown</span>';
    }

    getTypeBadge(type) {
        const badges = {
            'BUY': '<span class="badge bg-success">BUY</span>',
            'SELL': '<span class="badge bg-danger">SELL</span>'
        };
        return badges[type] || '<span class="badge bg-light text-dark">Unknown</span>';
    }

    bindActionEvents() {
        // Edit signal
        document.querySelectorAll('.edit-signal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const signalId = e.target.closest('button').dataset.id;
                this.editSignal(signalId);
            });
        });

        // Close signal
        document.querySelectorAll('.close-signal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const signalId = e.target.closest('button').dataset.id;
                this.closeSignal(signalId);
            });
        });

        // Delete signal
        document.querySelectorAll('.delete-signal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const signalId = e.target.closest('button').dataset.id;
                this.deleteSignal(signalId);
            });
        });
    }

    applyFilter(filterType, value) {
        this.currentFilters[filterType] = value;
        this.filterSignals();
    }

    filterSignals() {
        this.filteredSignals = this.signals.filter(signal => {
            return (
                (!this.currentFilters.status || signal.status === this.currentFilters.status) &&
                (!this.currentFilters.type || signal.signalType === this.currentFilters.type) &&
                (!this.currentFilters.stock || 
                    signal.symbol.toLowerCase().includes(this.currentFilters.stock.toLowerCase())) &&
                (!this.currentFilters.date || signal.date === this.currentFilters.date)
            );
        });
        this.renderSignalsTable();
    }

    resetFilters() {
        this.currentFilters = {
            status: '',
            type: '',
            stock: '',
            date: ''
        };
        
        document.getElementById('statusFilter').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('stockFilter').value = '';
        document.getElementById('dateFilter').value = '';
        
        this.filteredSignals = [...this.signals];
        this.renderSignalsTable();
    }

    async closeSignal(signalId) {
        if (!confirm('Are you sure you want to close this signal?')) return;

        try {
            const signal = this.signals.find(s => s.id == signalId);
            if (!signal) return;

            const exitPrice = prompt(`Enter exit price for ${signal.symbol}:`, signal.target);
            if (!exitPrice || isNaN(exitPrice)) return;

            const profitLoss = signal.signalType === 'BUY' 
                ? parseFloat(exitPrice) - signal.entry 
                : signal.entry - parseFloat(exitPrice);

            const response = await fetch(`/api/signals/${signalId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: signal.signalType === 'BUY' && parseFloat(exitPrice) > signal.entry ? 'PROFIT' : 
                           signal.signalType === 'SELL' && parseFloat(exitPrice) < signal.entry ? 'PROFIT' : 'LOSS',
                    exitPrice: parseFloat(exitPrice),
                    profitLoss: profitLoss
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('Signal closed successfully');
                this.loadSignals();
            } else {
                this.showError('Failed to close signal');
            }
        } catch (error) {
            console.error('Error closing signal:', error);
            this.showError('Error closing signal');
        }
    }

    async deleteSignal(signalId) {
        if (!confirm('Are you sure you want to delete this signal?')) return;

        try {
            const response = await fetch(`/api/signals/${signalId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('Signal deleted successfully');
                this.loadSignals();
            } else {
                this.showError('Failed to delete signal');
            }
        } catch (error) {
            console.error('Error deleting signal:', error);
            this.showError('Error deleting signal');
        }
    }

    showAddSignalModal() {
        const modalHTML = `
            <div class="modal fade" id="addSignalModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add New Signal</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addSignalForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label class="form-label">Stock Symbol</label>
                                        <input type="text" class="form-control" id="newStock" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Type</label>
                                        <select class="form-select" id="newType" required>
                                            <option value="BUY">BUY</option>
                                            <option value="SELL">SELL</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Entry Price</label>
                                        <input type="number" class="form-control" id="newEntry" step="0.01" required>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Target Price</label>
                                        <input type="number" class="form-control" id="newTarget" step="0.01" required>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Stop Loss</label>
                                        <input type="number" class="form-control" id="newStopLoss" step="0.01" required>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" id="newNotes" rows="2"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="saveSignalBtn">Save Signal</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if present
        const existingModal = document.getElementById('addSignalModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById('addSignalModal'));
        modal.show();
        
        // Bind save event
        document.getElementById('saveSignalBtn').addEventListener('click', () => this.saveNewSignal());
    }

    async saveNewSignal() {
        const formData = {
            symbol: document.getElementById('newStock').value.trim().toUpperCase(),
            exchange: 'NSE',
            signalType: document.getElementById('newType').value,
            entry: parseFloat(document.getElementById('newEntry').value),
            target: parseFloat(document.getElementById('newTarget').value),
            stopLoss: parseFloat(document.getElementById('newStopLoss').value),
            notes: document.getElementById('newNotes').value.trim(),
            status: 'IN_PROGRESS'
        };

        if (!formData.symbol || !formData.entry || !formData.target || !formData.stopLoss) {
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch('/api/signals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('Signal created successfully');
                this.loadSignals();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addSignalModal'));
                modal.hide();
            } else {
                this.showError('Failed to create signal');
            }
        } catch (error) {
            console.error('Error creating signal:', error);
            this.showError('Error creating signal');
        }
    }

    updateStats() {
        // Calculate stats from current signals
        const totalSignals = this.signals.length;
        const activeSignals = this.signals.filter(s => s.status === 'IN_PROGRESS').length;
        const profitSignals = this.signals.filter(s => s.status === 'PROFIT').length;
        const lossSignals = this.signals.filter(s => s.status === 'LOSS').length;
        const completedSignals = profitSignals + lossSignals;
        const winRate = completedSignals > 0 ? Math.round((profitSignals / completedSignals) * 100) : 0;
        
        const totalProfit = this.signals.filter(s => s.status === 'PROFIT').reduce((sum, s) => sum + (s.profitLoss || 0), 0);
        const totalLoss = Math.abs(this.signals.filter(s => s.status === 'LOSS').reduce((sum, s) => sum + (s.profitLoss || 0), 0));
        const netProfit = totalProfit - totalLoss;
        
        // Update stats display if exists
        const statsContainer = document.getElementById('signalStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-2 text-center">
                        <h4 class="text-primary">${totalSignals}</h4>
                        <small class="text-muted">Total</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-success">${activeSignals}</h4>
                        <small class="text-muted">Active</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-success">${profitSignals}</h4>
                        <small class="text-muted">Profit</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-danger">${lossSignals}</h4>
                        <small class="text-muted">Loss</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-info">${winRate}%</h4>
                        <small class="text-muted">Win Rate</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="${netProfit >= 0 ? 'text-success' : 'text-danger'}">Rs ${netProfit.toFixed(2)}</h4>
                        <small class="text-muted">Net P&L</small>
                    </div>
                </div>
            `;
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
}

// Initialize the signals manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('signalsTable') || document.querySelector('.table')) {
        window.signalsManager = new SignalsManager();
    }
});