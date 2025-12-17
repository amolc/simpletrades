document.addEventListener('DOMContentLoaded', () => {
  // Watchlist functionality
  const addWatchBtn = document.getElementById('addWatchBtn');
  const watchModal = new bootstrap.Modal(document.getElementById('watchModal'));
  const watchForm = document.getElementById('watchForm');
  const watchlistBody = document.getElementById('watchlistBody');
  const addStockBtn = document.getElementById('addStockBtn');
  const addOptionStockBtn = document.getElementById('addOptionStockBtn');
  const stockSection = document.getElementById('watchStocksSection');
  const optionSection = document.getElementById('watchOptionsSection');
  const modeStock = document.getElementById('modeStock');
  const modeOption = document.getElementById('modeOption');
  const watchSubmitBtn = document.getElementById('watchSubmitBtn');
  const watchSubmitLabel = document.getElementById('watchSubmitLabel');

  const inlineSpinner = document.getElementById('watchSubmitSpinner');
  const showInlineLoader = () => {
    inlineSpinner?.classList.remove('d-none');
    watchSubmitBtn?.setAttribute('aria-busy','true');
    watchSubmitBtn?.classList.add('disabled');
  };
  const hideInlineLoader = () => {
    inlineSpinner?.classList.add('d-none');
    watchSubmitBtn?.removeAttribute('aria-busy');
    watchSubmitBtn?.classList.remove('disabled');
  };
  // No-op global loader to remove full page overlay usage everywhere
  const showLoader = () => {};
  const hideLoader = () => {};
  function getSelectedProduct(){ const sel=document.getElementById('watchProduct'); const name=(sel?.value||'').trim(); const cat=(sel?.selectedOptions&&sel.selectedOptions[0]&&sel.selectedOptions[0].dataset? sel.selectedOptions[0].dataset.category : '')||''; return { name, category: cat.trim() }; }

  // Add watchlist item
  if (addWatchBtn) {
    addWatchBtn.addEventListener('click', () => {
      document.getElementById('watchId').value = '';
      watchForm.reset();
      if (modeStock) modeStock.checked = true;
      updateWatchMode();
      updateSubmitLabel();
      watchModal.show();
    });
  }

  async function addStockSimple(){
    showInlineLoader();
    try {
      const stockName = (document.getElementById('watchStock')?.value || '').trim();
      const exchange = (document.getElementById('stockExchange')?.value || '').trim();
      const sel = getSelectedProduct();
      if (!stockName || !exchange) { 
        alert('Please enter stock and exchange'); 
        return; 
      }
      
      let price = 0;
      try { 
        // Use a timeout for price fetch so it doesn't hang forever
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const r = await fetch(`/api/price?symbol=${encodeURIComponent(stockName)}&exchange=${encodeURIComponent(exchange)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const d = await r.json(); 
        if (d && d.success && typeof d.price === 'number') price = d.price; 
      } catch(e){
        console.warn('Price fetch failed, proceeding with 0:', e);
      }

      const body = { stockName, product: sel.name || 'Stocks', exchange, currentPrice: price, alertPrice: price };
      const res = await fetch('/api/watchlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const json = await res.json();
      
      if (json && json.success) { 
        // Subscribe to live prices via WebSocket after adding to watchlist
        if (window.wsManager) {
          try {
            await window.wsManager.connect();
            const subscribed = window.wsManager.subscribe([{ symbol: stockName, exchange: exchange }]);
            console.log(`Subscribed to live prices for ${exchange}:${stockName}`, subscribed);
          } catch (wsError) {
            console.warn('Failed to subscribe to WebSocket for live prices:', wsError);
          }
        }
        
        watchModal.hide(); 
        window.location.reload(); 
      } else { 
        alert('Error: ' + (json.error||'Unknown')); 
      }
    } catch(e){ 
      console.error('Add stock error:', e);
      alert('Network error or server unavailable'); 
    } finally {
      hideInlineLoader();
    }
  }
  
  async function addOptionATM(){
    showInlineLoader();
    try {
      const underlying = (document.getElementById('optionUnderlying')?.value || '').trim();
      const exchange = (document.getElementById('optionExchange')?.value || '').trim();
      const expiry = document.getElementById('optionExpiry')?.value || '';
      const offset = parseInt(document.getElementById('optionAtmOffset')?.value || '0', 10) || 0;
      const sel = getSelectedProduct();
      
      if (!underlying || !exchange || !expiry) { 
        alert('Please enter option stock, exchange and expiry'); 
        return; 
      }
      
      let price = NaN;
      try {
        const r = await fetch(`/api/price?symbol=${encodeURIComponent(underlying)}&exchange=${encodeURIComponent(exchange)}`);
        const d = await r.json();
        if (d && d.success && typeof d.price === 'number') price = d.price;
      } catch(e){
        console.error('Underlying price fetch error:', e);
      }
      
      if (isNaN(price)) { 
        alert('Could not fetch underlying price. Cannot calculate ATM strike.'); 
        return; 
      }
      
      const step = (() => {
        const s = underlying.toUpperCase();
        if (s === 'NIFTY') return 50;
        if (s === 'BANKNIFTY') return 100;
        if (price < 100) return 5;
        if (price < 200) return 10;
        if (price < 1000) return 20;
        return 50;
      })();
      
      const atm = Math.round(price / step) * step;
      const strike = atm + offset * step;
      const fmt = (ds) => { const d = new Date(ds); const yy = String(d.getFullYear()).slice(-2); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${yy}${mm}${dd}`; };
      const cpType = (document.getElementById('optionCpType')?.value || 'CALL').toUpperCase();
      const cpLetter = cpType === 'PUT' ? 'P' : 'C';
      const sym = `${underlying.toUpperCase()}${fmt(expiry)}${cpLetter}${strike}`;
      
      let cp = 0;
      try { 
        const r2 = await fetch(`/api/price?symbol=${encodeURIComponent(sym)}&exchange=${encodeURIComponent(exchange)}`); 
        const d2 = await r2.json(); 
        if (d2 && d2.success && typeof d2.price === 'number') cp = d2.price; 
      } catch(e){}
      
      const body = { stockName: sym, product: sel.name || 'Options', exchange, currentPrice: cp, alertPrice: cp };
      const res = await fetch('/api/watchlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const json = await res.json();
      
      if (json && json.success) { 
        watchModal.hide(); 
        window.location.reload(); 
      } else { 
        alert('Error: ' + (json.error||'Unknown')); 
      }
    } catch(e){ 
      console.error('Add option error:', e);
      alert('Network error'); 
    } finally {
      hideInlineLoader();
    }
  }
  addStockBtn?.addEventListener('click', addStockSimple);
  addOptionStockBtn?.addEventListener('click', addOptionATM);
  watchSubmitBtn?.addEventListener('click', () => {
    const isStock = modeStock?.checked;
    if (isStock) return addStockSimple();
    return addOptionATM();
  });

  function updateWatchMode(){
    const isStock = modeStock?.checked;
    if (stockSection) stockSection.classList.toggle('d-none', !isStock);
    if (optionSection) optionSection.classList.toggle('d-none', !!isStock);
    updateSubmitLabel();
  }
  function updateSubmitLabel(){
    const isStock = modeStock?.checked;
    if (watchSubmitLabel) watchSubmitLabel.textContent = isStock ? 'Add Stock' : 'Add Option';
  }
  modeStock?.addEventListener('change', updateWatchMode);
  modeOption?.addEventListener('change', updateWatchMode);
  // Initialize visibility on load
  updateWatchMode();

  

  // Handle watchlist actions (buy, sell, edit, delete)
  if (watchlistBody) {
    watchlistBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const stock = btn.dataset.stock;

      if (action === 'edit') {
        // Find the row data and populate the modal
        const row = e.target.closest('tr');
        const cells = row.querySelectorAll('td');
        
        document.getElementById('watchId').value = id;
        const marketVal = cells[1].textContent;
        const exchangeVal = cells[2].textContent;
        const currentPriceVal = parseFloat(cells[3].textContent.replace(/Rs\s?|₹/g, ''));
        const alertPriceVal = parseFloat(cells[4].textContent.replace(/Rs\s?|₹/g, ''));
        document.getElementById('watchProduct').value = marketVal;
        document.getElementById('stockExchange').value = exchangeVal;
        document.getElementById('watchStock').value = cells[0].textContent;
        watchModal.show();
      } else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this watchlist item?')) {
          try {
            showLoader();
            const response = await fetch(`/api/watchlist/${id}`, {
              method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
              window.location.reload(); // Reload to show updated data
            } else {
              hideLoader();
              alert('Error deleting watchlist item: ' + (result.error || 'Unknown error'));
            }
          } catch (error) {
            console.error('Error deleting watchlist item:', error);
            hideLoader();
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
        const marketName = cells[1].textContent;
        const exchangeName = cells[2].textContent;
        const currentPriceCell = parseFloat(cells[3].textContent.replace(/Rs\s?|₹/g, ''));
        
        // Populate and show the signal creation modal
        document.getElementById('signalCreateTitle').textContent = `Create ${isBuy ? 'BUY' : 'SELL'} Signal`;
        document.getElementById('signalStock').value = stockName;
        document.getElementById('signalTime').value = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
        // Fetch live price if current price is missing/zero
        const setEntryFrom = (p) => {
          document.getElementById('signalEntry').value = p;
          document.getElementById('signalCurrentPrice').value = p;
        };
        if (!Number.isFinite(currentPriceCell) || currentPriceCell<=0) {
          try {
            const resp = await fetch(`/api/price?symbol=${encodeURIComponent(stockName)}&exchange=${encodeURIComponent(exchangeName)}`);
            const data = await resp.json();
            if (data && data.success && typeof data.price === 'number') setEntryFrom(data.price);
            else setEntryFrom(0);
          } catch(e){ setEntryFrom(0); }
        } else {
          setEntryFrom(currentPriceCell);
        }
        document.getElementById('signalSide').value = isBuy ? 'BUY' : 'SELL';
        document.getElementById('signalProduct').value = marketName;
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
          const base = parseFloat(document.getElementById('signalCurrentPrice').value) || 0;
          const targetVal = isBuy ? base * (1 + tp/100) : base * (1 - tp/100);
          const stopVal = isBuy ? base * (1 - sp/100) : base * (1 + sp/100);
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
      const productName = document.getElementById('signalProduct').value;
      const exchangeName = document.getElementById('signalExchange').value;
      const entry = parseFloat(document.getElementById('signalEntry').value);
      const target = parseFloat(document.getElementById('signalTarget').value);
      const stopLoss = parseFloat(document.getElementById('signalStop').value);
      const notes = document.getElementById('signalNotes').value;
      const side = document.getElementById('signalSide').value;
      
      if (!stock || !Number.isFinite(entry) || !Number.isFinite(target) || !Number.isFinite(stopLoss)) {
        alert('Please fill target and stop loss');
        return;
      }
      
      let productId = null;
      try {
        if (productName) {
          const r = await fetch(`/api/products/${encodeURIComponent(productName)}`);
          const j = await r.json();
          if (j && j.success && j.data && j.data.id) productId = j.data.id;
        }
      } catch(e){}
      const body = {
        productId: productId,
        symbol: stock,
        exchange: exchangeName || null,
        entry: entry,
        target: target,
        stopLoss: stopLoss,
        signalType: side,
        notes: notes
      };
      
      try {
        showLoader();
        const response = await fetch('/api/signals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Subscribe to live prices via WebSocket after creating signal
          if (window.wsManager) {
            try {
              await window.wsManager.connect();
              const subscribed = window.wsManager.subscribe([{ symbol: stock, exchange: exchangeName }]);
              console.log(`Subscribed to live prices for signal ${exchangeName}:${stock}`, subscribed);
            } catch (wsError) {
              console.warn('Failed to subscribe to WebSocket for live prices:', wsError);
            }
          }
          
          const signalModal = bootstrap.Modal.getInstance(document.getElementById('signalCreateModal'));
          signalModal.hide();
          window.location.reload(); // Reload to show updated data
        } else {
          hideLoader();
          alert('Error creating signal: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error creating signal:', error);
        hideLoader();
        alert('Error creating signal');
      }
    });
  }

  // Handle signal actions (activate, close, delete)
  const signalsBody = document.getElementById('signalsBody');
  const signalCloseModal = new bootstrap.Modal(document.getElementById('signalCloseModal'));
  const signalEditModal = new bootstrap.Modal(document.getElementById('signalEditModal'));
  
  if (signalsBody) {
    signalsBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.saction;
      const signalId = btn.dataset.sid;

      try {
        showLoader();
        let endpoint = '';
        let method = 'PUT';
        
        switch (action) {
          case 'edit':
            const row = e.target.closest('tr');
            const cells = row.querySelectorAll('td');
            document.getElementById('editSignalId').value = signalId;
            document.getElementById('editSignalStock').value = cells[1].textContent.trim();
            document.getElementById('editSignalType').value = cells[4].textContent.trim();
            document.getElementById('editSignalEntry').value = parseFloat(cells[5].textContent.replace(/Rs\s?|₹/g, '')) || '';
            document.getElementById('editSignalTarget').value = parseFloat(cells[6].textContent.replace(/Rs\s?|₹/g, '')) || '';
            document.getElementById('editSignalStop').value = parseFloat(cells[7].textContent.replace(/Rs\s?|₹/g, '')) || '';
            document.getElementById('editSignalNotes').value = '';
            hideLoader();
            signalEditModal.show();
            return;
          case 'close':
            console.log('UI close click', { signalId });
            endpoint = `/api/signals/${signalId}/close`;
            method = 'POST';
            break;
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

        console.log('UI close request', { endpoint, method });
        const response = await fetch(endpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log('UI close response', { ok: response.ok, status: response.status });
        const result = await response.json();
        console.log('UI close parsed', result);
        
        if (result.success) {
          window.location.reload(); // Reload to show updated data
        } else {
          hideLoader();
          alert('Error updating signal: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error updating signal:', error);
        hideLoader();
        alert('Error updating signal');
      }
    });
  }

  // Function to show close signal modal
  function showCloseModal(signalId, row) {
    const cells = row.querySelectorAll('td');
    
    // Populate modal with signal data
    document.getElementById('closeSignalId').value = signalId;
    document.getElementById('closeSignalStock').value = cells[1].textContent;
    document.getElementById('closeSignalType').value = cells[4].textContent;
    document.getElementById('closeSignalEntry').value = parseFloat(cells[5].textContent.replace(/Rs\s?|₹/g, ''));
    document.getElementById('closeSignalTarget').value = parseFloat(cells[6].textContent.replace(/Rs\s?|₹/g, ''));
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
      const notes = document.getElementById('closeSignalNotes').value;
      if (!signalId) return;
      try {
        showLoader();
        console.log('UI modal close request', { signalId, notes });
        const response = await fetch(`/api/signals/${signalId}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes })
        });
        console.log('UI modal close response', { ok: response.ok, status: response.status });
        const result = await response.json();
        console.log('UI modal close parsed', result);
        if (result.success) {
          signalCloseModal.hide();
          window.location.reload();
        } else {
          hideLoader();
          alert('Error closing signal: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error closing signal:', error);
        hideLoader();
        alert('Error closing signal');
      }
    });
  }

  const saveEditSignalBtn = document.getElementById('saveEditSignalBtn');
  if (saveEditSignalBtn) {
    saveEditSignalBtn.addEventListener('click', async () => {
      const id = document.getElementById('editSignalId').value;
      const entry = parseFloat(document.getElementById('editSignalEntry').value);
      const target = parseFloat(document.getElementById('editSignalTarget').value);
      const stopLoss = parseFloat(document.getElementById('editSignalStop').value);
      const notes = document.getElementById('editSignalNotes').value;
      if (!id) return;
      try {
        showLoader();
        const res = await fetch(`/api/signals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry, target, stopLoss, notes })
        });
        const json = await res.json();
        if (json && json.success) {
          signalEditModal.hide();
          window.location.reload();
        } else {
          hideLoader();
          alert('Error updating signal: ' + (json.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error updating signal:', err);
        hideLoader();
        alert('Error updating signal');
      }
    });
  }
  const watchModalEl = document.getElementById('watchModal')
  const signalCreateModalEl = document.getElementById('signalCreateModal')
  const signalCloseModalEl = document.getElementById('signalCloseModal')

  watchModalEl?.addEventListener('hide.bs.modal', () => { showLoader() })
  signalCreateModalEl?.addEventListener('hide.bs.modal', () => { showLoader() })
  signalCloseModalEl?.addEventListener('hide.bs.modal', () => { showLoader() })
  watchModalEl?.addEventListener('hidden.bs.modal', () => { window.location.reload() })
  signalCreateModalEl?.addEventListener('hidden.bs.modal', () => { window.location.reload() })
  signalCloseModalEl?.addEventListener('hidden.bs.modal', () => { window.location.reload() })
  // WebSocket Integration using wsManager
  async function initWebSockets() {
    if (!window.wsManager) {
      console.warn('wsManager not found, skipping WebSocket initialization');
      return;
    }

    try {
      await window.wsManager.connect();
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }

    const subscriptions = [];
    const symbolMap = new Map(); // Map "exchange:symbol" to array of callback functions

    function mapDefaultExchange(prod) {
        const s = String(prod||'').toLowerCase();
        if (s === 'crypto') return 'BINANCE';
        if (s === 'stocks' || s === 'options') return 'NSE';
        if (s === 'forex') return 'FOREX';
        if (s === 'commodity') return 'COMEX';
        return 'NSE'; // Default fallback
    }

    // 1. Process Watchlist Table
    const watchlistTbl = document.getElementById('watchlistBody');
    if (watchlistTbl) {
      const rows = Array.from(watchlistTbl.querySelectorAll('tr'));
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const symbol = String(cells[0]?.textContent || '').trim();
        const product = String(cells[1]?.textContent || '').trim();
        const exCell = String(cells[2]?.textContent || '').trim();
        const exchange = exCell && exCell !== '-' ? exCell : mapDefaultExchange(product);
        const priceCell = cells[3];

        if (symbol && priceCell) {
          subscriptions.push({ symbol, exchange });
          const key = `${exchange}:${symbol}`.toUpperCase().replace(/\s+/g, '');
          if (!symbolMap.has(key)) symbolMap.set(key, []);
          
          symbolMap.get(key).push((data) => {
             if (Number.isFinite(data.price)) {
               priceCell.textContent = `Rs ${data.price.toFixed(2)}`;
             }
          });
        }
      });
    }

    // 2. Process Signals Table
    const signalsTbl = document.getElementById('signalsBody');
    if (signalsTbl) {
      const rows = Array.from(signalsTbl.querySelectorAll('tr'));
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const symbolCell = cells[1]; // Symbol is in 2nd column
        const symbol = String(symbolCell?.textContent || '').trim();
        const exCell = String(cells[2]?.textContent || '').trim();
        const exchange = exCell && exCell !== '-' ? exCell : 'NSE';
        const priceCell = cells[3]; // Live Price is in 4th column
        
        if (symbol && priceCell) {
           subscriptions.push({ symbol, exchange });
           const key = `${exchange}:${symbol}`.toUpperCase().replace(/\s+/g, '');
           if (!symbolMap.has(key)) symbolMap.set(key, []);
           
           symbolMap.get(key).push((data) => {
              const price = data.price;
              if (Number.isFinite(price)) {
                priceCell.textContent = `Rs ${price.toFixed(2)}`;
                
                // Update P&L
                const typeTxt = String(cells[4]?.textContent || '').trim().toUpperCase();
                const entryVal = parseFloat(String(cells[5]?.textContent || '').replace(/Rs\s?|₹/g, ''));
                const plCell = cells[10];
                
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

    // 3. Subscribe and Listen
    if (subscriptions.length > 0) {
      window.wsManager.subscribe(subscriptions);
      
      window.wsManager.on('price_update', (data) => {
        // Log received price for debugging
        console.log(`[Price Update] ${data.exchange}:${data.symbol} = Rs ${data.price}`);
        
        const key = `${data.exchange}:${data.symbol}`.toUpperCase().replace(/\s+/g, '');
        const handlers = symbolMap.get(key);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      });
    }
  }

  initWebSockets();
});
  // Option symbol generation for dashboard modal
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

  // Autofill Current Price from TV for underlying/exchange changes
  async function autofillCurrentPriceTV() {
    const underlying = (document.getElementById('optionUnderlying')?.value || '').trim();
    const exchange = (document.getElementById('optionExchange')?.value || '').trim();
    const cpInput = document.getElementById('watchCurrentPrice');
    if (!underlying || !exchange || !cpInput) return;
    try {
      const resp = await fetch(`/api/price?symbol=${encodeURIComponent(underlying)}&exchange=${encodeURIComponent(exchange)}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data && data.success && typeof data.price === 'number' && !isNaN(data.price)) {
        cpInput.value = data.price;
      }
    } catch (e) {}
  }
  document.getElementById('optionUnderlying')?.addEventListener('blur', autofillCurrentPriceTV);
  document.getElementById('optionExchange')?.addEventListener('change', autofillCurrentPriceTV);

  // When user changes selected generated option, fetch its price
  // Removed price autofill to form; prices are fetched when needed
  // Enable Bootstrap tooltips for buttons
  try {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.forEach(el => { try { new bootstrap.Tooltip(el) } catch(e){} })
  } catch(e) {}
