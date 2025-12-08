document.addEventListener('DOMContentLoaded', () => {
  // Subscription creation modal functionality
  const addSubscriptionBtn = document.getElementById('addSubscriptionBtn');
  const subscriptionModal = new bootstrap.Modal(document.getElementById('subscriptionModal'));
  const subscriptionForm = document.getElementById('subscriptionForm');
  const saveSubscriptionBtn = document.getElementById('saveSubscriptionBtn');
  const subscriptionsBody = document.getElementById('subscriptionsBody');
  
  // Filter elements
  const filterForm = document.getElementById('filterForm');
  const customerFilter = document.getElementById('customerFilter');
  const productFilter = document.getElementById('productFilter');
  const statusFilter = document.getElementById('statusFilter');
  const sortBy = document.getElementById('sortBy');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const searchInput = document.getElementById('searchInput');
  
  // Pagination elements
  const pagination = document.getElementById('pagination');
  const itemsPerPage = 10;
  let currentPage = 1;
  let allSubscriptions = []; // Store all subscriptions for client-side pagination
  
  // Customer and product dropdowns
  const customerSelect = document.getElementById('customerSelect');
  const productSelect = document.getElementById('productSelect');
  const planSelect = document.getElementById('planSelect');
  const planDetails = document.getElementById('planDetails');
  const planDetailsContent = document.getElementById('planDetailsContent');
  
  // Load customers and products for dropdowns
  async function loadDropdownData() {
    try {
      // Show loading state
      customerSelect.disabled = true;
      productSelect.disabled = true;
      customerSelect.innerHTML = '<option value="">Loading customers...</option>';
      productSelect.innerHTML = '<option value="">Loading products...</option>';
      
      // Load customers
      const customersResponse = await fetch('/api/users?userType=customer');
      const customersData = await customersResponse.json();
      
      if (customersData.success) {
        customerSelect.innerHTML = '<option value="">Select a customer...</option>';
        customersData.data.forEach(customer => {
          const option = document.createElement('option');
          option.value = customer.id;
          option.textContent = `${customer.fullName} (${customer.email})`;
          customerSelect.appendChild(option);
        });
      }
      
      // Load products
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      
      if (productsData.success) {
        productSelect.innerHTML = '<option value="">Select a product...</option>';
        productsData.data.forEach(product => {
          const option = document.createElement('option');
          option.value = product.id;
          option.textContent = product.name;
          option.dataset.productName = product.name;
          productSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      customerSelect.innerHTML = '<option value="">Error loading customers</option>';
      productSelect.innerHTML = '<option value="">Error loading products</option>';
      
      // Show user-friendly error message
      const errorAlert = document.createElement('div');
      errorAlert.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
      errorAlert.style.zIndex = '9999';
      errorAlert.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        Error loading form data. Please refresh the page.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      document.body.appendChild(errorAlert);
      
      // Remove error message after 5 seconds
      setTimeout(() => {
        if (errorAlert.parentNode) {
          errorAlert.parentNode.removeChild(errorAlert);
        }
      }, 5000);
    } finally {
      // Re-enable dropdowns
      customerSelect.disabled = false;
      productSelect.disabled = false;
    }
  }
  
  // Load plans when product is selected
  productSelect.addEventListener('change', async () => {
    const productId = productSelect.value;
    planSelect.innerHTML = '<option value="">Select a plan...</option>';
    planSelect.disabled = true;
    planDetails.classList.add('d-none');
    
    if (productId) {
      try {
        // Show loading state
        planSelect.innerHTML = '<option value="">Loading plans...</option>';
        
        const plansResponse = await fetch(`/api/plans/product/${productSelect.options[productSelect.selectedIndex].dataset.productName}`);
        const plansData = await plansResponse.json();
        
        if (plansData.success && plansData.data.length > 0) {
          plansData.data.forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.id;
            option.textContent = `${plan.planName} - Rs ${plan.cost}/${plan.renewalType}`;
            option.dataset.planDetails = JSON.stringify(plan);
            planSelect.appendChild(option);
          });
        }
      } catch (error) {
        console.error('Error loading plans:', error);
        planSelect.innerHTML = '<option value="">Error loading plans</option>';
        
        // Show user-friendly error message
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        errorAlert.style.zIndex = '9999';
        errorAlert.innerHTML = `
          <i class="fas fa-exclamation-triangle me-2"></i>
          Error loading plans. Please try again.
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(errorAlert);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
          if (errorAlert.parentNode) {
            errorAlert.parentNode.removeChild(errorAlert);
          }
        }, 5000);
      } finally {
        planSelect.disabled = false;
      }
    }
  });
  
  // Show plan details when plan is selected
  planSelect.addEventListener('change', () => {
    const selectedOption = planSelect.options[planSelect.selectedIndex];
    
    if (selectedOption.value && selectedOption.dataset.planDetails) {
      const plan = JSON.parse(selectedOption.dataset.planDetails);
      selectedPlan = plan;
      planDetailsContent.innerHTML = `
        <p><strong>Name:</strong> ${plan.planName}</p>
        <p><strong>Price:</strong> Rs ${plan.cost}</p>
        <p><strong>Billing Cycle:</strong> ${plan.renewalType}</p>
        <p><strong>Description:</strong> ${plan.planDescription || 'No description available'}</p>
      `;
      planDetails.classList.remove('d-none');
    } else {
      planDetails.classList.add('d-none');
    }
    
    // Clear validation state when user makes a selection
    if (planSelect.value) {
      planSelect.classList.remove('is-invalid');
    }
  });
  
  // Real-time validation clearing
  customerSelect.addEventListener('change', () => {
    if (customerSelect.value) {
      customerSelect.classList.remove('is-invalid');
    }
  });
  
  productSelect.addEventListener('change', () => {
    if (productSelect.value) {
      productSelect.classList.remove('is-invalid');
    }
  });
  
  document.getElementById('startDate').addEventListener('change', () => {
    const startDateInput = document.getElementById('startDate');
    if (startDateInput.value) {
      startDateInput.classList.remove('is-invalid');
    }
  });
  
  // Clear error alert when modal is closed
  subscriptionModal._element.addEventListener('hidden.bs.modal', () => {
    const errorAlert = document.getElementById('subscriptionErrorAlert');
    if (errorAlert) {
      errorAlert.classList.add('d-none');
    }
    // Clear all validation states
    document.querySelectorAll('#subscriptionForm .is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
    });
  });
  
  // Add subscription button click
  if (addSubscriptionBtn) {
    addSubscriptionBtn.addEventListener('click', () => {
      document.getElementById('subscriptionId').value = '';
      subscriptionForm.reset();
      planDetails.classList.add('d-none');
      subscriptionModal.show();
      
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('startDate').value = today;
    });
  }
  
  // Form validation function
  function validateSubscriptionForm() {
    let isValid = true;
    const errors = [];
    
    // Reset validation states
    document.querySelectorAll('#subscriptionForm .is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
    });
    
    // Validate customer selection
    if (!customerSelect.value) {
      customerSelect.classList.add('is-invalid');
      errors.push('Please select a customer');
      isValid = false;
    }
    
    // Validate product selection
    if (!productSelect.value) {
      productSelect.classList.add('is-invalid');
      errors.push('Please select a product');
      isValid = false;
    }
    
    // Validate plan selection
    if (!planSelect.value) {
      planSelect.classList.add('is-invalid');
      errors.push('Please select a plan type');
      isValid = false;
    }
    
    // Validate start date
    const startDate = document.getElementById('startDate').value;
    if (!startDate) {
      document.getElementById('startDate').classList.add('is-invalid');
      errors.push('Please select a start date');
      isValid = false;
    } else {
      const selectedDate = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        document.getElementById('startDate').classList.add('is-invalid');
        errors.push('Start date cannot be in the past');
        isValid = false;
      }
    }
    
    // Show error alert if there are errors
    if (errors.length > 0) {
      const errorAlert = document.getElementById('subscriptionErrorAlert');
      if (errorAlert) {
        errorAlert.innerHTML = `
          <h6 class="alert-heading">Please fix the following errors:</h6>
          <ul class="mb-0">
            ${errors.map(error => `<li>${error}</li>`).join('')}
          </ul>
        `;
        errorAlert.classList.remove('d-none');
      }
    }
    
    return isValid;
  }
  
  // Save subscription button click
  if (saveSubscriptionBtn) {
    saveSubscriptionBtn.addEventListener('click', async () => {
      // Hide any previous error alerts
      const errorAlert = document.getElementById('subscriptionErrorAlert');
      if (errorAlert) {
        errorAlert.classList.add('d-none');
      }
      
      // Validate form
      if (!validateSubscriptionForm()) {
        return;
      }
      
  
      const startDateInput = document.getElementById('startDate').value;
      const startDateObj = new Date(startDateInput);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + selectedPlan.numberOfDays);
      const endDate = endDateObj.toISOString().split('T')[0];

      const formData = {
        userId: parseInt(customerSelect.value),
        planId: parseInt(planSelect.value),
        startDate: startDateInput,
        endDate: endDate,
        amount: selectedPlan.cost,
        notes: document.getElementById('subscriptionNotes').value,
        status: 'active'
      };
      
      // Disable button and show loading state
      saveSubscriptionBtn.disabled = true;
      saveSubscriptionBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Creating Subscription...';
      
      try {
        console.log('Submitting formData:', formData); // Add this line for debugging
        const response = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          subscriptionModal.hide();
          
          // Show success message
          const successAlert = document.createElement('div');
          successAlert.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
          successAlert.style.zIndex = '9999';
          successAlert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            Subscription created successfully!
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          `;
          document.body.appendChild(successAlert);
          
          // Remove success message after 3 seconds
          setTimeout(() => {
            if (successAlert.parentNode) {
              successAlert.parentNode.removeChild(successAlert);
            }
          }, 3000);
          
          // Reload data after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
        } else {
          // Show error message
          const errorMessage = result.message || result.error || 'Unknown error occurred';
          if (errorAlert) {
            errorAlert.innerHTML = `
              <h6 class="alert-heading">Error creating subscription:</h6>
              <p class="mb-0">${errorMessage}</p>
            `;
            errorAlert.classList.remove('d-none');
          } else {
            alert('Error creating subscription: ' + errorMessage);
          }
        }
      } catch (error) {
        console.error('Error creating subscription:', error);
        if (errorAlert) {
          errorAlert.innerHTML = `
            <h6 class="alert-heading">Network Error:</h6>
            <p class="mb-0">Unable to create subscription. Please check your connection and try again.</p>
          `;
          errorAlert.classList.remove('d-none');
        } else {
          alert('Error creating subscription. Please check your connection and try again.');
        }
      } finally {
        // Re-enable button and restore original text
        saveSubscriptionBtn.disabled = false;
        saveSubscriptionBtn.innerHTML = 'Start Subscription';
      }
    });
  }
  
  // Handle subscription actions (view, edit, cancel)
  if (subscriptionsBody) {
    subscriptionsBody.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      const id = e.target.dataset.id;

      if (!action || !id) return;

      if (action === 'view') {
        // View subscription details
        window.location.href = `/admin/subscriptions/${id}`;
      } else if (action === 'cancel') {
        // Cancel subscription
        const cancelButton = e.target;
        const originalText = cancelButton.innerHTML;

        if (confirm('Are you sure you want to cancel this subscription?')) {
          try {
            // Show loading state
            cancelButton.disabled = true;
            cancelButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Cancelling...';

            const response = await fetch(`/api/subscriptions/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: 'cancelled' })
            });

            const result = await response.json();

            if (result.success) {
              // Update UI without full reload
              const row = cancelButton.closest('tr');
              if (row) {
                // Update status badge
                const statusCell = row.querySelector('td:nth-child(6)');
                if (statusCell) {
                  statusCell.innerHTML = '<span class="badge bg-danger">cancelled</span>';
                }
                // Remove cancel button
                cancelButton.remove();
              }
              alert('Subscription cancelled successfully!');
            } else {
              alert('Error cancelling subscription: ' + (result.error || 'Unknown error'));
            }
          } catch (error) {
            console.error('Error cancelling subscription:', error);
            alert('Error cancelling subscription');
          } finally {
            // Restore button state
            cancelButton.disabled = false;
            cancelButton.innerHTML = originalText;
          }
        }
      } else if (action === 'link-payment') {
        const linkPaymentModal = new bootstrap.Modal(document.getElementById('linkPaymentModal'));
        const paymentSubscriptionId = document.getElementById('paymentSubscriptionId');
        const paymentAmountDue = document.getElementById('paymentAmountDue');
        const qrcodeDiv = document.getElementById('qrcode');
        const linkPaymentForm = document.getElementById('linkPaymentForm');
        const transactionReferenceInput = document.getElementById('transactionReference');
        const submitPaymentBtn = document.getElementById('submitPaymentBtn');

        // Hide all input fields and labels within the form initially
        linkPaymentForm.querySelectorAll('.form-group, .mb-3').forEach(element => {
          element.classList.add('d-none');
        });

        // Clear previous QR code and form data
        qrcodeDiv.innerHTML = '';
        transactionReferenceInput.value = '';
        submitPaymentBtn.disabled = false;
        submitPaymentBtn.innerHTML = 'Submit Payment';

        try {
          const response = await fetch(`/api/subscriptions/${id}`);
          const result = await response.json();

          if (result.success) {
            const subscription = result.data;
            paymentSubscriptionId.textContent = subscription.id;
            paymentAmountDue.textContent = `Rs ${parseFloat(subscription.plan.cost).toFixed(2)}`;

              const paymentResponse = await fetch(`/api/subscriptions/${id}/payment-qrcode`);
              const paymentResult = await paymentResponse.json();

              if (paymentResult.success) {
                const paymentData = paymentResult.data.paymentUrl;
                new QRCode(qrcodeDiv, {
                  text: paymentData,
                  width: 128,
                  height: 128,
                  colorDark : "#000000",
                  colorLight : "#ffffff",
                  correctLevel : QRCode.CorrectLevel.H
                });
                // Show only the QR code and amount due
                document.getElementById('paymentAmountDueGroup').classList.remove('d-none'); // Assuming a group for amount due
                document.getElementById('qrcodeGroup').classList.remove('d-none'); // Assuming a group for QR code

              } else {
                console.error('Error fetching payment QR code:', paymentResult.message);
                alert('Error generating QR code: ' + (paymentResult.message || 'Unknown error'));
                linkPaymentModal.hide();
                return;
              }

            linkPaymentModal.show();

            linkPaymentForm.onsubmit = async (event) => {
              event.preventDefault();
              submitPaymentBtn.disabled = true;
              submitPaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Submitting...';

              const transactionReference = transactionReferenceInput.value.trim();
                if (!transactionReference) {
                  alert('Please enter a transaction reference number.');
                  submitPaymentBtn.disabled = false;
                  submitPaymentBtn.innerHTML = 'Submit Payment';
                  return;
                }

              try {
                const paymentResponse = await fetch('/api/transactions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId: subscription.userId,
                    subscriptionId: subscription.id,
                    amount: subscription.plan.cost,
                    paymentMethod: 'UPI',
                    paymentStatus: 'completed',
                    transactionType: 'subscription_payment',
                    referenceNumber: transactionReference,
                  }),
                });

                const paymentResult = await paymentResponse.json();

                if (paymentResult.success) {
                  alert('Payment linked successfully!');
                  linkPaymentModal.hide();
                  // Update payment status in UI
                  const row = document.querySelector(`button[data-id="${id}"][data-action="link-payment"]`).closest('tr');
                  if (row) {
                    const paymentStatusCell = row.querySelector('td:nth-child(7)');
                    if (paymentStatusCell) {
                      paymentStatusCell.innerHTML = '<span class="badge bg-success">completed</span>';
                    }
                  }
                } else {
                  alert('Error linking payment: ' + (paymentResult.message || 'Unknown error'));
                }
              } catch (paymentError) {
                console.error('Error submitting payment:', paymentError);
                alert('Network error while submitting payment.');
              } finally {
                submitPaymentBtn.disabled = false;
                submitPaymentBtn.innerHTML = 'Submit Payment';
              }
            };

          } else {
            alert('Error loading subscription details for payment: ' + (result.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error linking payment:', error);
          alert('Network error. Unable to load subscription details for payment.');
        }
      }
    });
  }
  
  // Helper function to load plans for a product
  async function loadPlansForProduct(productId) {
    const productName = productSelect.options[productSelect.selectedIndex]?.dataset.productName;
    if (!productName) return;
    
    try {
      const plansResponse = await fetch(`/api/plans/product/${productName}`);
      const plansData = await plansResponse.json();
      
      if (plansData.success && plansData.data.length > 0) {
        planSelect.innerHTML = '<option value="">Select a plan...</option>';
        plansData.data.forEach(plan => {
          const option = document.createElement('option');
          option.value = plan.id;
          option.textContent = `${plan.planName} - Rs ${plan.cost}/${plan.renewalType}`;
          option.dataset.planDetails = JSON.stringify(plan);
          planSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  }

  // Load subscriptions - modified to work with existing template data
  async function loadSubscriptions() {
    try {
      // Check if data is already rendered in template
      const existingRows = subscriptionsBody.querySelectorAll('tr');
      if (existingRows.length > 0 && !existingRows[0].querySelector('.text-center')) {
        // Data is already rendered, just initialize
        console.log('Using template-rendered subscription data');
        return;
      }

      // If no data in template, fetch from API
      subscriptionsBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading subscriptions...</td></tr>';
      const response = await fetch('/api/subscriptions');
      const result = await response.json();

      if (result.success) {
        allSubscriptions = result.data.subscriptions;
        renderSubscriptions(allSubscriptions);
      } else {
        subscriptionsBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading subscriptions: ${result.message || 'Unknown error'}</td></tr>`;
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      subscriptionsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Network error. Unable to load subscriptions.</td></tr>';
    }
  }
  
let selectedPlan;

  // Render subscriptions to the table
  function renderSubscriptions(subscriptionsToRender) {
    subscriptionsBody.innerHTML = ''; // Clear existing rows
    if (subscriptionsToRender.length === 0) {
      subscriptionsBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-4">
            <i class="fas fa-info-circle fa-2x mb-2"></i><br>
            No subscriptions found.
          </td>
        </tr>
      `;
      return;
    }

    subscriptionsToRender.forEach(subscription => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${subscription.id}</td>
        <td>${subscription.User ? subscription.User.fullName : 'N/A'}</td>
        <td>${subscription.plan && subscription.plan.Product ? subscription.plan.Product.name : 'N/A'}</td>
        <td>${subscription.plan ? subscription.plan.planName : 'N/A'}</td>
        <td>Rs ${subscription.plan && subscription.plan.cost ? parseFloat(subscription.plan.cost).toFixed(2) : '0.00'}</td>
        <td>${new Date(subscription.startDate).toLocaleDateString()}</td>
        <td><span class="badge bg-${subscription.status === 'active' ? 'success' : subscription.status === 'pending' ? 'warning' : 'danger'}">${subscription.status}</span></td>
        <td><span class="badge bg-${subscription.paymentStatus === 'completed' ? 'success' : subscription.paymentStatus === 'pending' ? 'warning' : 'danger'}">${subscription.paymentStatus}</span></td>
        <td>
          <button class="btn btn-sm btn-info view-subscription-btn" data-id="${subscription.id}" data-action="view">View</button>
          ${subscription.status === 'active' ? `<button class="btn btn-sm btn-danger cancel-subscription-btn" data-id="${subscription.id}" data-action="cancel">Cancel</button>` : ''}
          ${subscription.paymentStatus === 'pending' ? `<button class="btn btn-sm btn-success link-payment-btn" data-id="${subscription.id}" data-action="link-payment">Link Payment</button>` : ''}
        </td>
      `;
      subscriptionsBody.appendChild(row);
    });
  }

  // Load initial data
  loadDropdownData();
  loadFilterDropdowns();
  loadSubscriptions();
  
  // Load customers and products for filter dropdowns
  async function loadFilterDropdowns() {
    try {
      // Load customers for filter
      const customersResponse = await fetch('/api/users?userType=customer');
      const customersData = await customersResponse.json();
      
      if (customersData.success) {
        customerFilter.innerHTML = '<option value="">All Customers</option>';
        customersData.data.forEach(customer => {
          const option = document.createElement('option');
          option.value = customer.id;
          option.textContent = `${customer.name} (${customer.email})`;
          customerFilter.appendChild(option);
        });
      }
      
      // Load products for filter
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      
      if (productsData.success) {
        productFilter.innerHTML = '<option value="">All Products</option>';
        productsData.data.forEach(product => {
          const option = document.createElement('option');
          option.value = product.id;
          option.textContent = product.name;
          productFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading filter dropdowns:', error);
    }
  }
  
  // Filter and sort subscriptions
  function filterSubscriptions() {
    const customerId = customerFilter.value;
    const productId = productFilter.value;
    const statusValue = statusFilter.value;
    const sortValue = sortBy.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    // Show loading state
    const loadingRow = document.createElement('tr');
    loadingRow.id = 'filteringRow';
    loadingRow.innerHTML = `
      <td colspan="7" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Filtering...</span>
        </div>
        <p class="mt-2 text-muted">Filtering subscriptions...</p>
      </td>
    `;
    
    // Hide current rows and show loading
    const rows = subscriptionsBody.querySelectorAll('tr:not(#filteringRow)');
    rows.forEach(row => row.style.display = 'none');
    
    // Remove existing loading row if any
    const existingLoadingRow = document.getElementById('filteringRow');
    if (existingLoadingRow) {
      existingLoadingRow.remove();
    }
    
    // Add loading row
    subscriptionsBody.appendChild(loadingRow);
    
    // Process filtering after a short delay to show loading state
    setTimeout(() => {
      // Remove loading row
      loadingRow.remove();
      
      // Continue with actual filtering
      processFilterResults(customerId, productId, statusValue, sortValue, searchTerm);
    }, 300);
  }
  
  // Process filter results
  function processFilterResults(customerId, productId, statusValue, sortValue, searchTerm) {
    const rows = subscriptionsBody.querySelectorAll('tr:not(#filteringRow)');
    let visibleCount = 0;
    const visibleRows = [];
    
    rows.forEach(row => {
      const subscriptionId = row.querySelector('td:first-child').textContent.toLowerCase();
      const customerName = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
      const productName = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
      const statusBadge = row.querySelector('td:nth-child(6) span').textContent.toLowerCase();
      
      let showRow = true;
      
      // Customer filter
      if (customerId) {
        const rowCustomerId = row.dataset.customerId;
        if (rowCustomerId !== customerId) showRow = false;
      }
      
      // Product filter
      if (productId) {
        const rowProductId = row.dataset.productId;
        if (rowProductId !== productId) showRow = false;
      }
      
      // Status filter
      if (statusValue && statusBadge !== statusValue.toLowerCase()) showRow = false;
      
      // Search filter
      if (searchTerm && !subscriptionId.includes(searchTerm) && !customerName.includes(searchTerm) && !productName.includes(searchTerm)) {
        showRow = false;
      }
      
      if (showRow) {
        row.style.display = '';
        visibleRows.push(row);
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });
    
    // Sort visible rows
    if (sortValue && visibleRows.length > 0) {
      sortTableRows(visibleRows, sortValue);
    }
    
    // Update pagination with filtered results
    updatePagination(visibleRows);
    
    // Show/hide no results message
    const noResultsRow = document.getElementById('noResultsRow');
    if (visibleCount === 0) {
      if (!noResultsRow) {
        const noResultsHtml = `
          <tr id="noResultsRow">
            <td colspan="7" class="text-center text-muted py-4">
              <i class="fas fa-search fa-2x mb-2"></i><br>
              No subscriptions found matching your filters.
            </td>
          </tr>
        `;
        subscriptionsBody.insertAdjacentHTML('beforeend', noResultsHtml);
      }
    } else if (noResultsRow) {
      noResultsRow.remove();
    }
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
          filterSubscriptions();
        }
      });
    });
  }
  
  // Sort table rows
  function sortTableRows(rows, sortBy) {
    const tbody = subscriptionsBody;
    const rowsArray = Array.from(rows);
    
    rowsArray.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.dataset.createdAt || 0);
          bValue = new Date(b.dataset.createdAt || 0);
          return bValue - aValue; // Newest first
        case 'startDate':
          aValue = new Date(a.dataset.startDate || 0);
          bValue = new Date(b.dataset.startDate || 0);
          return bValue - aValue; // Newest first
        case 'customer.name':
          aValue = a.querySelector('td:nth-child(2)').textContent.toLowerCase();
          bValue = b.querySelector('td:nth-child(2)').textContent.toLowerCase();
          return aValue.localeCompare(bValue);
        case 'plan.product.name':
          aValue = a.querySelector('td:nth-child(3)').textContent.toLowerCase();
          bValue = b.querySelector('td:nth-child(3)').textContent.toLowerCase();
          return aValue.localeCompare(bValue);
        case 'status':
          aValue = a.querySelector('td:nth-child(6) span').textContent.toLowerCase();
          bValue = b.querySelector('td:nth-child(6) span').textContent.toLowerCase();
          return aValue.localeCompare(bValue);
        default:
          return 0;
      }
    });
    
    // Re-append sorted rows
    rowsArray.forEach(row => tbody.appendChild(row));
  }
  
  // Apply filters
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      filterSubscriptions();
    });
  }
  
  // Clear filters
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      customerFilter.value = '';
      productFilter.value = '';
      statusFilter.value = '';
      sortBy.value = 'createdAt';
      searchInput.value = '';
      currentPage = 1; // Reset to first page
      filterSubscriptions();
    });
  }
  
  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterSubscriptions();
    });
  }
  
  // Sort functionality
  if (sortBy) {
    sortBy.addEventListener('change', () => {
      filterSubscriptions();
    });
  }
});