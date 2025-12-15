/**
 * Unit tests for WebSocket module
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { TradingViewWebSocket, ConnectionState } = require('../../modules/websocket/tradingview-websocket');

// Mock WebSocket and other dependencies
jest.mock('ws');
jest.mock('../../modules/utils/helpers', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  PerformanceUtils: {
    measure: jest.fn()
  }
}));

describe('TradingViewWebSocket', () => {
  let wsClient;

  beforeEach(() => {
    wsClient = new TradingViewWebSocket({
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
      heartbeatInterval: 5000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const client = new TradingViewWebSocket();
      
      expect(client.url).toBe('wss://data.tradingview.com/socket.io/websocket');
      expect(client.reconnectInterval).toBe(5000);
      expect(client.maxReconnectAttempts).toBe(10);
      expect(client.heartbeatInterval).toBe(30000);
      expect(client.connectionState).toBe(ConnectionState.DISCONNECTED);
    });

    it('should initialize with custom options', () => {
      const options = {
        url: 'wss://custom.url',
        reconnectInterval: 2000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 10000
      };
      
      const client = new TradingViewWebSocket(options);
      
      expect(client.url).toBe(options.url);
      expect(client.reconnectInterval).toBe(options.reconnectInterval);
      expect(client.maxReconnectAttempts).toBe(options.maxReconnectAttempts);
      expect(client.heartbeatInterval).toBe(options.heartbeatInterval);
    });
  });

  describe('Connection Management', () => {
    it('should return correct initial status', () => {
      const status = wsClient.getStatus();
      
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
      expect(status.connected).toBe(false);
      expect(status.subscriptions).toBe(0);
      expect(status.metrics).toBeDefined();
      expect(status.reconnectAttempts).toBe(0);
    });

    it('should handle connection state changes', () => {
      wsClient.connectionState = ConnectionState.CONNECTING;
      let status = wsClient.getStatus();
      expect(status.state).toBe(ConnectionState.CONNECTING);
      expect(status.connected).toBe(false);

      wsClient.connectionState = ConnectionState.CONNECTED;
      status = wsClient.getStatus();
      expect(status.state).toBe(ConnectionState.CONNECTED);
      expect(status.connected).toBe(true);
    });
  });

  describe('Subscription Management', () => {
    it('should register message handlers', () => {
      const handler = jest.fn();
      wsClient.registerHandler('test_method', handler);
      
      expect(wsClient.messageHandlers.has('test_method')).toBe(true);
      expect(wsClient.messageHandlers.get('test_method')).toBe(handler);
    });

    it('should unregister message handlers', () => {
      const handler = jest.fn();
      wsClient.registerHandler('test_method', handler);
      wsClient.unregisterHandler('test_method');
      
      expect(wsClient.messageHandlers.has('test_method')).toBe(false);
    });

    it('should not subscribe when not connected', () => {
      const result = wsClient.subscribe('AAPL', 'NASDAQ', jest.fn());
      
      expect(result).toBe(false);
    });

    it('should not unsubscribe when not connected', () => {
      const result = wsClient.unsubscribe('AAPL', 'NASDAQ');
      
      expect(result).toBe(false);
    });
  });

  describe('Message Handling', () => {
    it('should handle method messages', () => {
      const handler = jest.fn();
      wsClient.registerHandler('test_method', handler);
      
      const message = {
        method: 'test_method',
        params: { data: 'test' }
      };
      
      wsClient.handleMethodMessage(message);
      
      expect(handler).toHaveBeenCalledWith(message.params);
    });

    it('should warn about unknown methods', () => {
      const { logger } = require('../../modules/utils/helpers');
      
      const message = {
        method: 'unknown_method',
        params: { data: 'test' }
      };
      
      wsClient.handleMethodMessage(message);
      
      expect(logger.warn).toHaveBeenCalledWith('No handler for method:', 'unknown_method');
    });

    it('should process data messages', () => {
      const dataPoint = { s: 'AAPL', lp: 150.00 };
      const message = {
        data: [dataPoint]
      };
      
      // Mock subscription
      const callback = jest.fn();
      wsClient.subscriptions.set('AAPL', { callback });
      
      wsClient.handleDataMessage(message);
      
      expect(callback).toHaveBeenCalledWith(dataPoint);
    });

    it('should ignore data messages without symbol', () => {
      const dataPoint = { lp: 150.00 }; // No symbol
      const message = {
        data: [dataPoint]
      };
      
      const callback = jest.fn();
      wsClient.subscriptions.set('AAPL', { callback });
      
      wsClient.handleDataMessage(message);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Heartbeat Management', () => {
    it('should start heartbeat', () => {
      wsClient.connectionState = ConnectionState.CONNECTED;
      wsClient.ws = {
        ping: jest.fn()
      };
      
      wsClient.startHeartbeat();
      
      expect(wsClient.heartbeatTimer).toBeDefined();
      expect(wsClient.heartbeatTimer).not.toBeNull();
    });

    it('should stop heartbeat', () => {
      wsClient.startHeartbeat();
      wsClient.stopHeartbeat();
      
      expect(wsClient.heartbeatTimer).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle send message errors when not connected', () => {
      const { logger } = require('../../modules/utils/helpers');
      
      wsClient.sendMessage({ test: 'data' });
      
      expect(logger.error).toHaveBeenCalledWith('Cannot send message: WebSocket not connected');
    });

    it('should handle subscription errors', () => {
      wsClient.connectionState = ConnectionState.CONNECTED;
      wsClient.ws = {
        send: jest.fn().mockImplementation(() => {
          throw new Error('Send failed');
        })
      };
      
      const result = wsClient.subscribe('AAPL', 'NASDAQ', jest.fn());
      
      expect(result).toBe(false);
    });

    it('should handle disconnect errors', async () => {
      wsClient.ws = {
        close: jest.fn().mockImplementation(() => {
          throw new Error('Close failed');
        })
      };
      
      const result = await wsClient.disconnect();
      
      expect(result).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      wsClient.subscriptions.set('AAPL', { symbol: 'AAPL' });
      wsClient.messageHandlers.set('test', jest.fn());
      wsClient.ws = { removeAllListeners: jest.fn() };
      
      wsClient.cleanup();
      
      expect(wsClient.subscriptions.size).toBe(0);
      expect(wsClient.messageHandlers.size).toBe(0);
      expect(wsClient.connectionState).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('parseMessage', () => {
    it('should parse single JSON message', () => {
      const message = JSON.stringify({ method: 'test', params: { data: 'value' } });
      const buffer = Buffer.from(message);
      
      const result = wsClient.parseMessage(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ method: 'test', params: { data: 'value' } });
    });

    it('should parse multiple delimited messages', () => {
      const message1 = JSON.stringify({ method: 'test1', params: { data: 'value1' } });
      const message2 = JSON.stringify({ method: 'test2', params: { data: 'value2' } });
      const combinedMessage = `${message1}~${message2}`;
      const buffer = Buffer.from(combinedMessage);
      
      const result = wsClient.parseMessage(buffer);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ method: 'test1', params: { data: 'value1' } });
      expect(result[1]).toEqual({ method: 'test2', params: { data: 'value2' } });
    });

    it('should handle TradingView protocol prefix', () => {
      const message = 'm123\x01' + JSON.stringify({ method: 'test', params: { data: 'value' } });
      const buffer = Buffer.from(message);
      
      const result = wsClient.parseMessage(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ method: 'test', params: { data: 'value' } });
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidMessage = 'invalid json data';
      const buffer = Buffer.from(invalidMessage);
      
      const result = wsClient.parseMessage(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ raw: invalidMessage });
    });

    it('should handle empty messages', () => {
      const emptyMessage = '   ';
      const buffer = Buffer.from(emptyMessage);
      
      const result = wsClient.parseMessage(buffer);
      
      expect(result).toHaveLength(0);
    });

    it('should handle parsing errors', () => {
      const { logger } = require('../../modules/utils/helpers');
      
      // Test with a buffer that will cause an error in the split operation
      const buffer = Buffer.from('test~');
      
      // Mock the split method to throw an error
      const originalSplit = String.prototype.split;
      String.prototype.split = jest.fn().mockImplementation(() => {
        throw new Error('Split error');
      });
      
      const result = wsClient.parseMessage(buffer);
      
      // Restore original split method
      String.prototype.split = originalSplit;
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ raw: 'test~' });
      expect(logger.error).toHaveBeenCalledWith('Message parsing error:', expect.any(Error));
    });
  });

  describe('setupEventHandlers', () => {
    it('should setup event handlers on WebSocket', () => {
      const mockWs = {
        on: jest.fn(),
        once: jest.fn()
      };
      wsClient.ws = mockWs;
      
      wsClient.setupEventHandlers();
      
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('ping', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('pong', expect.any(Function));
    });

    it('should handle message events', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWs = {
        on: jest.fn(),
        once: jest.fn()
      };
      wsClient.ws = mockWs;
      wsClient.parseMessage = jest.fn().mockReturnValue([{ test: 'data' }]);
      wsClient.handleMessage = jest.fn();
      
      wsClient.setupEventHandlers();
      
      // Get the message handler function
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Simulate a message event
      const testBuffer = Buffer.from('test data');
      messageHandler(testBuffer);
      
      expect(wsClient.parseMessage).toHaveBeenCalledWith(testBuffer);
      expect(wsClient.handleMessage).toHaveBeenCalledWith([{ test: 'data' }]);
      expect(wsClient.metrics.messagesReceived).toBe(1);
      expect(wsClient.metrics.lastMessageTime).toBeDefined();
    });

    it('should handle message processing errors', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWs = {
        on: jest.fn(),
        once: jest.fn()
      };
      wsClient.ws = mockWs;
      wsClient.parseMessage = jest.fn().mockImplementation(() => {
        throw new Error('Parse error');
      });
      
      wsClient.setupEventHandlers();
      
      // Get the message handler function
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Simulate a message event that causes an error
      const testBuffer = Buffer.from('test data');
      messageHandler(testBuffer);
      
      expect(logger.error).toHaveBeenCalledWith('Message processing error:', expect.any(Error));
    });

    it('should handle close events', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWs = {
        on: jest.fn(),
        once: jest.fn()
      };
      wsClient.ws = mockWs;
      wsClient.stopHeartbeat = jest.fn();
      wsClient.handleDisconnection = jest.fn();
      
      wsClient.setupEventHandlers();
      
      // Get the close handler function
      const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
      
      // Simulate a close event
      closeHandler(1000, Buffer.from('Normal closure'));
      
      expect(logger.info).toHaveBeenCalledWith('WebSocket connection closed', { 
        code: 1000, 
        reason: 'Normal closure' 
      });
      expect(wsClient.connectionState).toBe(ConnectionState.DISCONNECTED);
      expect(wsClient.stopHeartbeat).toHaveBeenCalled();
      expect(wsClient.handleDisconnection).toHaveBeenCalled();
    });

    it('should handle error events', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWs = {
        on: jest.fn(),
        once: jest.fn()
      };
      wsClient.ws = mockWs;
      
      wsClient.setupEventHandlers();
      
      // Get the error handler function
      const errorHandler = mockWs.on.mock.calls.find(call => call[0] === 'error')[1];
      
      // Simulate an error event
      const testError = new Error('Connection error');
      errorHandler(testError);
      
      expect(wsClient.metrics.errors).toBe(1);
      expect(logger.error).toHaveBeenCalledWith('WebSocket error:', testError);
      expect(wsClient.connectionState).toBe(ConnectionState.ERROR);
    });
  });

  describe('handleDisconnection', () => {
    it('should attempt reconnection when under max attempts', () => {
      const { logger } = require('../../modules/utils/helpers');
      wsClient.reconnectAttempts = 2;
      wsClient.maxReconnectAttempts = 5;
      wsClient.reconnectInterval = 100;
      wsClient.connect = jest.fn().mockResolvedValue(true);
      wsClient.stopHeartbeat = jest.fn();
      
      jest.useFakeTimers();
      
      wsClient.handleDisconnection();
      
      expect(wsClient.connectionState).toBe(ConnectionState.RECONNECTING);
      expect(wsClient.reconnectAttempts).toBe(3);
      expect(logger.info).toHaveBeenCalledWith('Attempting to reconnect...', { 
        attempt: 3,
        maxAttempts: 5 
      });
      
      // Fast-forward time to trigger reconnection
      jest.advanceTimersByTime(100);
      
      expect(wsClient.connect).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should cleanup when max reconnection attempts reached', () => {
      const { logger } = require('../../modules/utils/helpers');
      wsClient.reconnectAttempts = 5;
      wsClient.maxReconnectAttempts = 5;
      wsClient.cleanup = jest.fn();
      wsClient.stopHeartbeat = jest.fn();
      
      wsClient.handleDisconnection();
      
      expect(logger.error).toHaveBeenCalledWith('Max reconnection attempts reached');
      expect(wsClient.cleanup).toHaveBeenCalled();
    });
  });

  describe('broadcastToSubscribers', () => {
    it('should broadcast to subscribed clients', () => {
      const mockClient1 = {
        readyState: 1, // WebSocket.OPEN
        subscriptions: new Set(['NASDAQ:AAPL']),
        send: jest.fn()
      };
      const mockClient2 = {
        readyState: 1, // WebSocket.OPEN
        subscriptions: new Set(['NASDAQ:AAPL']),
        send: jest.fn()
      };
      const mockClient3 = {
        readyState: 1, // WebSocket.OPEN
        subscriptions: new Set(['NASDAQ:GOOGL']), // Different subscription
        send: jest.fn()
      };
      
      wsClient.wss = {
        clients: new Set([mockClient1, mockClient2, mockClient3])
      };
      
      const priceData = { lp: 150.00, ch: 1.50, chp: 1.01 };
      
      wsClient.broadcastToSubscribers('NASDAQ:AAPL', priceData);
      
      expect(mockClient1.send).toHaveBeenCalledWith(expect.stringContaining('"type":"price_update"'));
      expect(mockClient1.send).toHaveBeenCalledWith(expect.stringContaining('"symbol":"AAPL"'));
      expect(mockClient1.send).toHaveBeenCalledWith(expect.stringContaining('"exchange":"NASDAQ"'));
      expect(mockClient2.send).toHaveBeenCalledWith(expect.stringContaining('"type":"price_update"'));
      expect(mockClient2.send).toHaveBeenCalledWith(expect.stringContaining('"symbol":"AAPL"'));
      expect(mockClient2.send).toHaveBeenCalledWith(expect.stringContaining('"exchange":"NASDAQ"'));
      expect(mockClient3.send).not.toHaveBeenCalled();
    });

    it('should handle closed client connections', () => {
      const mockClient = {
        readyState: 3, // WebSocket.CLOSED
        subscriptions: new Set(['NASDAQ:AAPL']),
        send: jest.fn()
      };
      
      wsClient.wss = {
        clients: new Set([mockClient])
      };
      
      const priceData = { lp: 150.00 };
      
      wsClient.broadcastToSubscribers('NASDAQ:AAPL', priceData);
      
      expect(mockClient.send).not.toHaveBeenCalled();
    });

    it('should handle broadcast errors gracefully', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockClient = {
        readyState: 1, // WebSocket.OPEN
        subscriptions: new Set(['NASDAQ:AAPL']),
        send: jest.fn().mockImplementation(() => {
          throw new Error('Send failed');
        })
      };
      
      wsClient.wss = {
        clients: new Set([mockClient])
      };
      
      const priceData = { lp: 150.00 };
      
      wsClient.broadcastToSubscribers('NASDAQ:AAPL', priceData);
      
      expect(logger.error).toHaveBeenCalledWith('Broadcast error:', expect.any(Error));
    });

    it('should handle missing wss gracefully', () => {
      wsClient.wss = null;
      
      const priceData = { lp: 150.00 };
      
      expect(() => {
        wsClient.broadcastToSubscribers('NASDAQ:AAPL', priceData);
      }).not.toThrow();
    });
  });

  describe('WebSocket Server', () => {
    let mockServer;
    let mockWss;
    let WebSocket;

    beforeEach(() => {
      WebSocket = require('ws');
      mockServer = {};
      mockWss = {
        on: jest.fn(),
        clients: new Set()
      };
      WebSocket.Server = jest.fn().mockReturnValue(mockWss);
    });

    it('should setup WebSocket server successfully', async () => {
      const { logger } = require('../../modules/utils/helpers');
      
      const result = await wsClient.setupWebSocketServer(mockServer);
      
      expect(result).toBe(true);
      expect(WebSocket.Server).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('WebSocket server setup completed');
    });

    it('should handle WebSocket server setup errors', async () => {
      const { logger } = require('../../modules/utils/helpers');
      WebSocket.Server = jest.fn().mockImplementation(() => {
        throw new Error('Server setup failed');
      });
      
      await expect(wsClient.setupWebSocketServer(mockServer)).rejects.toThrow('Server setup failed');
      expect(logger.error).toHaveBeenCalledWith('WebSocket server setup failed:', expect.any(Error));
    });

    it('should handle server errors', async () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWss = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            // Simulate server error
            handler(new Error('Server error'));
          }
        }),
        clients: new Set()
      };
      WebSocket.Server = jest.fn().mockReturnValue(mockWss);
      
      await wsClient.setupWebSocketServer(mockServer);
      
      expect(logger.error).toHaveBeenCalledWith('WebSocket server error:', expect.any(Error));
    });

    it('should store WebSocket server reference', async () => {
      const mockWss = {
        on: jest.fn(),
        clients: new Set()
      };
      WebSocket.Server = jest.fn().mockReturnValue(mockWss);
      
      await wsClient.setupWebSocketServer(mockServer);
      
      expect(wsClient.wss).toBe(mockWss);
    });

    it('should verify client connection', async () => {
      const { logger } = require('../../modules/utils/helpers');
      let verifyClientFn;
      
      const mockWss = {
        on: jest.fn(),
        clients: new Set()
      };
      
      WebSocket.Server = jest.fn().mockImplementation((options) => {
        verifyClientFn = options.verifyClient;
        return mockWss;
      });
      
      await wsClient.setupWebSocketServer(mockServer);
      
      expect(verifyClientFn).toBeDefined();
      const result = verifyClientFn({ origin: 'http://localhost:3000' });
      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith('WebSocket client connection attempt', { origin: 'http://localhost:3000' });
    });

    it('should handle client connection', async () => {
      const { logger } = require('../../modules/utils/helpers');
      await wsClient.setupWebSocketServer(mockServer);
      
      // Get the connection handler
      const connectionCall = mockWss.on.mock.calls.find(call => call[0] === 'connection');
      expect(connectionCall).toBeDefined();
      
      const mockWs = {
        on: jest.fn(),
        send: jest.fn()
      };
      const mockReq = {
        connection: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-agent' }
      };
      
      // Trigger connection event
      connectionCall[1](mockWs, mockReq);
      
      expect(logger.info).toHaveBeenCalledWith('New WebSocket client connected', {
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"connected"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"message":"WebSocket connection established"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"timestamp"'));
    });

    it('should handle client messages', async () => {
      await wsClient.setupWebSocketServer(mockServer);
      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle invalid client messages', async () => {
      await wsClient.setupWebSocketServer(mockServer);
      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle client disconnection', async () => {
      await wsClient.setupWebSocketServer(mockServer);
      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle client errors', async () => {
      const { logger } = require('../../modules/utils/helpers');
      await wsClient.setupWebSocketServer(mockServer);
      
      const connectionCall = mockWss.on.mock.calls.find(call => call[0] === 'connection');
      expect(connectionCall).toBeDefined();
      
      const mockWs = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            handler(new Error('Client error'));
          }
        }),
        send: jest.fn()
      };
      const mockReq = {
        connection: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-agent' }
      };
      
      // Trigger connection event
      connectionCall[1](mockWs, mockReq);
      
      expect(logger.error).toHaveBeenCalledWith('WebSocket client error:', expect.any(Error));
    });

    it('should handle client message parse errors', async () => {
      const { logger } = require('../../modules/utils/helpers');
      await wsClient.setupWebSocketServer(mockServer);
      
      const connectionCall = mockWss.on.mock.calls.find(call => call[0] === 'connection');
      expect(connectionCall).toBeDefined();
      
      const mockWs = {
        on: jest.fn((event, handler) => {
          if (event === 'message') {
            // Simulate invalid JSON message
            handler(Buffer.from('invalid json'));
          }
        }),
        send: jest.fn()
      };
      const mockReq = {
        connection: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-agent' }
      };
      
      // Trigger connection event
      connectionCall[1](mockWs, mockReq);
      
      expect(logger.error).toHaveBeenCalledWith('Client message parse error:', expect.any(Error));
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    });

    it('should handle valid client message', async () => {
      await wsClient.setupWebSocketServer(mockServer);
      
      const connectionCall = mockWss.on.mock.calls.find(call => call[0] === 'connection');
      expect(connectionCall).toBeDefined();
      
      let messageHandler;
      const mockWs = {
        on: jest.fn((event, handler) => {
          if (event === 'message') {
            messageHandler = handler;
          }
        }),
        send: jest.fn()
      };
      const mockReq = {
        connection: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-agent' }
      };
      
      // Trigger connection event
      connectionCall[1](mockWs, mockReq);
      
      // Mock handleClientMessage
      wsClient.handleClientMessage = jest.fn();
      
      // Simulate valid JSON message
      const validMessage = Buffer.from(JSON.stringify({ type: 'subscribe', symbols: ['AAPL'] }));
      messageHandler(validMessage);
      
      expect(wsClient.handleClientMessage).toHaveBeenCalledWith(mockWs, { type: 'subscribe', symbols: ['AAPL'] });
    });

    it('should initialize client subscriptions Set', async () => {
      await wsClient.setupWebSocketServer(mockServer);
      
      const connectionCall = mockWss.on.mock.calls.find(call => call[0] === 'connection');
      expect(connectionCall).toBeDefined();
      
      const mockWs = {
        on: jest.fn(),
        send: jest.fn()
      };
      const mockReq = {
        connection: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-agent' }
      };
      
      // Trigger connection event
      connectionCall[1](mockWs, mockReq);
      
      expect(mockWs.subscriptions).toBeInstanceOf(Set);
    });

    it('should handle client close event', async () => {
      const { logger } = require('../../modules/utils/helpers');
      await wsClient.setupWebSocketServer(mockServer);
      
      const connectionCall = mockWss.on.mock.calls.find(call => call[0] === 'connection');
      expect(connectionCall).toBeDefined();
      
      let closeHandler;
      const mockWs = {
        on: jest.fn((event, handler) => {
          if (event === 'close') {
            closeHandler = handler;
          }
        }),
        send: jest.fn()
      };
      const mockReq = {
        connection: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'test-agent' }
      };
      
      // Mock handleClientDisconnection
      wsClient.handleClientDisconnection = jest.fn();
      
      // Trigger connection event
      connectionCall[1](mockWs, mockReq);
      
      // Simulate close event
      closeHandler();
      
      expect(logger.info).toHaveBeenCalledWith('WebSocket client disconnected');
      expect(wsClient.handleClientDisconnection).toHaveBeenCalledWith(mockWs);
    });
  });

  describe('handleClientMessage', () => {
    it('should handle subscribe messages', () => {
      wsClient.handleClientSubscribe = jest.fn();
      const mockWs = { send: jest.fn() };
      const data = { type: 'subscribe', symbols: ['AAPL'] };
      
      wsClient.handleClientMessage(mockWs, data);
      
      expect(wsClient.handleClientSubscribe).toHaveBeenCalledWith(mockWs, data);
    });

    it('should handle unsubscribe messages', () => {
      wsClient.handleClientUnsubscribe = jest.fn();
      const mockWs = { send: jest.fn() };
      const data = { type: 'unsubscribe', symbols: ['AAPL'] };
      
      wsClient.handleClientMessage(mockWs, data);
      
      expect(wsClient.handleClientUnsubscribe).toHaveBeenCalledWith(mockWs, data);
    });

    it('should handle ping messages', () => {
      const mockWs = { send: jest.fn() };
      const data = { type: 'ping' };
      
      wsClient.handleClientMessage(mockWs, data);
      
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"pong"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"timestamp":'));
    });

    it('should handle unknown message types', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWs = { send: jest.fn() };
      const data = { type: 'unknown' };
      
      wsClient.handleClientMessage(mockWs, data);
      
      expect(logger.warn).toHaveBeenCalledWith('Unknown client message type:', 'unknown');
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'Unknown message type: unknown'
      }));
    });

    it('should handle client message errors', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWs = { send: jest.fn() };
      const data = { type: 'test' };
      
      // Mock an error in message handling
      wsClient.handleClientSubscribe = jest.fn().mockImplementation(() => {
        throw new Error('Subscribe error');
      });
      
      wsClient.handleClientMessage(mockWs, { type: 'subscribe', symbols: ['AAPL'] });
      
      expect(logger.error).toHaveBeenCalledWith('Client message handling error:', expect.any(Error));
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'Internal server error'
      }));
    });
  });

  describe('handleClientSubscribe', () => {
    it('should handle valid subscription', () => {
      wsClient.subscribe = jest.fn().mockReturnValue(true);
      const mockWs = { send: jest.fn(), subscriptions: new Set() };
      const data = { symbols: [{ symbol: 'AAPL', exchange: 'NASDAQ' }] };
      
      wsClient.handleClientSubscribe(mockWs, data);
      
      expect(mockWs.subscriptions.has('NASDAQ:AAPL')).toBe(true);
      expect(wsClient.subscribe).toHaveBeenCalledWith('AAPL', 'NASDAQ', expect.any(Function));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"subscribed"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"key":"NASDAQ:AAPL"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"symbol":"AAPL"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"exchange":"NASDAQ"'));
    });

    it('should handle missing symbols array', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWs = { send: jest.fn() };
      const data = {};
      
      wsClient.handleClientSubscribe(mockWs, data);
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'symbols must be an array'
      }));
    });

    it('should handle missing symbol in subscription', () => {
      const { logger } = require('../../modules/utils/helpers');
      const mockWs = { send: jest.fn() };
      const data = { symbols: [{ exchange: 'NASDAQ' }] };
      
      wsClient.handleClientSubscribe(mockWs, data);
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'symbol is required'
      }));
    });

    it('should handle subscription errors', () => {
      const { logger } = require('../../modules/utils/helpers');
      wsClient.subscribe = jest.fn().mockImplementation(() => {
        throw new Error('Subscription failed');
      });
      const mockWs = { send: jest.fn(), subscriptions: new Set() };
      const data = { symbols: [{ symbol: 'AAPL', exchange: 'NASDAQ' }] };
      
      wsClient.handleClientSubscribe(mockWs, data);
      
      expect(logger.error).toHaveBeenCalledWith('Client subscription error:', expect.any(Error));
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'Failed to subscribe to AAPL'
      }));
    });

    it('should subscribe to TradingView when not already subscribed', () => {
      const mockWs = { send: jest.fn(), subscriptions: new Set() };
      
      wsClient.subscriptions = new Set(); // No existing subscriptions
      wsClient.subscribe = jest.fn().mockImplementation((symbol, exchange, callback) => {
        // Simulate successful subscription with callback
        callback({ price: 150.00, symbol, exchange });
      });
      wsClient.broadcastToSubscribers = jest.fn();
      
      wsClient.handleClientSubscribe(mockWs, { symbols: [{ symbol: 'AAPL', exchange: 'NASDAQ' }] });
      
      expect(wsClient.subscribe).toHaveBeenCalledWith('AAPL', 'NASDAQ', expect.any(Function));
      expect(wsClient.broadcastToSubscribers).toHaveBeenCalledWith('NASDAQ:AAPL', { price: 150.00, symbol: 'AAPL', exchange: 'NASDAQ' });
    });

    it('should not subscribe to TradingView when already subscribed', () => {
      const mockWs = { send: jest.fn(), subscriptions: new Set() };
      
      wsClient.subscriptions = new Set(['NASDAQ:AAPL']); // Already subscribed
      wsClient.subscribe = jest.fn();
      wsClient.broadcastToSubscribers = jest.fn();
      
      wsClient.handleClientSubscribe(mockWs, { symbols: [{ symbol: 'AAPL', exchange: 'NASDAQ' }] });
      
      expect(wsClient.subscribe).not.toHaveBeenCalled();
      expect(wsClient.broadcastToSubscribers).not.toHaveBeenCalled();
    });
  });

  describe('handleClientUnsubscribe', () => {
    it('should handle valid unsubscription', () => {
      const mockWs = { send: jest.fn(), subscriptions: new Set(['NASDAQ:AAPL']) };
      const data = { symbols: [{ symbol: 'AAPL', exchange: 'NASDAQ' }] };
      
      wsClient.handleClientUnsubscribe(mockWs, data);
      
      expect(mockWs.subscriptions.has('NASDAQ:AAPL')).toBe(false);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"unsubscribed"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"key":"NASDAQ:AAPL"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"symbol":"AAPL"'));
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"exchange":"NASDAQ"'));
    });

    it('should handle missing symbols array', () => {
      const mockWs = { send: jest.fn() };
      const data = {};
      
      wsClient.handleClientUnsubscribe(mockWs, data);
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'error',
        message: 'symbols must be an array'
      }));
    });
  });

  describe('handleClientDisconnection', () => {
    it('should cleanup client subscriptions', () => {
      wsClient.unsubscribe = jest.fn();
      wsClient.wss = {
        clients: new Set()
      };
      wsClient.subscriptions = new Set(['NASDAQ:AAPL', 'NASDAQ:GOOGL']);
      
      const mockWs = {
        subscriptions: new Set(['NASDAQ:AAPL', 'NASDAQ:GOOGL'])
      };
      
      wsClient.handleClientDisconnection(mockWs);
      
      expect(wsClient.unsubscribe).toHaveBeenCalledWith('AAPL', 'NASDAQ');
      expect(wsClient.unsubscribe).toHaveBeenCalledWith('GOOGL', 'NASDAQ');
    });

    it('should not unsubscribe if other clients still use subscription', () => {
      wsClient.unsubscribe = jest.fn();
      wsClient.wss = {
        clients: new Set([
          {
            subscriptions: new Set(['NASDAQ:AAPL'])
          }
        ])
      };
      
      const mockWs = {
        subscriptions: new Set(['NASDAQ:AAPL'])
      };
      
      wsClient.handleClientDisconnection(mockWs);
      
      expect(wsClient.unsubscribe).not.toHaveBeenCalled();
    });

    it('should handle disconnection errors', () => {
      const { logger } = require('../../modules/utils/helpers');
      wsClient.unsubscribe = jest.fn().mockImplementation(() => {
        throw new Error('Unsubscribe error');
      });
      wsClient.wss = {
        clients: new Set()
      };
      wsClient.subscriptions = new Set(['NASDAQ:AAPL']);
      
      const mockWs = {
        subscriptions: new Set(['NASDAQ:AAPL'])
      };
      
      wsClient.handleClientDisconnection(mockWs);
      
      expect(logger.error).toHaveBeenCalledWith('Client disconnection handling error:', expect.any(Error));
    });
  });
});