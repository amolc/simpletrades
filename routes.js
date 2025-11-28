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
        
        console.log(`✅ Rendering product detail for: ${product.name}`);
        res.render('userpanel/product-detail.njk', { 
            product: product,
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
