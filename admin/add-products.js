const fs = require('fs');

// Read existing products
let existingProducts = [];
try {
  const productsData = fs.readFileSync('products.json', 'utf8');
  existingProducts = JSON.parse(productsData);
} catch (e) {
  existingProducts = [];
}

const defaultProducts = [
  {
    name: 'Stocks',
    category: 'trading-signals',
    description: 'Professional stock trading signals with real-time market analysis and expert recommendations for profitable trading opportunities.',
    keyFeatures: [
      '• Real-time stock signals',
      '• Technical analysis reports',
      '• Entry and exit points',
      '• Risk management strategies',
      '• 24/7 market monitoring'
    ],
    targetAudience: 'Active traders and investors looking for professional stock market guidance',
    pricing: { trial: 0.00, monthly: 3000.00, quarterly: 6000.00, yearly: 30000.00 },
    status: 'active',
    sortOrder: 1,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Options',
    category: 'trading-signals',
    description: 'Advanced options trading strategies with detailed analysis of market volatility and optimal strike price selection.',
    keyFeatures: [
      '• Options trading signals',
      '• Implied volatility analysis',
      '• Strike price recommendations',
      '• Greeks calculation',
      '• Weekly expiration alerts'
    ],
    targetAudience: 'Experienced traders seeking options trading opportunities and strategies',
    pricing: { trial: 0.00, monthly: 3000.00, quarterly: 6000.00, yearly: 30000.00 },
    status: 'active',
    sortOrder: 2,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Commodity',
    category: 'trading-signals',
    description: 'Comprehensive commodity trading signals covering precious metals, energy, and agricultural products with global market insights.',
    keyFeatures: [
      '• Commodity market signals',
      '• Supply and demand analysis',
      '• Seasonal trend identification',
      '• Global economic factors',
      '• Futures contract recommendations'
    ],
    targetAudience: 'Traders interested in diversifying with commodity markets and global trading',
    pricing: { trial: 0.00, monthly: 3000.00, quarterly: 6000.00, yearly: 30000.00 },
    status: 'active',
    sortOrder: 3,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Crypto',
    category: 'trading-signals',
    description: 'Cryptocurrency trading signals with blockchain analysis, market sentiment tracking, and DeFi opportunity identification.',
    keyFeatures: [
      '• Crypto trading signals',
      '• Blockchain analysis',
      '• Market sentiment tracking',
      '• DeFi opportunity alerts',
      '• 24/7 crypto market monitoring'
    ],
    targetAudience: 'Crypto enthusiasts and traders seeking professional digital asset guidance',
    pricing: { trial: 0.00, monthly: 3000.00, quarterly: 6000.00, yearly: 30000.00 },
    status: 'active',
    sortOrder: 4,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Forex',
    category: 'trading-signals',
    description: 'Foreign exchange trading signals with currency pair analysis, economic calendar integration, and central bank policy tracking.',
    keyFeatures: [
      '• Forex trading signals',
      '• Currency pair analysis',
      '• Economic calendar alerts',
      '• Central bank policy updates',
      '• Major and exotic pairs coverage'
    ],
    targetAudience: 'Forex traders looking for professional currency trading recommendations',
    pricing: { trial: 0.00, monthly: 3000.00, quarterly: 6000.00, yearly: 30000.00 },
    status: 'active',
    sortOrder: 5,
    createdAt: new Date().toISOString()
  }
];

// Check if products already exist to avoid duplicates
const productsToAdd = defaultProducts.filter(defaultProduct => 
  !existingProducts.some(existingProduct => existingProduct.name === defaultProduct.name)
);

if (productsToAdd.length > 0) {
  // Add new products to existing ones
  const updatedProducts = [...existingProducts, ...productsToAdd];
  fs.writeFileSync('products.json', JSON.stringify(updatedProducts, null, 2));
  console.log('Added ' + productsToAdd.length + ' default products: ' + productsToAdd.map(p => p.name).join(', '));
} else {
  console.log('All default products already exist');
}