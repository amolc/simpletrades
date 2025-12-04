document.addEventListener('DOMContentLoaded', () => {
  // Watchlist functionality
  const addWatchBtn = document.getElementById('addWatchBtn');
  const watchModal = new bootstrap.Modal(document.getElementById('watchModal'));
  const watchForm = document.getElementById('watchForm');
  const saveWatchBtn = document.getElementById('saveWatchBtn');
  const watchlistBody = document.getElementById('watchlistBody');

  // Add watchlist item
  if (addWatchBtn) {
    addWatchBtn.addEventListener('click', () => {
      document.getElementById('watchId').value = '';
      watchForm.reset();
      watchModal.show();
    });
  }

  // Save watchlist item
  if (saveWatchBtn) {
    saveWatchBtn.addEventListener('click', async () => {
      const formData = {
        stockName: document.getElementById('watchStock').value,
        market: document.getElementById('watchMarket').value,
        currentPrice: parseFloat(document.getElementById('watchCurrentPrice').value),
        alertPrice: parseFloat(document.getElementById('watchAlertPrice').value)
      };

      if (!formData.stockName || !formData.market || isNaN(formData.currentPrice) || isNaN(formData.alertPrice)) {
        alert('Please fill in all fields');
        return;
      }

      try {
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
          watchModal.hide();
          window.location.reload(); // Reload to show updated data
        } else {
          alert('Error saving watchlist item: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error saving watchlist item:', error);
        alert('Error saving watchlist item');
      }
    });
  }

  // Handle watchlist actions (buy, sell, edit, delete)
  if (watchlistBody) {
    watchlistBody.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      const id = e.target.dataset.id;
      const stock = e.target.dataset.stock;

      if (!action || !id) return;

      if (action === 'edit') {
        // Find the row data and populate the modal
        const row = e.target.closest('tr');
        const cells = row.querySelectorAll('td');
        
        document.getElementById('watchId').value = id;
        document.getElementById('watchStock').value = cells[0].textContent;
        document.getElementById('watchMarket').value = cells[1].textContent;
        document.getElementById('watchCurrentPrice').value = parseFloat(cells[2].textContent.replace('₹', ''));
        document.getElementById('watchAlertPrice').value = parseFloat(cells[3].textContent.replace('₹', ''));
        
        watchModal.show();
      } else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this watchlist item?')) {
          try {
            const response = await fetch(`/api/watchlist/${id}`, {
              method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
              window.location.reload(); // Reload to show updated data
            } else {
              alert('Error deleting watchlist item: ' + (result.error || 'Unknown error'));
            }
          } catch (error) {
            console.error('Error deleting watchlist item:', error);
            alert('Error deleting watchlist item');
          }
        }
      } else if (action === 'buy' || action === 'sell') {
        // Handle buy/sell actions - open signal creation form
        const isBuy = action === 'buy';
        
        // Get watchlist item data from the row
        const row = e.target.closest('tr');
        const cells = row.querySelectorAll('td');
        const stockName = cells[0].textContent;
        const currentPrice = parseFloat(cells[2].textContent.replace('₹', ''));
        
        // Populate and show the signal creation modal
        document.getElementById('signalCreateTitle').textContent = `Create ${isBuy ? 'BUY' : 'SELL'} Signal`;
        document.getElementById('signalStock').value = stockName;
        document.getElementById('signalTime').value = new Date().toLocaleString();
        document.getElementById('signalEntry').value = currentPrice;
        document.getElementById('signalCurrentPrice').value = currentPrice;
        document.getElementById('signalSide').value = isBuy ? 'BUY' : 'SELL';
        
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
        
        applyPercentages();
        targetPctEl.oninput = applyPercentages;
        stopPctEl.oninput = applyPercentages;
        
        // Clear notes
        document.getElementById('signalNotes').value = '';
        
        // Show the modal
        const signalModal = new bootstrap.Modal(document.getElementById('signalCreateModal'));
        signalModal.show();
      }
    });
  }

  // Handle signal creation form submission
  const createSignalBtn = document.getElementById('createSignalBtn');
  if (createSignalBtn) {
    createSignalBtn.addEventListener('click', async () => {
      const stock = document.getElementById('signalStock').value;
      const entry = parseFloat(document.getElementById('signalEntry').value);
      const target = parseFloat(document.getElementById('signalTarget').value);
      const stopLoss = parseFloat(document.getElementById('signalStop').value);
      const notes = document.getElementById('signalNotes').value;
      const side = document.getElementById('signalSide').value;
      
      if (!stock || !Number.isFinite(entry) || !Number.isFinite(target) || !Number.isFinite(stopLoss)) {
        alert('Please fill target and stop loss');
        return;
      }
      
      const body = {
        product: stock,
        entry: entry,
        target: target,
        stopLoss: stopLoss,
        type: 'stocks',
        signalType: side,
        notes: notes
      };
      
      try {
        const response = await fetch('/api/signals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        const result = await response.json();
        
        if (result.success) {
          const signalModal = bootstrap.Modal.getInstance(document.getElementById('signalCreateModal'));
          signalModal.hide();
          window.location.reload(); // Reload to show updated data
        } else {
          alert('Error creating signal: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error creating signal:', error);
        alert('Error creating signal');
      }
    });
  }

  // Handle signal actions (activate, close, delete)
  const signalsBody = document.getElementById('signalsBody');
  const signalCloseModal = new bootstrap.Modal(document.getElementById('signalCloseModal'));
  
  if (signalsBody) {
    signalsBody.addEventListener('click', async (e) => {
      const action = e.target.dataset.saction;
      const signalId = e.target.dataset.sid;

      if (!action || !signalId) return;

      try {
        let endpoint = '';
        let method = 'PUT';
        
        switch (action) {
          case 'activate':
            endpoint = `/api/signals/${signalId}/activate`;
            break;
          case 'close':
            // Show close modal instead of direct API call
            showCloseModal(signalId, e.target.closest('tr'));
            return;
          case 'delete':
            if (confirm('Are you sure you want to delete this signal?')) {
              endpoint = `/api/signals/${signalId}`;
              method = 'DELETE';
            } else {
              return;
            }
            break;
          default:
            return;
        }

        const response = await fetch(endpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const result = await response.json();
        
        if (result.success) {
          window.location.reload(); // Reload to show updated data
        } else {
          alert('Error updating signal: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error updating signal:', error);
        alert('Error updating signal');
      }
    });
  }

  // Function to show close signal modal
  function showCloseModal(signalId, row) {
    const cells = row.querySelectorAll('td');
    
    // Populate modal with signal data
    document.getElementById('closeSignalId').value = signalId;
    document.getElementById('closeSignalStock').value = cells[0].textContent;
    document.getElementById('closeSignalType').value = cells[1].textContent;
    document.getElementById('closeSignalEntry').value = parseFloat(cells[2].textContent.replace('₹', ''));
    document.getElementById('closeSignalTarget').value = parseFloat(cells[3].textContent.replace('₹', ''));
    document.getElementById('closeExitPrice').value = '';
    document.getElementById('closeSignalNotes').value = '';
    
    // Show modal
    signalCloseModal.show();
  }

  // Handle close signal form submission
  const closeSignalBtn = document.getElementById('closeSignalBtn');
  if (closeSignalBtn) {
    closeSignalBtn.addEventListener('click', async () => {
      const signalId = document.getElementById('closeSignalId').value;
      const exitPrice = parseFloat(document.getElementById('closeExitPrice').value);
      const notes = document.getElementById('closeSignalNotes').value;
      
      if (!signalId || isNaN(exitPrice)) {
        alert('Please enter a valid exit price');
        return;
      }
      
      try {
        const response = await fetch(`/api/signals/${signalId}/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ exitPrice, notes })
        });
        
        const result = await response.json();
        
        if (result.success) {
          signalCloseModal.hide();
          window.location.reload(); // Reload to show updated data
        } else {
          alert('Error closing signal: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error closing signal:', error);
        alert('Error closing signal');
      }
    });
  }
});