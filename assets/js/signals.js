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
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSignals();
        this.setupFilters();
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
        const typeBadge = this.getTypeBadge(signal.type);
        const profitLossColor = signal.profitLoss > 0 ? 'text-success' : signal.profitLoss < 0 ? 'text-danger' : 'text-muted';
        const profitLossIcon = signal.profitLoss > 0 ? 'fa-arrow-up' : signal.profitLoss < 0 ? 'fa-arrow-down' : 'fa-minus';
        
        return `
            <tr data-signal-id="${signal.id}">
                <td><strong>${signal.stock}</strong><br><small class="text-muted">${signal.symbol}</small></td>
                <td>Rs ${signal.entry.toFixed(2)}</td>
                <td>Rs ${signal.target.toFixed(2)}</td>
                <td>Rs ${signal.stopLoss.toFixed(2)}</td>
                <td>${typeBadge}</td>
                <td>
                    <small class="text-muted" title="${signal.notes}">
                        ${signal.notes.length > 30 ? signal.notes.substring(0, 30) + '...' : signal.notes}
                    </small>
                </td>
                <td>
                    <small>${new Date(signal.time).toLocaleString()}</small>
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
            'ACTIVE': '<span class="badge bg-success">Active</span>',
            'CLOSED': '<span class="badge bg-secondary">Closed</span>',
            'PENDING': '<span class="badge bg-warning text-dark">Pending</span>'
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
                (!this.currentFilters.type || signal.type === this.currentFilters.type) &&
                (!this.currentFilters.stock || 
                    signal.stock.toLowerCase().includes(this.currentFilters.stock.toLowerCase()) ||
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

            const exitPrice = prompt(`Enter exit price for ${signal.stock}:`, signal.target);
            if (!exitPrice || isNaN(exitPrice)) return;

            const profitLoss = signal.type === 'BUY' 
                ? parseFloat(exitPrice) - signal.entry 
                : signal.entry - parseFloat(exitPrice);

            const response = await fetch(`/api/signals/${signalId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'CLOSED',
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
            stock: document.getElementById('newStock').value.trim().toUpperCase(),
            type: document.getElementById('newType').value,
            entry: parseFloat(document.getElementById('newEntry').value),
            target: parseFloat(document.getElementById('newTarget').value),
            stopLoss: parseFloat(document.getElementById('newStopLoss').value),
            notes: document.getElementById('newNotes').value.trim(),
            status: 'PENDING'
        };

        if (!formData.stock || !formData.entry || !formData.target || !formData.stopLoss) {
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
        const stats = signals.getSignalStats();
        // Update stats display if exists
        const statsContainer = document.getElementById('signalStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-2 text-center">
                        <h4 class="text-primary">${stats.totalSignals}</h4>
                        <small class="text-muted">Total</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-success">${stats.activeSignals}</h4>
                        <small class="text-muted">Active</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-warning">${stats.pendingSignals}</h4>
                        <small class="text-muted">Pending</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-info">${stats.winRate}%</h4>
                        <small class="text-muted">Win Rate</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-success">Rs ${stats.totalProfit.toFixed(2)}</h4>
                        <small class="text-muted">Profit</small>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-danger">Rs ${stats.totalLoss.toFixed(2)}</h4>
                        <small class="text-muted">Loss</small>
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