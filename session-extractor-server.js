const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Serve the HTML extractor
  if (req.url === '/' || req.url === '/extractor') {
    fs.readFile(path.join(__dirname, 'tradingview-session-extractor.html'), (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading extractor');
        return;
      }
      
      res.writeHead(200, { 
        'Content-Type': 'text/html',
        ...corsHeaders 
      });
      res.end(data);
    });
  }
  
  // Handle session data submission
  else if (req.url === '/submit-session' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const sessionData = JSON.parse(body);
        console.log('Received session data:', sessionData);
        
        // Save to file
        fs.writeFileSync('tradingview-session-data.json', JSON.stringify(sessionData, null, 2));
        console.log('Session data saved to tradingview-session-data.json');
        
        // Generate API command
        const tvSession = sessionData.tv_session || sessionData.sessionid;
        const tvSignature = sessionData.tv_signature || '';
        
        const apiCommand = `curl -X POST http://localhost:3001/api/tradingview/token \\\n  -H "Content-Type: application/json" \\\n  -d '{"token":"${tvSession}","signature":"${tvSignature}"}'`;
        
        console.log('API Command to use:');
        console.log(apiCommand);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Session data received',
          apiCommand: apiCommand 
        }));
        
      } catch (error) {
        console.error('Error processing session data:', error);
        res.writeHead(400, { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
  }
  
  // Health check
  else if (req.url === '/health') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      ...corsHeaders 
    });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }
  
  else {
    res.writeHead(404, corsHeaders);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Session extractor server running on http://localhost:${PORT}`);
  console.log(`📋 Open http://localhost:${PORT}/extractor in your browser`);
  console.log(`🔍 After logging in to TradingView, use the extractor to get session tokens`);
});

module.exports = server;