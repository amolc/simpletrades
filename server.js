// this is the server start and stop file
require('dotenv').config();
const express = require('express');
const path = require('path');
const nunjucks = require('nunjucks');
const viewsRouter = require('./views/routes');
const adminViewsRouter = require('./views/admin/routes');
const apiRoutes = require('./api/routes');
const db = require('./models');

const app = express();

// Configure Nunjucks templating
const env = nunjucks.configure('views', {
    autoescape: true,
    express: app,
    watch: true
});
env.addGlobal('currentYear', new Date().getFullYear());

// Set Nunjucks as the view engine
app.set('view engine', 'njk');

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 3000;

// Static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Use the views router for all non-API routes
app.use('/', viewsRouter);
app.use('/admin', adminViewsRouter);

// Mount API routes under /api
app.use('/api', apiRoutes);

// Start the server
db.sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(` Static URL pattern: http://localhost:${PORT}/*`);
    const cfg = db.sequelize.config || {};
    console.log(`🔌 DB connected: ${cfg.database}@${cfg.host} (${db.sequelize.getDialect()})`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down gracefully');
    process.exit(0);
});
