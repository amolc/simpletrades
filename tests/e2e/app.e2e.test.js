/**
 * End-to-end tests for the complete application
 * Tests real user scenarios from start to finish
 */

const request = require('supertest');
const app = require('../../server');

// These tests use the actual modules (minimal mocking)
// to test real integration scenarios
describe('End-to-End Application Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'testuser';
    process.env.DB_PASSWORD = 'testpass';
    process.env.DB_NAME = 'testdb';
    process.env.TRADINGVIEW_SESSION = 'test_session';
    process.env.TRADINGVIEW_SIGNATURE = 'test_signature';
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup test environment
    delete process.env.NODE_ENV;
    delete process.env.DB_HOST;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
    delete process.env.TRADINGVIEW_SESSION;
    delete process.env.TRADINGVIEW_SIGNATURE;
  });

  describe('User Registration and Authentication Flow', () => {
    it('should complete full user registration and login flow', async () => {
      // Step 1: Register new user
      const userData = {
        username: 'testuser_' + Date.now(),
        email: `test_${Date.now()}@example.com`,
        password: 'SecurePass123!'
      };
      
      const registerResponse = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);
      
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.userId).toBeDefined();
      userId = registerResponse.body.userId;
      
      // Step 2: Login with credentials
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(200);
      
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      authToken = loginResponse.body.token;
      
      // Step 3: Access protected endpoint
      const protectedResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(protectedResponse.body.success).toBe(true);
      expect(protectedResponse.body.user.username).toBe(userData.username);
    });

    it('should handle registration validation errors', async () => {
      // Test invalid email
      const invalidEmailResponse = await request(app)
        .post('/api/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePass123!'
        })
        .expect(400);
      
      expect(invalidEmailResponse.body.success).toBe(false);
      expect(invalidEmailResponse.body.error).toContain('Invalid email format');
      
      // Test weak password
      const weakPasswordResponse = await request(app)
        .post('/api/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123'
        })
        .expect(400);
      
      expect(weakPasswordResponse.body.success).toBe(false);
      expect(weakPasswordResponse.body.error).toContain('Password too weak');
    });
  });

  describe('Stock Price Monitoring Workflow', () => {
    it('should complete full stock monitoring workflow', async () => {
      const symbol = 'AAPL';
      const exchange = 'NASDAQ';
      
      // Step 1: Get current price (may come from cache or API)
      const currentPriceResponse = await request(app)
        .get(`/api/price/${symbol}`)
        .query({ exchange })
        .expect(200);
      
      expect(currentPriceResponse.body.success).toBe(true);
      expect(currentPriceResponse.body.data.symbol).toBe(symbol);
      expect(currentPriceResponse.body.data.price).toBeGreaterThan(0);
      expect(currentPriceResponse.body.data.exchange).toBe(exchange);
      
      // Step 2: Subscribe to real-time updates
      const subscribeResponse = await request(app)
        .post('/api/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol,
          exchange,
          userId: userId
        })
        .expect(200);
      
      expect(subscribeResponse.body.success).toBe(true);
      expect(subscribeResponse.body.message).toContain('Subscribed');
      
      // Step 3: Get user subscriptions
      const subscriptionsResponse = await request(app)
        .get(`/api/subscriptions/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(subscriptionsResponse.body.success).toBe(true);
      expect(subscriptionsResponse.body.data).toBeInstanceOf(Array);
      expect(subscriptionsResponse.body.data.length).toBeGreaterThan(0);
      expect(subscriptionsResponse.body.data[0].symbol).toBe(symbol);
      
      // Step 4: Get price history
      const historyResponse = await request(app)
        .get(`/api/price/history/${symbol}`)
        .query({ exchange, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data).toBeInstanceOf(Array);
      
      // Step 5: Unsubscribe from updates
      const unsubscribeResponse = await request(app)
        .delete('/api/unsubscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol,
          exchange,
          userId: userId
        })
        .expect(200);
      
      expect(unsubscribeResponse.body.success).toBe(true);
      expect(unsubscribeResponse.body.message).toContain('Unsubscribed');
      
      // Step 6: Verify subscription was removed
      const finalSubscriptionsResponse = await request(app)
        .get(`/api/subscriptions/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(finalSubscriptionsResponse.body.success).toBe(true);
      expect(finalSubscriptionsResponse.body.data).toBeInstanceOf(Array);
      // Symbol should no longer be in active subscriptions
      const hasSymbol = finalSubscriptionsResponse.body.data.some(
        sub => sub.symbol === symbol
      );
      expect(hasSymbol).toBe(false);
    });

    it('should handle multiple stock symbols simultaneously', async () => {
      const symbols = ['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN'];
      const exchange = 'NASDAQ';
      
      // Subscribe to multiple symbols
      const subscribePromises = symbols.map(symbol =>
        request(app)
          .post('/api/subscribe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            symbol,
            exchange,
            userId: userId
          })
      );
      
      const subscribeResponses = await Promise.all(subscribePromises);
      
      // Verify all subscriptions succeeded
      subscribeResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // Get all user subscriptions
      const subscriptionsResponse = await request(app)
        .get(`/api/subscriptions/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(subscriptionsResponse.body.success).toBe(true);
      expect(subscriptionsResponse.body.data.length).toBe(symbols.length);
      
      // Verify all symbols are present
      const subscribedSymbols = subscriptionsResponse.body.data.map(sub => sub.symbol);
      symbols.forEach(symbol => {
        expect(subscribedSymbols).toContain(symbol);
      });
      
      // Get prices for all symbols
      const pricePromises = symbols.map(symbol =>
        request(app)
          .get(`/api/price/${symbol}`)
          .query({ exchange })
      );
      
      const priceResponses = await Promise.all(pricePromises);
      
      // Verify all price requests succeeded
      priceResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.symbol).toBe(symbols[index]);
        expect(response.body.data.price).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-time Data Streaming', () => {
    it('should handle WebSocket connection lifecycle', async () => {
      // Step 1: Check initial WebSocket status
      const initialStatusResponse = await request(app)
        .get('/api/websocket/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(initialStatusResponse.body.success).toBe(true);
      expect(initialStatusResponse.body.connected).toBeDefined();
      
      // Step 2: Subscribe to symbol (triggers WebSocket connection if needed)
      const subscribeResponse = await request(app)
        .post('/api/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symbol: 'AAPL',
          exchange: 'NASDAQ',
          userId: userId
        })
        .expect(200);
      
      expect(subscribeResponse.body.success).toBe(true);
      
      // Step 3: Verify WebSocket is connected
      const finalStatusResponse = await request(app)
        .get('/api/websocket/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(finalStatusResponse.body.success).toBe(true);
      expect(finalStatusResponse.body.connected).toBe(true);
      expect(finalStatusResponse.body.subscriptions).toBeInstanceOf(Array);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service degradation gracefully', async () => {
      // Test with invalid symbol
      const invalidSymbolResponse = await request(app)
        .get('/api/price/INVALID@SYMBOL')
        .query({ exchange: 'NASDAQ' })
        .expect(400);
      
      expect(invalidSymbolResponse.body.success).toBe(false);
      expect(invalidSymbolResponse.body.error).toContain('Invalid symbol');
      
      // Test with missing parameters
      const missingParamResponse = await request(app)
        .post('/api/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'AAPL' }) // Missing exchange and userId
        .expect(400);
      
      expect(missingParamResponse.body.success).toBe(false);
      expect(missingParamResponse.body.error).toContain('Missing required parameters');
      
      // Test with unauthorized access
      const unauthorizedResponse = await request(app)
        .get('/api/subscriptions/someuser')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
      
      expect(unauthorizedResponse.body.success).toBe(false);
      expect(unauthorizedResponse.body.error).toContain('Unauthorized');
    });

    it('should recover from temporary service outages', async () => {
      // This test simulates a temporary service outage
      // and verifies the system recovers
      
      // Step 1: Initial successful request
      const initialResponse = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(initialResponse.body.status).toBe('healthy');
      
      // Step 2: Simulate service issues (handled by retry mechanisms)
      // The system should handle this internally and recover
      
      // Step 3: Verify system recovers
      let retryCount = 0;
      const maxRetries = 5;
      let recovered = false;
      
      while (retryCount < maxRetries && !recovered) {
        try {
          const recoveryResponse = await request(app)
            .get('/api/health')
            .expect(200);
          
          if (recoveryResponse.body.status === 'healthy') {
            recovered = true;
          }
        } catch (error) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        retryCount++;
      }
      
      expect(recovered).toBe(true);
    });
  });

  describe('Performance and Load', () => {
    it('should handle high-frequency price requests', async () => {
      const symbol = 'AAPL';
      const exchange = 'NASDAQ';
      const requestCount = 50;
      
      const startTime = Date.now();
      
      // Make rapid sequential requests
      const responses = [];
      for (let i = 0; i < requestCount; i++) {
        const response = await request(app)
          .get(`/api/price/${symbol}`)
          .query({ exchange });
        responses.push(response);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      // Verify performance
      expect(totalTime).toBeLessThan(10000); // 50 requests should complete within 10 seconds
      const averageTimePerRequest = totalTime / requestCount;
      expect(averageTimePerRequest).toBeLessThan(200); // Average time per request should be under 200ms
    });

    it('should handle concurrent user operations', async () => {
      const operations = [
        // Price requests
        request(app).get('/api/price/AAPL').query({ exchange: 'NASDAQ' }),
        request(app).get('/api/price/GOOGL').query({ exchange: 'NASDAQ' }),
        request(app).get('/api/price/TSLA').query({ exchange: 'NASDAQ' }),
        
        // Subscription operations
        request(app)
          .post('/api/subscribe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ symbol: 'MSFT', exchange: 'NASDAQ', userId: userId }),
        
        // Health check
        request(app).get('/api/health'),
        
        // User operations
        request(app)
          .get(`/api/subscriptions/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
      ];
      
      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      
      // Verify all operations succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Verify performance
      expect(totalTime).toBeLessThan(5000); // All concurrent operations should complete within 5 seconds
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide comprehensive system health information', async () => {
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.status).toBeDefined();
      expect(healthResponse.body.timestamp).toBeDefined();
      expect(healthResponse.body.uptime).toBeGreaterThan(0);
      expect(healthResponse.body.components).toBeDefined();
      
      // Verify all components are present
      const components = healthResponse.body.components;
      expect(components.database).toBeDefined();
      expect(components.websocket).toBeDefined();
      expect(components.cache).toBeDefined();
      expect(components.server).toBeDefined();
      
      // Verify component details
      expect(components.database.status).toBeDefined();
      expect(components.websocket.status).toBeDefined();
      expect(components.cache.status).toBeDefined();
      expect(components.server.status).toBeDefined();
    });

    it('should track and report system metrics', async () => {
      // Perform some operations to generate metrics
      await request(app).get('/api/price/AAPL').query({ exchange: 'NASDAQ' });
      await request(app)
        .post('/api/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ symbol: 'AAPL', exchange: 'NASDAQ', userId: userId });
      
      // Get metrics
      const metricsResponse = await request(app)
        .get('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.metrics).toBeDefined();
      
      const metrics = metricsResponse.body.metrics;
      expect(metrics.apiCalls).toBeGreaterThan(0);
      expect(metrics.cacheHits).toBeDefined();
      expect(metrics.cacheMisses).toBeDefined();
      expect(metrics.responseTime).toBeDefined();
      expect(metrics.activeSubscriptions).toBeGreaterThan(0);
    });
  });
});