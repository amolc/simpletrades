
#### Example WebSocket Client Connection (JavaScript)

```javascript
const ws = new WebSocket('wss://data.simpleincome.co/ws/stream/');

ws.onopen = function(event) {
    console.log('Connected to StockData WebSocket');

    // Subscribe to symbols
    ws.send(JSON.stringify({
        action: 'subscribe',
        symbols: ['BINANCE:BTCUSDT', 'NSE:RELIANCE']
    }));
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);

    switch(message.type) {
        case 'connection':
            console.log('Connected:', message.client_id);
            break;

        case 'subscription':
            if (message.status === 'success') {
                console.log('Subscribed to:', message.symbols);
            }
            break;

        case 'data':
            const symbol = message.symbol;
            const periods = message.data.periods;

            if (periods && periods.length > 0) {
                const latestPeriod = periods[periods.length - 1];
                const price = latestPeriod[4]; // Close price
                const volume = latestPeriod[5];

                console.log(`${symbol}: $${price.toFixed(2)} (Vol: ${volume})`);
            }
            break;

        case 'error':
            console.error('WebSocket error:', message.message);
            break;
    }
};

ws.onerror = function(error) {
    console.error('WebSocket error:', error);
};

ws.onclose = function(event) {
    console.log('WebSocket connection closed');
};
```

#### WebSocket Actions

- **`subscribe`**: Subscribe to symbols for real-time updates
  ```json
  {
    "action": "subscribe",
    "symbols": ["BINANCE:BTCUSDT", "NSE:RELIANCE"]
  }
  ```

- **`unsubscribe`**: Unsubscribe from symbols
  ```json
  {
    "action": "unsubscribe",
    "symbols": ["BINANCE:BTCUSDT"]
  }
  ```

- **`status`**: Get connection status
  ```json
  {
    "action": "status"
  }