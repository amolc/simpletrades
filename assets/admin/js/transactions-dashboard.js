document.addEventListener('DOMContentLoaded', () => {
  // Filter elements
  const filterForm = document.getElementById('filterForm');
  const startDateFilter = document.getElementById('startDateFilter');
  const endDateFilter = document.getElementById('endDateFilter');
  const customerFilter = document.getElementById('customerFilter');
  const statusFilter = document.getElementById('statusFilter');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const searchInput = document.getElementById('searchInput');
  
  // Pagination elements
  const pagination = document.getElementById('pagination');
  const itemsPerPage = 10;
  let currentPage = 1;
  
  // Summary elements
  const metricTotalTransactions = document.getElementById('metricTotalTransactions');
  const metricTotalRevenue = document.getElementById('metricTotalRevenue');
  const metricSuccessRate = document.getElementById('metricSuccessRate');
  const metricAvgTransaction = document.getElementById('metricAvgTransaction');
  
  // Table elements
  const transactionsBody = document.getElementById('transactionsBody');
  const transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));

  let allTransactions = []; // Store all transactions for filtering and pagination
  
  // Function to render transactions into the table
  function renderTransactions(transactionsToRender) {
    transactionsBody.innerHTML = ''; // Clear existing rows

    if (transactionsToRender.length === 0) {
      transactionsBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">
            <i class="fas fa-info-circle fa-2x mb-2"></i><br>
            No transactions found.
          </td>
        </tr>
      `;
      updateSummaryMetrics([]);
      renderPaginationControls(0, 0);
      return;
    }

    transactionsToRender.forEach(transaction => {
      const row = document.createElement('tr');
      row.dataset.customerId = transaction.User ? transaction.User.id : ''; // For customer filtering
      row.innerHTML = `
        <td>${transaction.id}</td>
        <td>${new Date(transaction.createdAt).toLocaleString()}</td>
        <td>${transaction.User ? transaction.User.fullName : 'N/A'}</td>
        <td>Rs ${transaction.amount ? parseFloat(transaction.amount).toFixed(2) : '0.00'}</td>
        <td>${transaction.paymentMethod || 'N/A'}</td>
        <td><span class="badge bg-${transaction.paymentStatus === 'completed' ? 'success' : transaction.paymentStatus === 'pending' ? 'warning' : 'danger'}">${transaction.paymentStatus}</span></td>
        <td>
          <button class="btn btn-sm btn-info view-transaction-btn" data-id="${transaction.id}" data-action="view" data-bs-toggle="modal" data-bs-target="#transactionModal">View</button>
          ${transaction.paymentStatus === 'completed' ? `<button class="btn btn-sm btn-warning refund-transaction-btn" data-id="${transaction.id}" data-action="refund">Refund</button>` : ''}
        </td>
      `;
                transactionsBody.appendChild(row);
});
    updateSummaryMetrics(transactionsToRender);
    updatePagination(Array.from(transactionsBody.children).filter(child => child.tagName === 'TR'));
  }

  // Function to update transaction status via API
  async function updateTransactionStatus(transactionId, newStatus) {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Transaction status updated successfully!');
      } else {
        alert(`Error updating status: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating transaction status:', error);
      alert('Failed to update transaction status.');
    }
  }

  // Function to load transactions from the API
  async function loadTransactions() {
    try {
      transactionsBody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading transactions...</span></div><p class="mt-2 text-muted">Loading transactions...</p></td></tr>';
      
      const response = await fetch('/api/transactions');
      const result = await response.json();

      if (result.success) {
        allTransactions = result.data.transactions;
        renderTransactions(allTransactions);
      } else {
        transactionsBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading transactions: ${result.message || 'Unknown error'}</td></tr>`;
        updateSummaryMetrics([]);
        renderPaginationControls(0, 0);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      transactionsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Network error. Unable to load transactions.</td></tr>';
      updateSummaryMetrics([]);
      renderPaginationControls(0, 0);
    }
  }
  
  // Load customers for filter dropdown
  async function loadCustomers() {
    try {
      // Show loading state in customer filter
      customerFilter.innerHTML = '<option value="">Loading customers...</option>';
      customerFilter.disabled = true;
      
      const response = await fetch('/api/users?userType=customer');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }    
      const data = await response.json();
      
      if (data.success) {
        customerFilter.innerHTML = '<option value="">All Customers</option>';
        customerFilter.disabled = false;
        data.data.forEach(customer => {
          const option = document.createElement('option');
          option.value = customer.id;
          option.textContent = `${customer.name} (${customer.email})`;
          customerFilter.appendChild(option);
        });
      } else {
        console.warn('API returned success: false for customers load');
        customerFilter.innerHTML = '<option value="">Error loading customers</option>';
        customerFilter.disabled = false;
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      customerFilter.innerHTML = '<option value="">Error loading customers</option>';
      customerFilter.disabled = false;
      
      // Show user-friendly error message
      const errorAlert = document.createElement('div');
      errorAlert.className = 'alert alert-warning alert-sm position-fixed top-0 start-50 translate-middle-x mt-3';
      errorAlert.style.zIndex = '9999';
      errorAlert.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        Error loading customer data. Some filters may not work properly.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      document.body.appendChild(errorAlert);
      
      // Remove error message after 5 seconds
      setTimeout(() => {
        if (errorAlert.parentNode) {
          errorAlert.parentNode.removeChild(errorAlert);
        }
      }, 5000);
    }
  }
  
  // Calculate and update summary metrics
  function updateSummaryMetrics(transactions) {
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const completedTransactions = transactions.filter(t => t.paymentStatus === 'completed').length;
    const successRate = totalTransactions > 0 ? Math.round((completedTransactions / totalTransactions) * 100) : 0;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    if (metricTotalTransactions) {
      metricTotalTransactions.textContent = totalTransactions;
    }
    if (metricTotalRevenue) {
      metricTotalRevenue.textContent = `Rs ${totalRevenue.toFixed(2)}`;
    }
    if (metricSuccessRate) {
      metricSuccessRate.textContent = `${successRate}%`;
    }
    if (metricAvgTransaction) {
      metricAvgTransaction.textContent = `Rs ${avgTransaction.toFixed(2)}`;
    }
  }
  
  // Filter transactions based on current filter values
  function filterTransactions() {
    const startDate = startDateFilter.value;
    const endDate = endDateFilter.value;
    const customerId = customerFilter.value;
    const status = statusFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    // Show loading state
    const loadingRow = document.createElement('tr');
    loadingRow.id = 'filteringRow';
    loadingRow.innerHTML = `
      <td colspan="8" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Filtering...</span>
        </div>
        <p class="mt-2 text-muted">Filtering transactions...</p>
      </td>
    `;
    
    // Hide current rows and show loading
    const rows = transactionsBody.querySelectorAll('tr:not(#filteringRow)');
    rows.forEach(row => row.style.display = 'none');
    
    // Remove existing loading row if any
    const existingLoadingRow = document.getElementById('filteringRow');
    if (existingLoadingRow) {
      existingLoadingRow.remove();
    }
    
    // Add loading row
    transactionsBody.appendChild(loadingRow);
    
    // Process filtering after a short delay to show loading state
    setTimeout(() => {
      // Remove loading row
      loadingRow.remove();
      
      // Continue with actual filtering
      processFilterResults(startDate, endDate, customerId, status, searchTerm);
    }, 300);
  }
  
  // Process filter results
  function processFilterResults(startDate, endDate, customerId, status, searchTerm) {
    const rows = transactionsBody.querySelectorAll('tr:not(#filteringRow)');
    let visibleCount = 0;
    const visibleTransactions = [];
    const visibleRows = [];
    
    rows.forEach(row => {
      const transactionId = row.querySelector('td:first-child').textContent.toLowerCase();
      const dateText = row.querySelector('td:nth-child(2)').textContent;
      const customerName = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
      const amount = row.querySelector('td:nth-child(4)').textContent;
      const statusBadge = row.querySelector('td:nth-child(6) span').textContent.toLowerCase();
      
      let showRow = true;
      
      // Date range filter
      if (startDate || endDate) {
        const transactionDate = new Date(dateText);
        if (startDate && transactionDate < new Date(startDate)) showRow = false;
        if (endDate && transactionDate > new Date(endDate)) showRow = false;
      }
      
      // Customer filter
      if (customerId) {
        const rowCustomerId = row.dataset.customerId;
        if (rowCustomerId !== customerId) showRow = false;
      }
      
      // Status filter
      if (status && statusBadge !== status.toLowerCase()) showRow = false;
      
      // Search filter
      if (searchTerm && !transactionId.includes(searchTerm) && !customerName.includes(searchTerm)) {
        showRow = false;
      }
      
      if (showRow) {
        row.style.display = '';
        visibleRows.push(row);
        visibleCount++;
        
        // Extract transaction data for summary
        const amountMatch = amount.match(/[\d,]+\.?\d*/);
        const amountValue = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;
        visibleTransactions.push({
          amount: amountValue,
          paymentStatus: statusBadge
        });
      } else {
        row.style.display = 'none';
      }
    });
    
    // Update pagination with filtered results
    updatePagination(visibleRows);
    
    // Update summary metrics with filtered data
    updateSummaryMetrics(visibleTransactions);
    
    // Show/hide no results message
    const noResultsRow = document.getElementById('noResultsRow');
    if (visibleCount === 0) {
      if (!noResultsRow) {
        const noResultsHtml = `
          <tr id="noResultsRow">
            <td colspan="8" class="text-center text-muted py-4">
              <i class="fas fa-search fa-2x mb-2"></i><br>
              No transactions found matching your filters.
            </td>
          </tr>
        `;
        transactionsBody.insertAdjacentHTML('beforeend', noResultsHtml);
      }
    } else if (noResultsRow) {
      noResultsRow.remove();
    }
  }
  
  // Date range validation
  function validateDateRange() {
    const startDate = startDateFilter.value;
    const endDate = endDateFilter.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        // Show error
        startDateFilter.classList.add('is-invalid');
        endDateFilter.classList.add('is-invalid');
        
        // Create or update error alert
        let errorAlert = document.getElementById('dateRangeError');
        if (!errorAlert) {
          errorAlert = document.createElement('div');
          errorAlert.id = 'dateRangeError';
          errorAlert.className = 'alert alert-warning alert-sm mt-2';
          errorAlert.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Start date cannot be after end date';
          
          // Insert after the filter form
          const formRow = document.querySelector('#filterForm .row');
          if (formRow) {
            formRow.parentNode.insertBefore(errorAlert, formRow.nextSibling);
          }
        }
        return false;
      } else {
        // Clear error states
        startDateFilter.classList.remove('is-invalid');
        endDateFilter.classList.remove('is-invalid');
        
        // Remove error alert
        const errorAlert = document.getElementById('dateRangeError');
        if (errorAlert) {
          errorAlert.remove();
        }
        return true;
      }
    }
    return true;
  }
  
  // Apply filters
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Validate date range
      if (!validateDateRange()) {
        return;
      }
      
      filterTransactions();
    });
  }
  
  // Clear validation states when dates change
  startDateFilter.addEventListener('change', () => {
    startDateFilter.classList.remove('is-invalid');
    validateDateRange();
  });
  
  endDateFilter.addEventListener('change', () => {
    endDateFilter.classList.remove('is-invalid');
    validateDateRange();
  });
  
  // Clear filters
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      startDateFilter.value = '';
      endDateFilter.value = '';
      customerFilter.value = '';
      statusFilter.value = '';
      searchInput.value = '';
      currentPage = 1; // Reset to first page
      filterTransactions();
    });
  }
  
  // Update pagination
  function updatePagination(visibleRows) {
    const totalItems = visibleRows.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Reset to first page if current page is invalid
    if (currentPage > totalPages) {
      currentPage = 1;
    }
    
    // Show/hide rows based on current page
    visibleRows.forEach((row, index) => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      
      if (index >= startIndex && index < endIndex) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
    
    // Update pagination controls
    renderPaginationControls(totalPages, totalItems);
  }
  
  // Render pagination controls
  function renderPaginationControls(totalPages, totalItems) {
    pagination.innerHTML = '';
    
    if (totalPages <= 1) {
      return; // No pagination needed
    }
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>`;
    pagination.appendChild(prevLi);
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis
    if (startPage > 1) {
      const firstLi = document.createElement('li');
      firstLi.className = `page-item ${currentPage === 1 ? 'active' : ''}`;
      firstLi.innerHTML = `<a class="page-link" href="#" data-page="1">1</a>`;
      pagination.appendChild(firstLi);
      
      if (startPage > 2) {
        const ellipsisLi = document.createElement('li');
        ellipsisLi.className = 'page-item disabled';
        ellipsisLi.innerHTML = '<span class="page-link">...</span>';
        pagination.appendChild(ellipsisLi);
      }
    }
    
    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
      const pageLi = document.createElement('li');
      pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
      pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      pagination.appendChild(pageLi);
    }
    
    // Last page and ellipsis
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsisLi = document.createElement('li');
        ellipsisLi.className = 'page-item disabled';
        ellipsisLi.innerHTML = '<span class="page-link">...</span>';
        pagination.appendChild(ellipsisLi);
      }
      
      const lastLi = document.createElement('li');
      lastLi.className = `page-item ${currentPage === totalPages ? 'active' : ''}`;
      lastLi.innerHTML = `<a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>`;
      pagination.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>`;
    pagination.appendChild(nextLi);
    
    // Page info
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    const infoLi = document.createElement('li');
    infoLi.className = 'page-item disabled';
    infoLi.innerHTML = `<span class="page-link">Showing ${startItem}-${endItem} of ${totalItems}</span>`;
    pagination.appendChild(infoLi);
    
    // Add click event listeners
    pagination.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(e.target.dataset.page);
        if (page && page !== currentPage && page >= 1 && page <= totalPages) {
          currentPage = page;
          filterTransactions();
        }
      });
    });
  }
  
  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1; // Reset to first page
      filterTransactions();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentPage = 1; // Reset to first page
      filterTransactions();
    });
  }
  
  // Export to CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      const originalText = exportCsvBtn.innerHTML;
      
      try {
        // Show loading state
        exportCsvBtn.disabled = true;
        exportCsvBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Exporting...';
        
        // Build query parameters from current filters
        const params = new URLSearchParams();
        if (startDateFilter.value) params.append('startDate', startDateFilter.value);
        if (endDateFilter.value) params.append('endDate', endDateFilter.value);
        if (customerFilter.value) params.append('userId', customerFilter.value);
        if (statusFilter.value) params.append('paymentStatus', statusFilter.value);
        
        const response = await fetch(`/api/transactions/export?${params.toString()}`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } else {
          alert('Error exporting transactions. Please try again.');
        }
      } catch (error) {
        console.error('Error exporting transactions:', error);
        alert('Error exporting transactions. Please try again.');
      } finally {
        // Restore button state
        exportCsvBtn.disabled = false;
        exportCsvBtn.innerHTML = originalText;
      }
    });
  }
  
  // Export to Excel
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', async () => {
      const originalText = exportExcelBtn.innerHTML;
      
      try {
        // Show loading state
        exportExcelBtn.disabled = true;
        exportExcelBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Exporting...';
        
        // Build query parameters from current filters
        const params = new URLSearchParams();
        if (startDateFilter.value) params.append('startDate', startDateFilter.value);
        if (endDateFilter.value) params.append('endDate', endDateFilter.value);
        if (customerFilter.value) params.append('userId', customerFilter.value);
        if (statusFilter.value) params.append('paymentStatus', statusFilter.value);
        params.append('format', 'excel'); // Specify excel format
        
        const response = await fetch(`/api/transactions/export?${params.toString()}`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } else {
          alert('Error exporting transactions. Please try again.');
        }
      } catch (error) {
        console.error('Error exporting transactions:', error);
        alert('Error exporting transactions. Please try again.');
      } finally {
        // Restore button state
        exportExcelBtn.disabled = false;
        exportExcelBtn.innerHTML = originalText;
      }
    });
  }
  
  // View transaction modal
  transactionsBody.addEventListener('click', async (e) => {
    const viewButton = e.target.closest('.view-transaction-btn');
    if (viewButton) {
      const transactionId = viewButton.dataset.id;
      
      try {
        const response = await fetch(`/api/transactions/${transactionId}`);
        const result = await response.json();
        
        if (result.success) {
          const transaction = result.data;
          
          // Populate modal fields dynamically
          const modalBody = document.getElementById('transactionModalBody');
          modalBody.innerHTML = `
            <div class="row">
              <div class="col-md-6">
                <p><strong>Transaction ID:</strong> ${transaction.id}</p>
                <p><strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleString()}</p>
                <p><strong>Customer Name:</strong> ${transaction.customer ? transaction.customer.fullName : 'N/A'}</p>
                <p><strong>Customer Email:</strong> ${transaction.customer ? transaction.customer.email : 'N/A'}</p>
                <p><strong>Amount:</strong> Rs ${transaction.amount ? parseFloat(transaction.amount).toFixed(2) : '0.00'}</p>
                <p><strong>Currency:</strong> ${transaction.currency || 'N/A'}</p>
              </div>
              <div class="col-md-6">
                <p><strong>Payment Method:</strong> ${transaction.paymentMethod || 'N/A'}</p>
                <p><strong>Payment Status:</strong>
                   <select class="form-select form-select-sm d-inline-block w-auto" id="modalPaymentStatus">
                     <option value="pending" ${transaction.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                     <option value="completed" ${transaction.paymentStatus === 'completed' ? 'selected' : ''}>Completed</option>
                     <option value="failed" ${transaction.paymentStatus === 'failed' ? 'selected' : ''}>Failed</option>
                     <option value="refunded" ${transaction.paymentStatus === 'refunded' ? 'selected' : ''}>Refunded</option>
                   </select>
                 </p>
                <p><strong>Transaction Type:</strong> ${transaction.transactionType || 'N/A'}</p>
                <p><strong>Reference Number:</strong> ${transaction.referenceNumber || 'N/A'}</p>
                <p><strong>Processed At:</strong> ${transaction.processedAt ? new Date(transaction.processedAt).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
            ${transaction.subscription ? `
              <hr>
              <h6>Subscription Details</h6>
              <p><strong>Subscription ID:</strong> ${transaction.subscription.id}</p>
              <p><strong>Plan:</strong> ${transaction.subscription.plan ? transaction.subscription.plan.planName : 'N/A'}</p>
              <p><strong>Subscription Status:</strong> ${transaction.subscription.status}</p>
            ` : ''}
          `;

          transactionModal.show();

          const modalPaymentStatus = document.getElementById('modalPaymentStatus');
          if (modalPaymentStatus) {
            modalPaymentStatus.addEventListener('change', async (event) => {
              const newStatus = event.target.value;
              const transactionId = transaction.id;
              // Call API to update status
              await updateTransactionStatus(transactionId, newStatus);
              // Optionally, refresh the transactions list or update the specific row
              loadTransactions(); // Reload all transactions to reflect the change
              transactionModal.hide(); // Hide modal after update
            });
          }

        } else {
          alert(`Error fetching transaction details: ${result.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error fetching transaction details:', error);
        alert('Network error. Unable to fetch transaction details.');
      }
    }
  });

  // Initial load
  loadCustomers();
  loadTransactions();
});