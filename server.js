// this is the server start and stop file
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const TradingView = require('@alandlguo/tradingview-api');
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
    try {
      const qi = db.sequelize.getQueryInterface();
      try {
        const idxs = await qi.showIndex('Products');
        for (const idx of idxs) {
          const fields = idx.fields || idx.columnName ? [{ attribute: idx.columnName }] : [];
          const touchesName = fields.some(f => (f.attribute||f.name||'').toLowerCase() === 'name');
          if (idx.unique && touchesName) {
            try { await qi.removeIndex('Products', idx.name); console.log(`Removed unique index on Products.name: ${idx.name}`) } catch(e){ console.warn('Remove index failed:', idx.name, e.message) }
          }
        }
      } catch(e){ console.warn('Index introspection failed for Products:', e.message) }
      await db.Product.sync({ alter: true })
    } catch(e){ console.warn('Schema update(Product) skipped:', e.message) }
    console.log('Product model synced.');
    console.log('Attempting to sync Plan model...');
    try {
      const qi = db.sequelize.getQueryInterface();
      try { await qi.removeIndex('Plans', ['planName','productId']); console.log('Removed unique composite index Plans(planName,productId)') } catch(e){ console.warn('Plan unique index removal skipped:', e.message) }
      await db.Plan.sync({ alter: true })
    } catch(e){ console.warn('Schema update(Plan) skipped:', e.message) }
    console.log('Plan model synced.');
    console.log('Attempting to sync Signal model...');
    try {
      const qi = db.sequelize.getQueryInterface();
      const desc = await qi.describeTable('Signals');
      const hasProductId = !!desc.productId;
      const hasProductStr = !!desc.product;
      if (!hasProductId) {
        await qi.addColumn('Signals', 'productId', { type: db.Sequelize.INTEGER, allowNull: true });
      }
      if (hasProductStr) {
        try {
          await db.sequelize.query('UPDATE Signals s JOIN Products p ON p.name = s.product SET s.productId = COALESCE(s.productId, p.id)');
          await db.sequelize.query('UPDATE Signals s JOIN Products p ON p.id = s.productId SET s.type = COALESCE(s.type, LOWER(p.category))');
        } catch(e){ console.warn('Signal backfill failed:', e.message) }
        try { await qi.removeColumn('Signals', 'product') } catch(e){ console.warn('Remove product string column failed:', e.message) }
      }
      await qi.changeColumn('Signals', 'productId', { type: db.Sequelize.INTEGER, allowNull: false });
      const hasUserId = !!desc.userId;
      if (hasUserId) {
        try {
          const [rows] = await db.sequelize.query("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='Signals' AND COLUMN_NAME='userId' AND REFERENCED_TABLE_NAME='Users'");
          for (const r of rows || []) {
            const cname = r.CONSTRAINT_NAME;
            try { await db.sequelize.query(`ALTER TABLE \`Signals\` DROP FOREIGN KEY \`${cname}\``); console.log('Dropped FK on Signals.userId:', cname) } catch(e){ console.warn('Drop FK failed:', cname, e.message) }
          }
        } catch(e){ console.warn('FK introspection failed for Signals.userId:', e.message) }
        try { await db.sequelize.query("ALTER TABLE `Signals` ADD CONSTRAINT `fk_signals_userId` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON UPDATE CASCADE ON DELETE SET NULL"); console.log('Added FK fk_signals_userId (ON DELETE SET NULL)') } catch(e){ console.warn('Add FK fk_signals_userId failed:', e.message) }
        try { await qi.changeColumn('Signals','userId',{ type: db.Sequelize.INTEGER, allowNull: true }) } catch(e){ console.warn('Change column Signals.userId failed:', e.message) }
      }
      await db.Signal.sync({ alter: true })
    } catch(e){ console.warn('Schema update(Signal) skipped:', e.message) }
    console.log('Signal model synced.');
    console.log('Attempting to sync Subscription model...');
    try { await db.Subscription.sync({ alter: true }) } catch(e){ console.warn('Schema update(Subscription) skipped:', e.message) }
    console.log('Subscription model synced.');
    console.log('Attempting to sync Transaction model...');
    try { await db.Transaction.sync({ alter: true }) } catch(e){ console.warn('Schema update(Transaction) skipped:', e.message) }
    console.log('Transaction model synced.');
    
    console.log('Attempting to sync Watchlist model...');
    try {
      const qi = db.sequelize.getQueryInterface();
      const desc = await qi.describeTable('Watchlists');
      const hasProduct = !!desc.product;
      const hasMarket = !!desc.market;
      const hasProductName = !!desc.productName;
      if (!hasProduct) {
        await qi.addColumn('Watchlists', 'product', { type: db.Sequelize.STRING, allowNull: true });
      }
      if (hasMarket || hasProductName) {
        await db.sequelize.query('UPDATE Watchlists SET product = COALESCE(product, COALESCE(productName, market))');
      }
      if (hasMarket) await qi.removeColumn('Watchlists', 'market');
      if (hasProductName) await qi.removeColumn('Watchlists', 'productName');
      await qi.changeColumn('Watchlists', 'product', { type: db.Sequelize.STRING, allowNull: false });
    } catch(e){ console.warn('Watchlist backfill step warning:', e.message) }
    try { await db.Watchlist.sync({ alter: true }) } catch(e){ console.warn('Schema update(Watchlist) skipped:', e.message) }
    console.log('Watchlist model synced.');
    // Do NOT alter Users here to avoid crashing due to legacy duplicate/empty values
    const httpServer = http.createServer(app);
    app.locals.priceCache = new Map();
    app.locals.streams = new Map();
    app.locals.metrics = { cacheHits: 0, cacheMisses: 0, cacheStale: 0, priceRequests: 0, priceCacheServed: 0, priceExternalServed: 0, staleEntries: 0, lastStaleAlertTime: 0 };
    // Single TradingView client/session for all market subscriptions to avoid 429 rate limits
    app.locals.tv = { client: null, quote: null };
    try {
      app.locals.tv.client = new TradingView.Client({ server: 'data' });
      app.locals.tv.quote = new app.locals.tv.client.Session.Quote({ customFields: ['lp','ask','bid','ch','chp'] });
    } catch(e) { console.warn('TV client init failed:', e.message) }
    const wss = new WebSocket.Server({ server: httpServer, path: '/ws/stream' });
    const normalizeKey = (k) => String(k || '').toUpperCase().replace(/\s+/g,'').trim();
    wss.on('connection', (ws, req) => {
      try {
        const u = new URL(req.url, `http://${req.headers.host}`);
        const symbol = (u.searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
        const exchange = (u.searchParams.get('exchange') || 'BINANCE').toUpperCase();
        const seriesKey = normalizeKey(`${exchange}:${symbol}`);
        const send = (obj) => { try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)) } catch(e){} };
        send({ type: 'subscribed', key: seriesKey });
        const timer = setInterval(() => {
          const data = app.locals.priceCache.get(seriesKey);
          if (data) send({ type: 'data', data });
        }, 1000);
        ws.on('close', () => { clearInterval(timer) });
        ws.on('error', () => { clearInterval(timer) });
      } catch(e) {}
    })
    function subscribeSeries(seriesKey){
      const normKey = normalizeKey(seriesKey);
      if (app.locals.streams.has(normKey)) return;
      try {
        if (!app.locals.tv.quote) return;
        const market = new app.locals.tv.quote.Market(normKey, 'regular');
        market.onData((data) => {
          app.locals.priceCache.set(normKey, { ...data, ts: Date.now() });
        });
        market.onError((err) => { console.warn('Market error', normKey, String(err && err.message || err)) });
        app.locals.streams.set(normKey, { market });
      } catch(e) { console.warn('subscribeSeries failed for', seriesKey, e && e.message) }
    }
    function unsubscribeSeries(seriesKey){
      const h = app.locals.streams.get(normalizeKey(seriesKey));
      if (!h) return;
      try { h.market.close() } catch(e){}
      app.locals.streams.delete(normalizeKey(seriesKey));
    }
    function defaultExchangeForProduct(p){
      const s = String(p||'').toLowerCase();
      if (s === 'crypto') return 'BINANCE';
      if (s === 'stocks' || s === 'options') return 'NSE';
      if (s === 'forex') return 'FOREX';
      if (s === 'commodity') return 'COMEX';
      return 'BINANCE';
    }
    async function resubscribeFromSources(){
      try {
        const watchRows = await db.Watchlist.findAll();
        const sigRows = await db.Signal.findAll({ attributes: ['symbol','exchange','status'] });
        const wanted = new Set();
        // Watchlist subscriptions
        for (const r of watchRows) {
          const ex = (r.exchange || defaultExchangeForProduct(r.product));
          wanted.add(normalizeKey(`${String(ex).toUpperCase().trim()}:${String(r.stockName).toUpperCase().trim()}`));
        }
        // Signals (prefer IN_PROGRESS)
        for (const s of sigRows) {
          const ex = (s.exchange || 'NSE');
          // Optional: only stream IN_PROGRESS
          if (!s.status || s.status === 'IN_PROGRESS') {
            wanted.add(normalizeKey(`${String(ex).toUpperCase().trim()}:${String(s.symbol).toUpperCase().trim()}`));
          }
        }
        const existing = Array.from(app.locals.streams.keys());
        for (const k of existing) { if (!wanted.has(normalizeKey(k))) unsubscribeSeries(k) }
        // Basic cap to avoid rate limits
        const cap = parseInt(process.env.STREAM_CAP || '50', 10) || 50;
        let i = 0;
        for (const k of wanted) { if (i++ >= cap) break; subscribeSeries(k) }
      } catch(e) { console.warn('resubscribeFromSources failed:', e.message) }
    }
    const streamList = (process.env.STREAM_SYMBOLS||'BINANCE:BTCUSD').split(',').map(s=>s.trim()).filter(Boolean);
    streamList.forEach(subscribeSeries);
    await resubscribeFromSources();
    setInterval(() => { resubscribeFromSources().catch(()=>{}) }, 30000);
    const getNum = (v, d) => { const n = parseInt(String(v||d), 10); return Number.isFinite(n) && n > 0 ? n : d };
    app.get('/api/cached-prices', (req,res) => {
      try {
        const symbol = String(req.query.symbol||'').toUpperCase().trim();
        const exchange = String(req.query.exchange||'NSE').toUpperCase().trim();
        if (!symbol) return res.status(400).json({ success:false, error:'symbol required' });
        const key = normalizeKey(`${exchange}:${symbol}`);
        const maxAgeMs = getNum(req.query.maxAgeMs, getNum(process.env.CACHE_MAX_AGE_MS, 15000));
        const row = app.locals.priceCache.get(key);
        if (!row || row.lp === undefined) { app.locals.metrics.cacheMisses++; return res.status(404).json({ success:false, error:'cache_miss' }) }
        const ageMs = Date.now() - Number(row.ts||0);
        if (ageMs > maxAgeMs) { app.locals.metrics.cacheStale++; return res.status(504).json({ success:false, error:'stale', ageMs }) }
        app.locals.metrics.cacheHits++;
        res.json({ success:true, symbol, exchange, price: Number(row.lp), source: `cache:${key}` });
      } catch(e) { res.status(500).json({ success:false, error: e.message }) }
    })
    app.get('/api/cache/metrics', (req,res) => {
      res.json({ success:true, data: app.locals.metrics })
    })
    const scanIntervalMs = getNum(process.env.CACHE_SCAN_INTERVAL_MS, 15000);
    setInterval(() => {
      try {
        const now = Date.now();
        const maxAge = getNum(process.env.CACHE_MAX_AGE_MS, 15000);
        let staleCount = 0;
        let maxEntryAge = 0;
        for (const [k, v] of app.locals.priceCache.entries()) {
          const age = now - Number(v.ts || 0);
          if (age > maxAge) staleCount++;
          if (age > maxEntryAge) maxEntryAge = age;
        }
        app.locals.metrics.staleEntries = staleCount;
        const gap = getNum(process.env.CACHE_ALERT_GAP_MS, 60000);
        if (staleCount > 0 && now - (app.locals.metrics.lastStaleAlertTime || 0) > gap) {
          app.locals.metrics.lastStaleAlertTime = now;
          console.warn('cache_stale_alert', { staleCount, maxEntryAge });
        }
      } catch(e) {}
    }, scanIntervalMs);
    app.get('/api/stream/subscriptions', (req,res) => {
      res.json({ success:true, data: Array.from(app.locals.streams.keys()) })
    })
    app.post('/api/stream/resync', async (req,res) => {
      try { await resubscribeFromWatchlist(); res.json({ success:true }) } catch(e){ res.status(500).json({ success:false, error:e.message }) }
    })
    const automation = require('./automate');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(` Static URL pattern: http://localhost:${PORT}/*`);
      const cfg = db.sequelize.config || {};
      console.log(`🔌 DB connected: ${cfg.database}@${cfg.host} (${db.sequelize.getDialect()})`);
      try { automation.start({ port: PORT }) } catch(e){}
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
    try { require('./automate').stop() } catch(e){}
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down gracefully');
    try { require('./automate').stop() } catch(e){}
    process.exit(0);
});
