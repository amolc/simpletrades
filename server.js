/**
 * StockAgent Server - Minimal Express Server
 * 
 * This is the main server file that handles:
 * - Server initialization and configuration
 * - Routing definitions
 * - Middleware setup
 * - Error response handling
 * 
 * All business logic has been moved to modular components in the modules/ directory.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const nunjucks = require('nunjucks');

// Import modular components
const { dbManager } = require('./modules/database/sql');
const { mainService } = require('./modules/services/main-service');
const { logger } = require('./modules/utils/helpers');

// Import route handlers
const viewsRouter = require('./views/routes');
const adminViewsRouter = require('./views/admin/routes');

const app = express();

/**
 * Configure Nunjucks templating engine
 */
const env = nunjucks.configure('views', {
    autoescape: true,
    express: app,
    watch: true
});

// Add global template variables
env.addGlobal('currentYear', new Date().getFullYear());

// Add date filter for formatting dates
env.addFilter('date', function(dateObj, format) {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    
    const formatMap = {
        'Y': date.getFullYear(),
        'm': String(date.getMonth() + 1).padStart(2, '0'),
        'd': String(date.getDate()).padStart(2, '0'),
        'H': String(date.getHours()).padStart(2, '0'),
        'i': String(date.getMinutes()).padStart(2, '0'),
        's': String(date.getSeconds()).padStart(2, '0')
    };
    
    return format.replace(/Y|m|d|H|i|s/g, match => formatMap[match]);
});

// Add json filter for serializing objects
env.addFilter('json', function(obj) {
    return JSON.stringify(obj);
});

// Set Nunjucks as the view engine
app.set('view engine', 'njk');

/**
 * Middleware Configuration
 */

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});

/**
 * Static Assets
 */
app.use('/assets', express.static(path.join(__dirname, 'assets')));

/**
 * Route Definitions
 */

// View routes (HTML pages)
app.use('/', viewsRouter);
app.use('/admin', adminViewsRouter);

// API routes - dynamically loaded with database context
const apiRoutes = require('./api/routes');
const db = require('./models');
app.use('/api', apiRoutes(db));

// WebSocket adapter routes
const wsAdapterRoutes = require('./api/wsAdapterRoutes');
app.use('/api', wsAdapterRoutes);

/**
 * Health Check Endpoints
 */

// Basic health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Detailed health check with database connectivity
app.get('/health/detailed', async (req, res) => {
    try {
        const dbStatus = await dbManager.healthCheck();
        const webSocketStatus = mainService.getWebSocketStatus();
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbStatus,
            websocket: webSocketStatus,
            memory: process.memoryUsage(),
            version: process.version
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * Error Handling Middleware
 */

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(error.status || 500).json({
        error: error.name || 'Internal Server Error',
        message: isDevelopment ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: error.stack })
    });
});

/**
 * Server Initialization
 */

const PORT = process.env.PORT || 3000;

/**
 * Initialize and start the server
 */
async function startServer() {
    try {
        logger.info('Starting StockAgent server...');
        
        // Initialize database connection
        await dbManager.initialize();
        logger.info('Database connection established');
        
        // Initialize main service (includes WebSocket setup)
        await mainService.initialize();
        logger.info('Main service initialized');
        
        // Create HTTP server
        const server = http.createServer(app);
        
        // Initialize WebSocket server through main service
        await mainService.initializeWebSocket(server);
        logger.info('WebSocket server initialized');
        
        // Start listening
        server.listen(PORT, () => {
            logger.info(`Server started successfully`, {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                pid: process.pid
            });
        });
        
        // Graceful shutdown handling
        const gracefulShutdown = async (signal) => {
            logger.info(`Received ${signal}, starting graceful shutdown...`);
            
            server.close(() => {
                logger.info('HTTP server closed');
            });
            
            try {
                await mainService.shutdown();
                logger.info('Main service shutdown complete');
                
                await dbManager.close();
                logger.info('Database connection closed');
                
                logger.info('Graceful shutdown complete');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };
        
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };