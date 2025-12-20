document.addEventListener('DOMContentLoaded',()=>{
  const params=new URLSearchParams(window.location.search);
  const start=params.get('start');
  const product=decodeURIComponent(window.location.pathname.split('/').pop());
  document.getElementById('sigProduct').textContent=product;
  document.getElementById('sigStart').textContent=start?new Date(start).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'}):'—';
  const token=localStorage.getItem('authToken');
  const load=async()=>{
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),30000); // 30 second timeout
    try{
      const res=await fetch('/api/signals',{signal:controller.signal});
      clearTimeout(timeoutId);
      const data=await res.json();
      const filteredSignals=(data.data||data||[]).filter(s=>{
        const created=new Date(s.createdAt).getTime();
        const min=start?new Date(start).getTime():0;
        const p=(s.product||'').toLowerCase();
        return created>=min && p===product.toLowerCase();
      });
      const body=document.getElementById('signalsBody');
      body.innerHTML=filteredSignals.map(s=>`<tr data-id="${s.id}">
        <td>${s.product||'—'}</td>
        <td>${s.exchange||'—'}</td>
        <td>${s.symbol||s.stock||'—'}</td>
        <td>${s.signalType}</td>
        <td>Rs ${Number(s.entry).toFixed(2)}</td>
        <td class="live-price">Loading...</td>
        <td>${s.exitPrice?`Rs ${Number(s.exitPrice).toFixed(2)}`:'—'}</td>
        <td class="pnl">${s.profitLoss!==null?`Rs ${Number(s.profitLoss).toFixed(2)}`:'—'}</td>
        <td>Rs ${Number(s.target).toFixed(2)}</td>
        <td>Rs ${Number(s.stopLoss).toFixed(2)}</td>
        <td>${s.entryDateTime?new Date(s.entryDateTime).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',hour12:false}):'—'}</td>
        <td>${s.exitDateTime?new Date(s.exitDateTime).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',hour12:false}):'—'}</td>
        <td><span class="badge ${s.status==='PROFIT'?'bg-success':s.status==='LOSS'?'bg-danger':'bg-warning'}">${s.status}</span></td>
      </tr>`).join('');

      // Collect symbols for WebSocket subscription
      const symbols = [];
      filteredSignals.forEach(s => {
        const sym = s.symbol || s.stock;
        const ex = s.exchange || 'NSE';
        if (sym && ex) {
          const fullSymbol = ex + ':' + sym;
          if (!symbols.includes(fullSymbol)) {
            symbols.push(fullSymbol);
          }
        }
      });

      console.log('📊 Collected symbols for subscription:', symbols);

      // Fetch initial prices using group API
      if (symbols.length > 0) {
        const symbolObjects = symbols.map(fullSymbol => {
          const [exchange, symbol] = fullSymbol.split(':');
          return { symbol, exchange };
        });

        fetch('/api/external-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(symbolObjects)
        })
        .then(response => response.json())
        .then(data => {
          console.log('📈 Initial prices fetched:', data);
          let priceArray = [];
          if (data && data.results && Array.isArray(data.results)) {
            priceArray = data.results;
          } else if (data && Array.isArray(data)) {
            priceArray = data;
          }
          priceArray.forEach(item => {
            let price = null;
            let symbol = item.symbol;
            let exchange = item.exchange;
            if (item.status === 'success' && item.data && item.data.length > 0 && item.data[0].close !== undefined && item.data[0].close !== null) {
              price = Number(item.data[0].close);
            } else if (item.price !== undefined && item.price !== null) {
              price = Number(item.price);
            }
            if (price !== null && symbol && exchange) {
              const fullSymbol = exchange + ':' + symbol;
              console.log('🔄 Updating initial price for', fullSymbol, 'to', price);
              updateLivePrice(fullSymbol, price);
            }
          });
        })
        .catch(error => console.error('❌ Error fetching initial prices:', error));
      }

      // Initialize WebSocket connection for live updates
      const ws = new WebSocket('wss://data.simpleincome.co/ws/stream/');

      ws.onopen = function(event) {
        console.log('Connected to StockData WebSocket');

        // Subscribe to symbols
        if (symbols.length > 0) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            symbols: symbols
          }));
        }
      };

      ws.onmessage = function(event) {
        console.log('WebSocket message received:', event.data);
        const message = JSON.parse(event.data);

        switch(message.type) {
          case 'connection':
            console.log('Connected:', message.client_id);
            break;

          case 'subscription':
            console.log('Subscription response:', message);
            if (message.status === 'success') {
              console.log('Subscribed to:', message.symbols);
            }
            break;

          case 'data':
            const symbol = message.symbol;
            let price = null;

            // Try different data formats
            if (message.data && message.data.latest_period && message.data.latest_period.close) {
              price = message.data.latest_period.close;
            } else if (message.data && typeof message.data === 'object' && message.data.close) {
              price = message.data.close;
            } else if (message.price) {
              price = message.price;
            } else if (message.data && typeof message.data === 'number') {
              price = message.data;
            }

            if (price !== null) {
              console.log(`${symbol}: Rs ${price.toFixed(2)} (format: ${typeof message.data})`);

              // Update UI with live price
              updateLivePrice(symbol, price);
            } else {
              console.log('No price found in data message:', message);
            }
            break;

          case 'error':
            console.error('WebSocket error:', message.message);
            break;

          default:
            console.log('Unknown message type:', message.type, message);
        }
      };

      ws.onerror = function(error) {
        console.error('WebSocket error:', error);
      };

      ws.onclose = function(event) {
        console.log('WebSocket connection closed');
      };

      // Fallback: Fetch individual prices if WebSocket/group API fails
      setTimeout(() => {
        filteredSignals.forEach(async (s) => {
          if (s.symbol && s.exchange) {
            const row = document.querySelector(`tr[data-id="${s.id}"]`);
            if (row && row.querySelector('.live-price').textContent === 'Loading...') {
              try {
                const priceRes = await fetch(`/api/price?symbol=${encodeURIComponent(s.symbol)}&exchange=${encodeURIComponent(s.exchange)}`);
                const priceData = await priceRes.json();
                if (priceData.success && priceData.price) {
                  const livePrice = Number(priceData.price);
                  updateLivePrice(s.exchange + ':' + s.symbol, livePrice);
                } else {
                  row.querySelector('.live-price').textContent = 'N/A';
                }
              } catch (error) {
                console.error('Error fetching price for', s.symbol, error);
                row.querySelector('.live-price').textContent = 'Error';
              }
            }
          }
        });
      }, 2000); // Wait 2 seconds for WebSocket to update

      // Function to update live price and P&L in UI
      function updateLivePrice(fullSymbol, price) {
        const [exchange, symbol] = fullSymbol.split(':');

        // Update signals table
        const rows = document.querySelectorAll('#signalsBody tr');
        rows.forEach(row => {
          const symbolCell = row.querySelector('td:nth-child(3)'); // Stock column
          const exchangeCell = row.querySelector('td:nth-child(2)'); // Exchange column
          if (symbolCell && exchangeCell) {
            const rowSymbol = symbolCell.textContent.trim();
            const rowExchange = (exchangeCell.textContent.trim() === '—') ? 'NSE' : exchangeCell.textContent.trim();

            if (rowSymbol === symbol && rowExchange === exchange) {
              // Update live price cell (column 6)
              const priceCell = row.querySelector('td:nth-child(6)');
              if (priceCell) {
                priceCell.textContent = `Rs ${price.toFixed(2)}`;
              }

              // Calculate and update live P&L (column 8) only for IN_PROGRESS signals
              const statusCell = row.querySelector('td:nth-child(13)'); // Status column
              if (statusCell && statusCell.textContent.includes('IN_PROGRESS')) {
                const signalTypeCell = row.querySelector('td:nth-child(4)'); // Type column
                const entryCell = row.querySelector('td:nth-child(5)'); // Entry column
                const pnlCell = row.querySelector('td:nth-child(8)'); // P&L column

                if (signalTypeCell && entryCell && pnlCell) {
                  const signalType = signalTypeCell.textContent.trim().toUpperCase();
                  const entryText = entryCell.textContent.trim().replace('Rs ', '');
                  const entryPrice = parseFloat(entryText);

                  if (!isNaN(entryPrice)) {
                    let pnl = 0;
                    if (signalType === 'BUY') {
                      pnl = price - entryPrice;
                    } else if (signalType === 'SELL') {
                      pnl = entryPrice - price;
                    }

                    const pnlText = pnl >= 0 ?
                      `<span class="text-success">Rs ${pnl.toFixed(2)}</span>` :
                      `<span class="text-danger">Rs ${Math.abs(pnl).toFixed(2)}</span>`;

                    pnlCell.innerHTML = pnlText;
                  }
                }
              }

              // Add highlight effect
              row.classList.add('price-updated');
              setTimeout(() => {
                row.classList.remove('price-updated');
              }, 1000);

              console.log('🔄 Updated price and P&L for signal', fullSymbol, 'to', price);
            }
          }
        });
      }
    }catch(error){
      console.error('Error loading signals:',error);
      document.getElementById('signalsBody').innerHTML='<tr><td colspan="13" class="text-center text-danger">Error loading signals</td></tr>';
    }
  };
  load();
});
