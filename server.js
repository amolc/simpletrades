// this is the server start and stop file
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const db = require('./models');

// Middleware to parse JSON request bodies
app.use(express.json());

const userRoutes = require('./api/user')(db);
const subscriptionRoutes = require('./api/subscription')(db);
const signalsRoutes = require('./api/signals')(db);
const adminRoutes = require('./api/admin')(db);
const PORT = process.env.PORT || 3000;

// Serve static files from the static directory
app.use('/', express.static(path.join(__dirname, 'userpanel')));
app.use('/admin', express.static(path.join(__dirname, 'adminpanel')));

app.use('/api/user', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/signals', signalsRoutes);
app.use('/api/admin', adminRoutes);


// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${path.join(__dirname, 'userpanel')}`);
    console.log(`🔗 Static URL pattern: http://localhost:${PORT}/*`);
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