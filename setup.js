#!/usr/bin/env node

/**
 * StockAgent Setup Script
 * 
 * This script automates the complete setup of the StockAgent application:
 * - Database connection and table creation
 * - Configuration validation
 * - Environment setup
 * - Application initialization
 * 
 * Usage: node setup.js [--config path/to/config.js]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Setup configuration
const setupConfig = {
  configPath: null,
  interactive: true,
  skipInstall: false,
  skipDbSetup: false,
  skipEnvSetup: false
};

// Command line argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
      case '-c':
        setupConfig.configPath = args[++i];
        break;
      case '--non-interactive':
        setupConfig.interactive = false;
        break;
      case '--skip-install':
        setupConfig.skipInstall = true;
        break;
      case '--skip-db-setup':
        setupConfig.skipDbSetup = true;
        break;
      case '--skip-env-setup':
        setupConfig.skipEnvSetup = true;
        break;
      case '--help':
      case '-h':
        console.log(`
StockAgent Setup Script

Usage: node setup.js [options]

Options:
  -c, --config <path>       Path to configuration file
  --non-interactive          Run in non-interactive mode
  --skip-install            Skip dependency installation
  --skip-db-setup           Skip database setup
  --skip-env-setup          Skip environment setup
  -h, --help                Show this help message
        `);
        process.exit(0);
        break;
    }
  }
}

// Create readline interface for user input
function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Prompt user for input
function prompt(question, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = createRL();
    const promptText = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Prompt for password (hidden input)
function promptPassword(question) {
  return new Promise((resolve) => {
    const rl = createRL();
    
    // Hide password input
    rl.input.on('data', (char) => {
      char = char + '';
      if (char === '\n' || char === '\r' || char === '\u0004') {
        rl.close();
        return;
      }
      rl.output.write('\x1b[2K\x1b[200D' + question + ': ' + '*'.repeat(rl.line.length));
    });
    
    rl.question(question + ': ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Check system requirements
function checkSystemRequirements() {
  console.log(`${colors.cyan}Checking system requirements...${colors.reset}`);
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 14) {
    console.log(`${colors.red}Error: Node.js version 14 or higher is required. Current version: ${nodeVersion}${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✓ Node.js version: ${nodeVersion}${colors.reset}`);
  
  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`${colors.green}✓ npm version: ${npmVersion}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}Error: npm is not installed or not in PATH${colors.reset}`);
    process.exit(1);
  }
  
  // Check git (optional)
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    console.log(`${colors.green}✓ ${gitVersion}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠ Git not found (optional)${colors.reset}`);
  }
}

// Install dependencies
function installDependencies() {
  if (setupConfig.skipInstall) {
    console.log(`${colors.yellow}Skipping dependency installation${colors.reset}`);
    return;
  }
  
  console.log(`${colors.cyan}Installing dependencies...${colors.reset}`);
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log(`${colors.green}✓ Dependencies installed successfully${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}Error installing dependencies: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Create configuration file
async function createConfigurationFile(configPath) {
  console.log(`${colors.cyan}Creating configuration file...${colors.reset}`);
  
  const config = {
    database: {
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'stockagent',
      username: 'root',
      password: '',
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    server: {
      port: 3000,
      environment: 'development',
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:8080'],
        credentials: true
      }
    },
    tradingview: {
      websocket: {
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
      },
      symbols: {
        prefix: 'NSE:',
        suffix: ''
      }
    },
    app: {
      defaultExchange: 'NSE',
      priceCache: {
        enabled: true,
        ttl: 300000
      }
    },
    security: {
      jwtSecret: 'your-super-secret-jwt-key-change-this-in-production',
      bcryptRounds: 10
    }
  };
  
  if (setupConfig.interactive) {
    console.log(`${colors.blue}Please provide database configuration:${colors.reset}`);
    
    config.database.host = await prompt('Database host', config.database.host);
    config.database.port = parseInt(await prompt('Database port', config.database.port.toString()));
    config.database.database = await prompt('Database name', config.database.database);
    config.database.username = await prompt('Database username', config.database.username);
    config.database.password = await promptPassword('Database password');
    
    console.log(`${colors.blue}Please provide server configuration:${colors.reset}`);
    config.server.port = parseInt(await prompt('Server port', config.server.port.toString()));
    
    console.log(`${colors.blue}Please provide security configuration:${colors.reset}`);
    config.security.jwtSecret = await prompt('JWT secret (min 32 characters)', config.security.jwtSecret);
  }
  
  const configContent = `// StockAgent Configuration
// Generated on ${new Date().toISOString()}

const config = ${JSON.stringify(config, null, 2)};

module.exports = config;
`;
  
  fs.writeFileSync(configPath, configContent);
  console.log(`${colors.green}✓ Configuration file created: ${configPath}${colors.reset}`);
  
  return config;
}

// Load configuration
async function loadConfiguration() {
  console.log(`${colors.cyan}Loading configuration...${colors.reset}`);
  
  const configPath = setupConfig.configPath || 'config.local.js';
  
  if (!fs.existsSync(configPath)) {
    console.log(`${colors.yellow}Configuration file not found: ${configPath}${colors.reset}`);
    
    if (setupConfig.interactive) {
      const createConfig = await prompt('Would you like to create a configuration file? (y/n)', 'y');
      if (createConfig.toLowerCase() === 'y') {
        return await createConfigurationFile(configPath);
      }
    } else {
      console.log(`${colors.red}Configuration file required in non-interactive mode${colors.reset}`);
      process.exit(1);
    }
  }
  
  try {
    const config = require(path.resolve(configPath));
    console.log(`${colors.green}✓ Configuration loaded from: ${configPath}${colors.reset}`);
    return config;
  } catch (error) {
    console.log(`${colors.red}Error loading configuration: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Test database connection
async function testDatabaseConnection(config) {
  console.log(`${colors.cyan}Testing database connection...${colors.reset}`);
  
  const { Sequelize } = require('sequelize');
  
  const sequelize = new Sequelize(
    config.database.database,
    config.database.username,
    config.database.password,
    {
      host: config.database.host,
      port: config.database.port,
      dialect: config.database.dialect,
      pool: config.database.pool,
      logging: false
    }
  );
  
  try {
    await sequelize.authenticate();
    console.log(`${colors.green}✓ Database connection successful${colors.reset}`);
    await sequelize.close();
    return true;
  } catch (error) {
    console.log(`${colors.red}Database connection failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Setup database tables
async function setupDatabase(config) {
  if (setupConfig.skipDbSetup) {
    console.log(`${colors.yellow}Skipping database setup${colors.reset}`);
    return;
  }
  
  console.log(`${colors.cyan}Setting up database tables...${colors.reset}`);
  
  // Test connection first
  const connectionSuccessful = await testDatabaseConnection(config);
  if (!connectionSuccessful) {
    if (setupConfig.interactive) {
      const retry = await prompt('Database connection failed. Would you like to retry with different settings? (y/n)', 'y');
      if (retry.toLowerCase() === 'y') {
        config = await createConfigurationFile(setupConfig.configPath || 'config.local.js');
        return await setupDatabase(config);
      }
    }
    process.exit(1);
  }
  
  try {
    // Create a temporary sequelize instance for migrations
    const { Sequelize } = require('sequelize');
    
    const sequelize = new Sequelize(
      config.database.database,
      config.database.username,
      config.database.password,
      {
        host: config.database.host,
        port: config.database.port,
        dialect: config.database.dialect,
        pool: config.database.pool,
        logging: false
      }
    );
    
    // Import models
    const User = require('./models/User')(sequelize, Sequelize.DataTypes);
    const Watchlist = require('./models/Watchlist')(sequelize, Sequelize.DataTypes);
    const Alert = require('./models/Alert')(sequelize, Sequelize.DataTypes);
    const PriceCache = require('./models/PriceCache')(sequelize, Sequelize.DataTypes);
    
    // Sync all models
    await sequelize.sync({ force: false });
    
    console.log(`${colors.green}✓ Database tables created successfully${colors.reset}`);
    await sequelize.close();
  } catch (error) {
    console.log(`${colors.red}Error setting up database: ${error.message}${colors.reset}`);
    if (setupConfig.interactive) {
      const retry = await prompt('Would you like to retry? (y/n)', 'y');
      if (retry.toLowerCase() === 'y') {
        return await setupDatabase(config);
      }
    }
    process.exit(1);
  }
}

// Create environment file
function createEnvironmentFile(config) {
  if (setupConfig.skipEnvSetup) {
    console.log(`${colors.yellow}Skipping environment setup${colors.reset}`);
    return;
  }
  
  console.log(`${colors.cyan}Creating environment file...${colors.reset}`);
  
  const envContent = `# StockAgent Environment Configuration
# Generated on ${new Date().toISOString()}

# Database Configuration
DB_DIALECT=${config.database.dialect}
DB_HOST=${config.database.host}
DB_PORT=${config.database.port}
DB_NAME=${config.database.database}
DB_USERNAME=${config.database.username}
DB_PASSWORD=${config.database.password}

# Server Configuration
PORT=${config.server.port}
NODE_ENV=${config.server.environment}

# Security Configuration
JWT_SECRET=${config.security.jwtSecret}
BCRYPT_ROUNDS=${config.security.bcryptRounds}

# TradingView Configuration
TV_WEBSOCKET_RECONNECT_INTERVAL=${config.tradingview.websocket.reconnectInterval}
TV_WEBSOCKET_MAX_RECONNECT_ATTEMPTS=${config.tradingview.websocket.maxReconnectAttempts}
TV_SYMBOLS_PREFIX=${config.tradingview.symbols.prefix}
TV_SYMBOLS_SUFFIX=${config.tradingview.symbols.suffix}

# Application Configuration
DEFAULT_EXCHANGE=${config.app.defaultExchange}
PRICE_CACHE_ENABLED=${config.app.priceCache.enabled}
PRICE_CACHE_TTL=${config.app.priceCache.ttl}
`;
  
  fs.writeFileSync('.env', envContent);
  console.log(`${colors.green}✓ Environment file created: .env${colors.reset}`);
}

// Create start script
function createStartScript() {
  console.log(`${colors.cyan}Creating start script...${colors.reset}`);
  
  const startScript = `#!/bin/bash

# StockAgent Start Script
# Generated on ${new Date().toISOString()}

echo "Starting StockAgent..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
  echo "Environment variables loaded from .env"
else
  echo "Warning: .env file not found"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the application
echo "Starting server on port \${PORT:-3000}..."
node server.js
`;
  
  fs.writeFileSync('start.sh', startScript);
  fs.chmodSync('start.sh', '755');
  console.log(`${colors.green}✓ Start script created: start.sh${colors.reset}`);
}

// Main setup function
async function main() {
  console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════════════════════╗
║                          StockAgent Setup Script                            ║
║                                                                              ║
║  This script will guide you through the complete setup of StockAgent       ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  try {
    // Parse command line arguments
    parseArgs();
    
    // Check system requirements
    checkSystemRequirements();
    
    // Install dependencies
    installDependencies();
    
    // Load configuration
    const config = await loadConfiguration();
    
    // Setup database
    await setupDatabase(config);
    
    // Create environment file
    createEnvironmentFile(config);
    
    // Create start script
    createStartScript();
    
    console.log(`
${colors.green}${colors.bright}
╔══════════════════════════════════════════════════════════════════════════════╗
║                          Setup Complete!                                    ║
║                                                                              ║
║  Your StockAgent application has been successfully set up!                   ║
║                                                                              ║
║  To start the application:                                                   ║
║    ./start.sh                                                               ║
║                                                                              ║
║  To run in development mode:                                                 ║
║    npm run dev                                                               ║
║                                                                              ║
║  Configuration file: ${setupConfig.configPath || 'config.local.js'}        ║
║  Environment file: .env                                                     ║
║                                                                              ║
║  For help and documentation:                                                ║
║    node setup.js --help                                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    
  } catch (error) {
    console.log(`${colors.red}Setup failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the setup script
if (require.main === module) {
  main().catch((error) => {
    console.log(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { main, setupConfig };