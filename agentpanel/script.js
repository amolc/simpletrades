// Professional Signal Management JavaScript

class SignalManager {
  constructor() {
    this.form = document.getElementById('signalForm');
    this.bodyEl = document.getElementById('signalsBody');
    this.totalEl = document.getElementById('total');
    this.emptyState = document.getElementById('emptyState');
    this.exportBtn = document.getElementById('exportBtn');
    this.clearBtn = document.getElementById('clearBtn');
    
    this.init();
  }

  init() {
    this.loadSignals();
    this.bindEvents();
    this.updateCount();
    this.checkEmptyState();
  }

  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.exportBtn.addEventListener('click', () => this.exportSignals());
    this.clearBtn.addEventListener('click', () => this.clearAllSignals());
  }

  handleSubmit(e) {
    e.preventDefault();
    
    const signal = this.readForm();
    if (!this.validateSignal(signal)) return;

    this.addSignal(signal);
    this.saveSignal(signal);
    this.updateCount();
    this.checkEmptyState();
    this.form.reset();
    
    // Show success notification
    this.showNotification('Signal created successfully!', 'success');
  }

  readForm() {
    return {
      stock: document.getElementById('stock').value.trim().toUpperCase(),
      price: parseFloat(document.getElementById('price').value),
      target: parseFloat(document.getElementById('target').value),
      stop: parseFloat(document.getElementById('stop').value),
      type: document.getElementById('type').value,
      notes: document.getElementById('notes').value.trim(),
      time: new Date().toISOString(),
      id: Date.now().toString()
    };
  }

  validateSignal(signal) {
    if (!signal.stock) {
      this.showNotification('Please enter a stock symbol', 'error');
      return false;
    }
    
    if (!/^[A-Z]{1,5}$/.test(signal.stock)) {
      this.showNotification('Please enter a valid stock symbol (1-5 letters)', 'error');
      return false;
    }

    if (!signal.type) {
      this.showNotification('Please select a signal type', 'error');
      return false;
    }

    if (![signal.price, signal.target, signal.stop].every(Number.isFinite)) {
      this.showNotification('Please enter valid numbers for price, target, and stop loss', 'error');
      return false;
    }

    if (signal.target <= signal.price) {
      this.showNotification('Target price must be higher than entry price', 'error');
      return false;
    }

    if (signal.stop >= signal.price) {
      this.showNotification('Stop loss must be lower than entry price', 'error');
      return false;
    }

    return true;
  }

  addSignal(signal) {
    const row = this.createSignalRow(signal);
    this.bodyEl.prepend(row);
    
    // Add fade-in animation
    row.classList.add('fade-in');
  }

  createSignalRow(signal) {
    const tr = document.createElement('tr');
    const statusBadge = this.getStatusBadge(signal);
    
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <span class="badge bg-primary me-2">${signal.stock}</span>
          ${statusBadge}
        </div>
      </td>
      <td><span class="text-success fw-bold">$${signal.price.toFixed(2)}</span></td>
      <td><span class="text-info">$${signal.target.toFixed(2)}</span></td>
      <td><span class="text-warning">$${signal.stop.toFixed(2)}</span></td>
      <td>${this.getTypeIcon(signal.type)} ${this.getTypeName(signal.type)}</td>
      <td>
        ${signal.notes ? 
          `<div class="d-flex align-items-center">
            <i class="fas fa-sticky-note text-muted me-1"></i>
            <small class="text-muted" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(signal.notes)}">
              ${this.escapeHtml(signal.notes)}
            </small>
          </div>` : 
          '<small class="text-muted"><em>No notes</em></small>'
        }
      </td>
      <td>
        <small class="text-muted">
          <i class="fas fa-clock me-1"></i>
          ${this.formatTime(signal.time)}
        </small>
      </td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" onclick="signalManager.viewSignal('${signal.id}')" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="signalManager.deleteSignal('${signal.id}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    return tr;
  }

  calculateRiskReward(signal) {
    const risk = Math.abs(signal.price - signal.stop);
    const reward = Math.abs(signal.target - signal.price);
    return (reward / risk).toFixed(2);
  }

  getStatusBadge(signal) {
    // Simple status based on time (could be enhanced with real market data)
    const hoursSinceCreation = (Date.now() - new Date(signal.time).getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation < 1) {
      return '<span class="badge bg-success">New</span>';
    } else if (hoursSinceCreation < 24) {
      return '<span class="badge bg-warning">Active</span>';
    } else {
      return '<span class="badge bg-secondary">Expired</span>';
    }
  }

  saveSignal(signal) {
    const signals = this.getAllSignals();
    signals.push(signal);
    localStorage.setItem('signals', JSON.stringify(signals));
  }

  deleteSignal(id) {
    if (confirm('Are you sure you want to delete this signal?')) {
      const signals = this.getAllSignals().filter(s => s.id !== id);
      localStorage.setItem('signals', JSON.stringify(signals));
      
      // Remove row from table
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        row.remove();
      }
      
      this.updateCount();
      this.checkEmptyState();
      this.showNotification('Signal deleted successfully', 'info');
    }
  }

  viewSignal(id) {
    const signal = this.getAllSignals().find(s => s.id === id);
    if (signal) {
      const modal = this.createSignalModal(signal);
      document.body.appendChild(modal);
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      
      // Remove modal from DOM after it's hidden
      modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
      });
    }
  }

  createSignalModal(signal) {
    const riskReward = this.calculateRiskReward(signal);
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Signal Details - ${signal.stock}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Trade Parameters</h6>
                <table class="table table-sm">
                  <tr><td><strong>Entry Price:</strong></td><td>$${signal.price.toFixed(2)}</td></tr>
                  <tr><td><strong>Target Price:</strong></td><td>$${signal.target.toFixed(2)}</td></tr>
                  <tr><td><strong>Stop Loss:</strong></td><td>$${signal.stop.toFixed(2)}</td></tr>
                  <tr><td><strong>Type:</strong></td><td>${this.getTypeIcon(signal.type)} ${this.getTypeName(signal.type)}</td></tr>
                  <tr><td><strong>Risk/Reward:</strong></td><td>1:${riskReward}</td></tr>
                </table>
              </div>
              <div class="col-md-6">
                <h6>Trade Analysis</h6>
                <table class="table table-sm">
                  <tr><td><strong>Potential Profit:</strong></td><td class="text-success">$${(signal.target - signal.price).toFixed(2)}</td></tr>
                  <tr><td><strong>Potential Loss:</strong></td><td class="text-danger">$${(signal.price - signal.stop).toFixed(2)}</td></tr>
                  <tr><td><strong>Created:</strong></td><td>${new Date(signal.time).toLocaleString()}</td></tr>
                </table>
              </div>
            </div>
            ${signal.notes ? `
              <div class="mt-3">
                <h6>Notes</h6>
                <div class="alert alert-info">${this.escapeHtml(signal.notes)}</div>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-danger" onclick="signalManager.deleteSignal('${signal.id}')" data-bs-dismiss="modal">
              <i class="fas fa-trash me-1"></i>Delete Signal
            </button>
          </div>
        </div>
      </div>
    `;
    return modal;
  }

  exportSignals() {
    const signals = this.getAllSignals();
    if (signals.length === 0) {
      this.showNotification('No signals to export', 'warning');
      return;
    }

    const csv = this.convertToCSV(signals);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `signals_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('Signals exported successfully!', 'success');
  }

  convertToCSV(signals) {
    const headers = ['Stock', 'Entry Price', 'Target', 'Stop Loss', 'Type', 'Notes', 'Created'];
    const rows = signals.map(signal => [
      signal.stock,
      signal.price.toFixed(2),
      signal.target.toFixed(2),
      signal.stop.toFixed(2),
      this.getTypeName(signal.type),
      `"${signal.notes.replace(/"/g, '""')}"`,
      new Date(signal.time).toLocaleString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  clearAllSignals() {
    if (confirm('Are you sure you want to clear all signals? This action cannot be undone.')) {
      localStorage.removeItem('signals');
      this.bodyEl.innerHTML = '';
      this.updateCount();
      this.checkEmptyState();
      this.showNotification('All signals cleared', 'info');
    }
  }

  loadSignals() {
    const signals = this.getAllSignals();
    signals.forEach(signal => this.addSignal(signal));
  }

  getAllSignals() {
    return JSON.parse(localStorage.getItem('signals') || '[]');
  }

  updateCount() {
    this.totalEl.textContent = this.getAllSignals().length;
  }

  checkEmptyState() {
    const hasSignals = this.getAllSignals().length > 0;
    this.emptyState.style.display = hasSignals ? 'none' : 'block';
  }

  formatTime(timeString) {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  showNotification(message, type = 'info') {
    const alertClass = {
      success: 'alert-success',
      error: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info'
    }[type] || 'alert-info';

    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getTypeIcon(type) {
    const icons = {
      'stocks': '<i class="fas fa-chart-bar text-primary"></i>',
      'fno': '<i class="fas fa-contract text-warning"></i>',
      'index': '<i class="fas fa-chart-area text-info"></i>',
      'commodity': '<i class="fas fa-coins text-success"></i>'
    };
    return icons[type] || '<i class="fas fa-chart-line text-secondary"></i>';
  }

  getTypeName(type) {
    const names = {
      'stocks': 'Stocks',
      'fno': 'F&O',
      'index': 'Index',
      'commodity': 'Commodity'
    };
    return names[type] || 'Unknown';
  }
}

// Initialize the application
const signalManager = new SignalManager();

// Add some keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + N for new signal
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    document.getElementById('stock').focus();
  }
  
  // Escape to reset form
  if (e.key === 'Escape') {
    document.getElementById('signalForm').reset();
  }
});