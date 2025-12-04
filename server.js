// this is the server start and stop file
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const nunjucks = require('nunjucks');
const viewsRouter = require('./views/routes');
const adminViewsRouter = require('./views/admin/routes');
const db = require('./models');
const apiRoutes = require('./api/routes')(db);

const app = express();

// Configure Nunjucks templating
const env = nunjucks.configure('views', {
    autoescape: true,
    express: app,
    watch: true
});
env.addGlobal('currentYear', new Date().getFullYear());

// Add date filter for formatting dates
env.addFilter('date', function(dateObj, format) {
    if (!dateObj) return '';
    const date = new Date(dateObj);

    // Handle different format patterns
    const formatMap = {
        'Y': date.getFullYear(),
        'm': String(date.getMonth() + 1).padStart(2, '0'),
        'd': String(date.getDate()).padStart(2, '0'),
        'H': String(date.getHours()).padStart(2, '0'),
        'i': String(date.getMinutes()).padStart(2, '0'),
        's': String(date.getSeconds()).padStart(2, '0')
    };

    // Replace format placeholders with actual values
    return format.replace(/Y|m|d|H|i|s/g, match => formatMap[match]);
});

// Add json filter for serializing objects
env.addFilter('json', function(obj) {
    return JSON.stringify(obj);
});

// Set Nunjucks as the view engine
app.set('view engine', 'njk');

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
async function start(){
  try{
    console.log('Attempting to authenticate database...');
    await db.sequelize.authenticate();
    console.log('Database authenticated successfully.');
    // Ensure Users.phoneNumber exists (nullable) and unique index without crashing
    try {
      const qi = db.sequelize.getQueryInterface();
      const desc = await qi.describeTable('Users');
      if (!desc.phoneNumber) {
        await qi.addColumn('Users', 'phoneNumber', { type: db.Sequelize.STRING, allowNull: true });
        await qi.addIndex('Users', ['phoneNumber'], { name: 'uniq_phoneNumber', unique: true });
        console.log('✅ Added Users.phoneNumber (nullable) with unique index');
      }
    } catch (e) {
      console.warn('Users.phoneNumber ensure step warning:', e.message);
    }
    console.log('Attempting to sync Product model...');
    try { await db.Product.sync({ alter: true }) } catch(e){ console.warn('Schema update(Product) skipped:', e.message) }
    console.log('Product model synced.');
    console.log('Attempting to sync Plan model...');
    try { await db.Plan.sync({ alter: true }) } catch(e){ console.warn('Schema update(Plan) skipped:', e.message) }
    console.log('Plan model synced.');
    console.log('Attempting to sync Subscription model...');
    try { await db.Subscription.sync({ alter: true }) } catch(e){ console.warn('Schema update(Subscription) skipped:', e.message) }
    console.log('Subscription model synced.');
    console.log('Attempting to sync Transaction model...');
    try { await db.Transaction.sync({ alter: true }) } catch(e){ console.warn('Schema update(Transaction) skipped:', e.message) }
    console.log('Transaction model synced.');
    console.log('Attempting to sync Signal model...');
    try { await db.Signal.sync({ alter: true }) } catch(e){ console.warn('Schema update(Signal) skipped:', e.message) }
    console.log('Signal model synced.');
    // Do NOT alter Users here to avoid crashing due to legacy duplicate/empty values
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(` Static URL pattern: http://localhost:${PORT}/*`);
      const cfg = db.sequelize.config || {};
      console.log(`🔌 DB connected: ${cfg.database}@${cfg.host} (${db.sequelize.getDialect()})`);
    });
  }catch(e){
    console.error('Failed to start server:', e);
  }
}

// Global safety nets that log errors rather than crashing
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

start();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down gracefully');
    process.exit(0);
});
