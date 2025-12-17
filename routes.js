const express = require('express');
const path = require('path');
const { getProducts } = require('./api/productController');


const router = express.Router();

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`[Router] ${req.method} ${req.path} - Original URL: ${req.originalUrl}`);
  next();
});

// API routes are mounted via /api in server.js



// Home route - serves the main page with products
router.get('/', async (req, res) => {
    console.log('🎯 Root route hit - loading products...');
    try {
        // Use products API to get active products
        const products = await getProducts({
            status: 'active',
            sortByOrder: true
        });
        
        // Limit to 4 products for the homepage
        const activeProducts = products.slice(0, 4);
        
        console.log(`✅ Rendering index with ${activeProducts.length} products`);
        res.render('userpanel/index.njk', { 
            products: activeProducts,
            title: 'SimpleIncome - India\'s First AI Signal Engine for Smarter Trading'
        });
    } catch (error) {
        console.error('❌ Error loading products:', error);
        // Fallback to empty products array if API fails
        res.render('userpanel/index.njk', { 
            products: [],
            title: 'SimpleIncome - India\'s First AI Signal Engine for Smarter Trading'
        });
    }
});

// Product detail page route
router.get('/product/:name', async (req, res) => {
    console.log(`🎯 Product detail route hit for: ${req.params.name}`);
    try {
        // Get the specific product by name
        const products = await getProducts({
            status: 'active'
        });
        
        const product = products.find(p => p.name.toLowerCase() === req.params.name.toLowerCase());
        
        if (!product) {
            console.log('❌ Product not found:', req.params.name);
            return res.status(404).render('userpanel/404.njk', { 
                title: 'Product Not Found'
            });
        }
        
        console.log('🎯 Found product:', { id: product.id, name: product.name, hasId: !!product.id });
        
        // Get plans for this product from the database
        const db = require('./models');
        const plans = await db.Plan.findAll({
            where: {
                productId: product.id,
                isActive: true
            },
            order: [['numberOfDays', 'ASC']]
        });
        
        console.log(`📋 Found ${plans.length} plans for product: ${product.name}`);

        console.log(`✅ Rendering product detail for: ${product.name}`);
        res.render('userpanel/product-detail.njk', {
            product: product,
            plans: plans,
            title: `${product.name} Trading Signals - SimpleIncome`
        });
    } catch (error) {
        console.error('❌ Error loading product:', error);
        res.status(500).render('userpanel/error.njk', { 
            title: 'Error Loading Product',
            error: error.message
        });
    }
});

// Login page route
router.get('/login', (req, res) => {
    console.log('🎯 Login route hit');
    res.render('userpanel/login.njk', {
        title: 'Login - SimpleIncome'
    });
});

// Register page route
router.get('/register', (req, res) => {
    console.log('🎯 Register route hit');
    res.render('userpanel/register.njk', {
        title: 'Register - SimpleIncome'
    });
});

// Subscription confirmation page route
router.get('/subscription/confirm', async (req, res) => {
    console.log('🎯 Subscription confirmation route hit');
    try {
        // Get user data from query parameters
        const { productId, planId } = req.query;
        
        if (!productId || !planId) {
            return res.status(400).render('userpanel/error.njk', {
                title: 'Invalid Request',
                error: 'Product ID and Plan ID are required'
            });
        }

        const db = require('./models');
        
        // Get product and plan details
        const product = await db.Product.findOne({
            where: { id: productId }
        });
        
        const plan = await db.Plan.findOne({
            where: { id: planId }
        });
        
        if (!product || !plan) {
            return res.status(404).render('userpanel/error.njk', {
                title: 'Not Found',
                error: 'Product or Plan not found'
            });
        }
        
        // Calculate start and end dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + plan.numberOfDays);
        
        // For now, we'll use mock user data. In a real implementation,
        // you'd get this from the authenticated user
        const user = {
            id: 1,
            fullName: 'Demo User',
            email: 'demo@example.com',
            phoneNumber: '+91-9999999999'
        };
        
        console.log(`✅ Rendering subscription confirmation for: ${product.name} - ${plan.planName}`);
        res.render('userpanel/subscription-confirm.njk', {
            title: 'Confirm Subscription - SimpleIncome',
            user: user,
            product: product,
            plan: plan,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        });
        
    } catch (error) {
        console.error('❌ Error loading subscription confirmation:', error);
        res.status(500).render('userpanel/error.njk', {
            title: 'Error Loading Confirmation',
            error: error.message
        });
    }
});

// Signals page route - must come before static file serving
router.get('/signals/', (req, res) => {
    console.log('🎯 Signals route hit - rendering signals.njk');
    res.render('userpanel/signals.njk', {
        title: 'Trading Signals - SimpleIncome'
    });
});

// Signals routes are now handled by signalsController in the API routes section above

// Admin static files
router.use('/admin', express.static(path.join(__dirname, 'admin')));

// Assets static files for Nunjucks frontend
router.use('/assets', express.static(path.join(__dirname, 'assets')));

module.exports = {
    router,
    
};
