/**
 * StockAgent Configuration File
 * 
 * This file contains all the configuration settings for the StockAgent application.
 * Copy this file to config.local.js and update the values for your environment.
 */

const config = {
  // Database Configuration
  database: {
    // Database type: 'mysql', 'postgres', 'sqlite'
    dialect: 'mysql',
    
    // Database connection details
    host: 'quantbots.co',
    port: 3306,
    database: 'stockagent_db',
    username: 'simpletrades',
    password: '10gXWOqeaf!',
    
    // Connection pool settings
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    
    // Database logging
    logging: false,
    
    // Retry settings
    retry: {
      max: 3,
      backoffBase: 1000,
      backoffExponent: 1.5
    }
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://sendsignals.online', 'http://sendsignals.online'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  },
  
  // TradingView Configuration
  tradingview: {
    // Session tokens (optional - for premium features)
    session: process.env.TV_SESSION || '',
    signature: process.env.TV_SIGNATURE || '',
    
    // WebSocket settings
    websocket: {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10
    }
  },
  
  // Application Settings
  app: {
    // Default exchange for price queries
    defaultExchange: 'NSE',
    
    // Price cache settings
    priceCache: {
      enabled: true,
      ttl: 300000 // 5 minutes in milliseconds
    },
    
    // Logging settings
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || 'stockagent.log'
    }
  },
  
  // Security Settings
  security: {
    // JWT Secret (generate a strong random string)
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    
    // Session settings
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  }
};

module.exports = config;