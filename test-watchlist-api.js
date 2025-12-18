const http = require('http');

function testWatchlistAPI() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/watchlist',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 5000
  };

  const postData = JSON.stringify({
    stockName: 'TEST_STOCK',
    product: 'Stocks',
    exchange: 'NSE',
    currentPrice: 100.50,
    alertPrice: 100.50
  });

  console.log('Testing watchlist API...');
  console.log('Request:', postData);

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('✅ Watchlist API is working!');
      } else {
        console.log('❌ Watchlist API failed with status:', res.statusCode);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    console.log('Server might not be running or API endpoint not available');
  });

  req.on('timeout', () => {
    console.error('❌ Request timed out');
    req.destroy();
  });

  req.write(postData);
  req.end();
}

function testWatchlistAPI() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/watchlist',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 5000
  };

  const postData = JSON.stringify({
    stockName: 'TEST_STOCK',
    product: 'Stocks',
    exchange: 'NSE',
    currentPrice: 100.50,
    alertPrice: 100.50
  });

  console.log('Testing watchlist API...');
  console.log('Request:', postData);

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('✅ Watchlist API is working!');
      } else {
        console.log('❌ Watchlist API failed with status:', res.statusCode);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    console.log('Server might not be running or API endpoint not available');
  });

  req.on('timeout', () => {
    console.error('❌ Request timed out');
    req.destroy();
  });

  req.write(postData);
  req.end();
}

// Start directly with watchlist test
testWatchlistAPI();