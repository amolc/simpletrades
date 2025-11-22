class ClientManager {
  constructor() {
    this.clients = [];
    this.currentFilter = 'all';
    this.init();
  }

  init() {
    this.loadClients();
    this.bindEvents();
    this.renderClients();
  }

  loadClients() {
    const stored = localStorage.getItem('clients');
    if (stored) {
      this.clients = JSON.parse(stored);
    } else {
      // Sample data for demonstration
      this.clients = [
        {
          id: 1,
          name: "John Smith",
          phone: "+1-555-0123",
          email: "john.smith@email.com",
          startDate: "2024-01-15",
          endDate: "2024-12-31",
          status: "active",
          segment: "stocks"
        },
        {
          id: 2,
          name: "Sarah Johnson",
          phone: "+1-555-0124",
          email: "sarah.j@email.com",
          startDate: "2024-02-01",
          endDate: "",
          status: "active",
          segment: "fno"
        },
        {
          id: 3,
          name: "Michael Chen",
          phone: "+1-555-0125",
          email: "m.chen@email.com",
          startDate: "2024-01-20",
          endDate: "2024-06-30",
          status: "inactive",
          segment: "index"
        },
        {
          id: 4,
          name: "Emily Davis",
          phone: "+1-555-0126",
          email: "emily.davis@email.com",
          startDate: "2024-03-01",
          endDate: "",
          status: "active",
          segment: "commodity"
        }
      ];
      this.saveClients();
    }
  }

  saveClients() {
    localStorage.setItem('clients', JSON.stringify(this.clients));
  }

  bindEvents() {
    // Filter buttons
    document.querySelectorAll('[data-segment]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const segment = e.target.closest('button').dataset.segment;
        this.setFilter(segment);
      });
    });

    // Add client button
    document.getElementById('addClientBtn').addEventListener('click', () => {
      this.showAddClientModal();
    });

    // Save client button
    document.getElementById('saveClientBtn').addEventListener('click', () => {
      this.saveNewClient();
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportClients();
    });

    // Form validation
    document.getElementById('addClientForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNewClient();
    });
  }

  setFilter(segment) {
    this.currentFilter = segment;
    
    // Update button states
    document.querySelectorAll('[data-segment]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-segment="${segment}"]`).classList.add('active');
    
    this.renderClients();
  }

  getFilteredClients() {
    if (this.currentFilter === 'all') {
      return this.clients;
    }
    return this.clients.filter(client => client.segment === this.currentFilter);
  }

  renderClients() {
    const tbody = document.getElementById('clientsBody');
    const emptyState = document.getElementById('emptyState');
    const filteredClients = this.getFilteredClients();

    // Update total count
    document.getElementById('totalClients').textContent = filteredClients.length;

    if (filteredClients.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = filteredClients.map(client => this.createClientRow(client)).join('');

    // Bind action events
    tbody.querySelectorAll('.edit-client').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('button').dataset.id);
        this.editClient(id);
      });
    });

    tbody.querySelectorAll('.delete-client').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('button').dataset.id);
        this.deleteClient(id);
      });
    });
  }

  createClientRow(client) {
    const statusClass = this.getStatusClass(client.status);
    const segmentIcon = this.getSegmentIcon(client.segment);
    
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="client-avatar me-3">
              ${client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="fw-semibold">${this.escapeHtml(client.name)}</div>
              <small class="text-muted">${segmentIcon} ${this.getSegmentName(client.segment)}</small>
            </div>
          </div>
        </td>
        <td>
          <a href="tel:${client.phone}" class="text-decoration-none">
            <i class="fas fa-phone text-success me-1"></i>
            ${this.escapeHtml(client.phone)}
          </a>
        </td>
        <td>
          <a href="mailto:${client.email}" class="text-decoration-none">
            <i class="fas fa-envelope text-primary me-1"></i>
            ${this.escapeHtml(client.email)}
          </a>
        </td>
        <td><i class="fas fa-calendar text-info me-1"></i>${this.formatDate(client.startDate)}</td>
        <td>${client.endDate ? `<i class="fas fa-calendar-times text-warning me-1"></i>${this.formatDate(client.endDate)}` : '<span class="text-muted">Active</span>'}</td>
        <td><span class="badge ${statusClass}">${this.escapeHtml(client.status.charAt(0).toUpperCase() + client.status.slice(1))}</span></td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary edit-client" data-id="${client.id}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger delete-client" data-id="${client.id}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  getStatusClass(status) {
    const classes = {
      'active': 'bg-success',
      'inactive': 'bg-secondary',
      'pending': 'bg-warning text-dark',
      'suspended': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  getSegmentIcon(segment) {
    const icons = {
      'stocks': '<i class="fas fa-chart-bar text-primary"></i>',
      'fno': '<i class="fas fa-contract text-warning"></i>',
      'index': '<i class="fas fa-chart-area text-info"></i>',
      'commodity': '<i class="fas fa-coins text-success"></i>'
    };
    return icons[segment] || '<i class="fas fa-chart-line text-secondary"></i>';
  }

  getSegmentName(segment) {
    const names = {
      'stocks': 'Stocks',
      'fno': 'F&O',
      'index': 'Index',
      'commodity': 'Commodity'
    };
    return names[segment] || 'Unknown';
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  showAddClientModal() {
    const modal = new bootstrap.Modal(document.getElementById('addClientModal'));
    document.getElementById('addClientForm').reset();
    modal.show();
  }

  saveNewClient() {
    const form = document.getElementById('addClientForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const client = {
      id: Date.now(),
      name: document.getElementById('clientName').value.trim(),
      phone: document.getElementById('clientPhone').value.trim(),
      email: document.getElementById('clientEmail').value.trim(),
      segment: document.getElementById('clientSegment').value,
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      status: document.getElementById('clientStatus').value
    };

    this.clients.push(client);
    this.saveClients();
    this.renderClients();

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('addClientModal')).hide();
    
    // Show success message
    this.showToast('Client added successfully!', 'success');
  }

  editClient(id) {
    const client = this.clients.find(c => c.id === id);
    if (!client) return;

    // Populate form with client data
    document.getElementById('clientName').value = client.name;
    document.getElementById('clientPhone').value = client.phone;
    document.getElementById('clientEmail').value = client.email;
    document.getElementById('clientSegment').value = client.segment;
    document.getElementById('startDate').value = client.startDate;
    document.getElementById('endDate').value = client.endDate;
    document.getElementById('clientStatus').value = client.status;

    // Change modal title and button
    document.querySelector('#addClientModal .modal-title').innerHTML = '<i class="fas fa-user-edit me-2"></i>Edit Client';
    document.getElementById('saveClientBtn').textContent = 'Update Client';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addClientModal'));
    modal.show();

    // Update save handler
    document.getElementById('saveClientBtn').onclick = () => {
      this.updateClient(id);
    };
  }

  updateClient(id) {
    const clientIndex = this.clients.findIndex(c => c.id === id);
    if (clientIndex === -1) return;

    const form = document.getElementById('addClientForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    this.clients[clientIndex] = {
      ...this.clients[clientIndex],
      name: document.getElementById('clientName').value.trim(),
      phone: document.getElementById('clientPhone').value.trim(),
      email: document.getElementById('clientEmail').value.trim(),
      segment: document.getElementById('clientSegment').value,
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      status: document.getElementById('clientStatus').value
    };

    this.saveClients();
    this.renderClients();

    // Reset modal
    bootstrap.Modal.getInstance(document.getElementById('addClientModal')).hide();
    this.resetModal();
    
    this.showToast('Client updated successfully!', 'success');
  }

  deleteClient(id) {
    if (confirm('Are you sure you want to delete this client?')) {
      this.clients = this.clients.filter(c => c.id !== id);
      this.saveClients();
      this.renderClients();
      this.showToast('Client deleted successfully!', 'success');
    }
  }

  exportClients() {
    const filteredClients = this.getFilteredClients();
    const csv = this.convertToCSV(filteredClients);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_${this.currentFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.showToast('Clients exported successfully!', 'success');
  }

  convertToCSV(clients) {
    const headers = ['Name', 'Phone', 'Email', 'Start Date', 'End Date', 'Status', 'Segment'];
    const rows = clients.map(client => [
      client.name,
      client.phone,
      client.email,
      client.startDate,
      client.endDate || 'Active',
      client.status,
      this.getSegmentName(client.segment)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  resetModal() {
    document.querySelector('#addClientModal .modal-title').innerHTML = '<i class="fas fa-user-plus me-2"></i>Add New Client';
    document.getElementById('saveClientBtn').textContent = 'Add Client';
    document.getElementById('saveClientBtn').onclick = () => {
      this.saveNewClient();
    };
  }

  showToast(message, type = 'info') {
    // Create toast element
    const toastHtml = `
      <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;
    
    // Add to toast container or create one
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
      document.body.appendChild(toastContainer);
    }
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toast = new bootstrap.Toast(toastContainer.lastElementChild);
    toast.show();
    
    // Remove after hiding
    toastContainer.lastElementChild.addEventListener('hidden.bs.toast', function() {
      this.remove();
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ClientManager();
});