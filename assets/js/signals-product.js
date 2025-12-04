// Product-specific Signals Management
class ProductSignalsManager {
    constructor(productName) {
        console.log('ProductSignalsManager constructor called with:', productName);
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
        console.log('ProductSignalsManager init() called');
        this.bindEvents();
        this.setupFilters();
        // Signals are already loaded via server-side rendering
        this.loadSignalsFromTable();
    }

    bindEvents() {
        console.log('Setting up event listeners...');
        
        // Filter events
        const statusFilter = document.getElementById('statusFilter');
        const symbolFilter = document.getElementById('symbolFilter');
        const dateFilter = document.getElementById('dateFilter');
        const resetFilters = document.getElementById('resetFilters');
        
        console.log('Filter elements found:', { 
            statusFilter: !!statusFilter, 
            symbolFilter: !!symbolFilter, 
            dateFilter: !!dateFilter, 
            resetFilters: !!resetFilters 
        });
        
        statusFilter?.addEventListener('change', (e) => this.applyFilter('status', e.target.value));
        symbolFilter?.addEventListener('input', (e) => this.applyFilter('symbol', e.target.value));
        dateFilter?.addEventListener('change', (e) => this.applyFilter('date', e.target.value));
        resetFilters?.addEventListener('click', () => this.resetFilters());
        
        // Signal action events (delegated to handle dynamically added elements)
        document.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;
             
            if (action === 'edit-signal') {
                const signalId = e.target.dataset.id;
                this.editSignal(signalId);
            } else if (action === 'delete-signal') {
                const signalId = e.target.dataset.id;
                this.deleteSignal(signalId);
            } else if (action === 'close-signal') {
                const signalId = e.target.dataset.id;
                this.showCloseModal(signalId);
            } else if (action === 'edit-watchlist') {
                const watchlistId = e.target.dataset.wid;
                this.editWatchlist(watchlistId);
            } else if (action === 'delete-watchlist') {
                const watchlistId = e.target.dataset.wid;
                this.deleteWatchlist(watchlistId);
            }
        });

        // Watchlist events
        const addWatchlistBtn = document.getElementById('addWatchlistBtn');
        const saveWatchlistBtn = document.getElementById('saveWatchlistBtn');
        const watchlistForm = document.getElementById('watchlistForm');
        
        console.log('Watchlist elements found:', { 
            addWatchlistBtn: !!addWatchlistBtn, 
            saveWatchlistBtn: !!saveWatchlistBtn, 
            watchlistForm: !!watchlistForm 
        });
        
        if (addWatchlistBtn) {
            addWatchlistBtn.addEventListener('click', (e) => {
                console.log('Add to Watchlist button clicked', e);
                alert('Add to Watchlist button clicked!'); // Temporary debug alert
                e.preventDefault();
                this.showWatchlistModal();
            });
        } else {
            console.error('Add to Watchlist button not found!');
            // Use event delegation as fallback
            document.addEventListener('click', (e) => {
                if (e.target.id === 'addWatchlistBtn' || e.target.closest('#addWatchlistBtn')) {
                    console.log('Add to Watchlist button clicked via delegation', e);
                    alert('Add to Watchlist button clicked via delegation!'); // Temporary debug alert
                    e.preventDefault();
                    this.showWatchlistModal();
                }
            });
        }
        
        if (saveWatchlistBtn) {
            saveWatchlistBtn.addEventListener('click', (e) => {
                console.log('Save Watchlist button clicked', e);
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
    }

    setupFilters() {
        // Add filter controls to the page if they don't exist
        const filterContainer = document.querySelector('#signalsTable').parentElement;
        if (filterContainer && !document.getElementById('signalFilters')) {
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
            filterContainer.insertAdjacentHTML('beforebegin', filterHTML);
        }
    }

    loadSignalsFromTable() {
        // Load signals from the existing table rows
        const rows = document.querySelectorAll('#signalsTable tbody tr');
        this.signals = [];
        
        rows.forEach(row => {
            if (row.dataset.signalId) {
                const cells = row.cells;
                this.signals.push({
                    id: row.dataset.signalId,
                    symbol: cells[0].textContent.trim(),
                    signalType: cells[1].textContent.trim(),
                    entry: parseFloat(cells[2].textContent.replace('₹', '')),
                    target: parseFloat(cells[3].textContent.replace('₹', '')),
                    stopLoss: parseFloat(cells[4].textContent.replace('₹', '')),
                    entryDateTime: cells[5].textContent.trim(),
                    exitPrice: cells[6].textContent.trim() !== '-' ? parseFloat(cells[6].textContent.replace('₹', '')) : null,
                    exitDateTime: cells[7].textContent.trim(),
                    status: this.getStatusFromBadge(cells[8].innerHTML),
                    profitLoss: this.getProfitLossFromCell(cells[9]),
                    createdAt: cells[10].textContent.trim()
                });
            }
        });
        
        this.filteredSignals = [...this.signals];
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
        const value = parseFloat(text.replace(/[₹+-]/g, ''));
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
        const tbody = document.querySelector('#signalsTable tbody');
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
        alert('Edit functionality will be implemented soon. For now, you can close and recreate the signal if needed.');
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
        console.log('showWatchlistModal called with:', watchlistId);
        const modalElement = document.getElementById('watchlistModal');
        if (!modalElement) {
            console.error('Watchlist modal element not found');
            alert('Error: Watchlist modal not found!');
            return;
        }
        
        console.log('Modal element found:', modalElement);
        
        // Get existing modal instance or create new one
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            console.log('Creating new modal instance');
            modal = new bootstrap.Modal(modalElement);
        } else {
            console.log('Using existing modal instance');
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
        
        console.log('Showing modal...');
        modal.show();
        alert('Modal should be showing now!'); // Temporary debug alert
    }

    async loadWatchlistItem(watchlistId) {
        try {
            const response = await fetch(`/api/watchlist/${watchlistId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const item = result.data;
                document.getElementById('watchlistId').value = item.id;
                document.getElementById('watchlistStockName').value = item.stockName;
                document.getElementById('watchlistMarket').value = item.market;
                document.getElementById('watchlistCurrentPrice').value = item.currentPrice;
                document.getElementById('watchlistAlertPrice').value = item.alertPrice;
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
        const stockName = document.getElementById('watchlistStockName').value.trim();
        const market = document.getElementById('watchlistMarket').value.trim();
        const currentPrice = parseFloat(document.getElementById('watchlistCurrentPrice').value);
        const alertPrice = parseFloat(document.getElementById('watchlistAlertPrice').value);

        if (!stockName || !market || isNaN(currentPrice) || isNaN(alertPrice)) {
            this.showError('Please fill in all required fields');
            return;
        }

        const watchlistData = {
            stockName,
            market,
            currentPrice,
            alertPrice,
            productName: this.productName
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
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
                setTimeout(() => location.reload(), 1500);
            } else {
                this.showError(result.message || 'Failed to save watchlist item');
            }
        } catch (error) {
            console.error('Error saving watchlist item:', error);
            this.showError('Error saving watchlist item');
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
    
    // Test function to manually trigger watchlist modal
    testWatchlistModal() {
        console.log('Testing watchlist modal manually...');
        this.showWatchlistModal();
    }
}

// Make test function available globally for debugging
window.testWatchlistModal = function() {
    if (window.productSignalsManager) {
        window.productSignalsManager.testWatchlistModal();
    } else {
        console.error('ProductSignalsManager not initialized');
    }
};

// Initialize the product signals manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const signalsTable = document.getElementById('signalsTable');
    const pageTitle = document.title;
    
    console.log('DOM Content Loaded - Checking for Product Signals page...');
    console.log('Page title:', pageTitle);
    console.log('Signals table found:', !!signalsTable);
    
    // Check if we're on a product signals page
    if (signalsTable && pageTitle.includes('Product Signals')) {
        // Extract product name from title (format: "Product Signals - ProductName")
        const productName = pageTitle.replace('Product Signals - ', '');
        console.log('Initializing ProductSignalsManager for:', productName);
        window.productSignalsManager = new ProductSignalsManager(productName);
    } else {
        console.log('ProductSignalsManager not initialized - conditions not met');
        
        // Try again after a short delay in case elements are loaded dynamically
        setTimeout(() => {
            console.log('Retrying initialization after delay...');
            const signalsTable = document.getElementById('signalsTable');
            const pageTitle = document.title;
            
            if (signalsTable && pageTitle.includes('Product Signals')) {
                const productName = pageTitle.replace('Product Signals - ', '');
                console.log('Initializing ProductSignalsManager for (delayed):', productName);
                window.productSignalsManager = new ProductSignalsManager(productName);
            }
        }, 1000);
    }
});