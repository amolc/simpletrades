const express = require('express')
const { getProducts } = require('../api/productController')
const { getSignals, getSignalStats } = require('../api/signalsController')
const db = require('../models')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const products = await getProducts({ status: 'active', sortByOrder: true })
    const activeProducts = products.slice(0, 4)
    res.render('userpanel/index.njk', {
      products: activeProducts,
      title: "SimpleIncome - India's First AI Signal Engine for Smarter Trading"
    })
  } catch (error) {
    res.render('userpanel/index.njk', {
      products: [],
      title: "SimpleIncome - India's First AI Signal Engine for Smarter Trading"
    })
  }
})

router.get('/product/:name', async (req, res) => {
  try {
    const name = req.params.name
    // Prefer DB Product, fall back to JSON products
    let productRow = await db.Product.findOne({ where: { name: name } })
    let product
    if (!productRow) {
      const products = await getProducts({ status: 'active' })
      product = products.find(p => p.name.toLowerCase() === name.toLowerCase())
    } else {
      product = {
        id: productRow.id,  // ADD THE ID FIELD
        name: productRow.name,
        description: productRow.description,
        category: productRow.category,
        targetAudience: productRow.targetAudience,
        keyFeatures: typeof productRow.keyFeatures === 'string' ? JSON.parse(productRow.keyFeatures) : (productRow.keyFeatures || []),
        pricing: {
          trial: Number(productRow.pricingTrial||0),
          monthly: Number(productRow.pricingMonthly||0),
          quarterly: Number(productRow.pricingQuarterly||0),
          yearly: Number(productRow.pricingYearly||0)
        }
      }
    }
    if (!product) {
      return res.status(404).render('userpanel/404.njk', { title: 'Product Not Found' })
    }
    
    console.log('🎯 Product detail route - Found product:', { id: product.id, name: product.name, hasId: !!product.id });
    // Plans from DB if available
    let plans = []
    try {
      const prodDb = productRow || await db.Product.findOne({ where: { name: product.name } })
      if (prodDb) {
        plans = await db.Plan.findAll({ where: { productId: prodDb.id, isActive: true }, order: [['sortOrder','ASC']] })
      } else {
        plans = await db.Plan.findAll({ where: { productName: product.name, isActive: true }, order: [['sortOrder','ASC']] })
      }
    } catch (e) {}
    const planCost = (label) => {
      const p = plans.find(pl => pl.planName === `${product.name} ${label}`)
      if (p) return Number(p.cost)
      const key = label.toLowerCase()
      return Number(product.pricing && product.pricing[key] ? product.pricing[key] : 0)
    }
    const pricingResolved = {
      trial: planCost('Trial'),
      monthly: planCost('Monthly'),
      quarterly: planCost('Quarterly'),
      yearly: planCost('Yearly')
    }
    res.render('userpanel/product-detail.njk', {
      product,
      plans,
      pricingResolved,
      title: `${product.name} Trading Signals - SimpleIncome`
    })
  } catch (error) {
    res.status(500).render('userpanel/error.njk', { title: 'Error Loading Product', error: error.message })
  }
})

router.get('/signals/', async (req, res) => {
  try {
    const allSignals = await getSignals({ status: 'completed' })
    // Show only 5 signals as requested
    const signals = allSignals.slice(0, 5)
    const stats = await getSignalStats()
    
    res.render('userpanel/signals.njk', { 
      title: 'Trading Signals - SimpleIncome',
      signals,
      stats
    })
  } catch (error) {
    console.error('Error loading signals:', error)
    res.render('userpanel/signals.njk', { 
      title: 'Trading Signals - SimpleIncome',
      signals: [],
      stats: {},
      error: 'Error loading signals'
    })
  }
})


router.get('/plans', async (req, res) => {
  try {
    const plans = await db.Plan.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC']] })
    res.render('userpanel/plans.njk', { title: 'Plans - SimpleIncome', plans })
  } catch (error) {
    res.status(500).render('userpanel/error.njk', { title: 'Error Loading Plans', error: error.message })
  }
})

router.get('/stocks', (req, res) => {
  res.render('userpanel/stocks.njk', { title: 'Stocks - SimpleIncome' })
})

router.get('/contact', (req, res) => {
  res.render('userpanel/contact.njk', { title: 'Contact - SimpleIncome' })
})

router.get('/login', (req, res) => {
  console.log('ViewsRouter: rendering /login')
  res.render('userpanel/login.njk', { title: 'Login - SimpleIncome' })
})

router.get('/register', (req, res) => {
  console.log('ViewsRouter: rendering /register')
  res.render('userpanel/register.njk', { title: 'Register - SimpleIncome' })
})

// JWT authentication middleware for views
const jwt = require('jsonwebtoken')

const authenticateViewUser = async (req, res, next) => {
  try {
    // Check for token in various places
    const token = req.headers.authorization?.split(' ')[1] || 
                  req.query.token || 
                  req.cookies?.authToken ||
                  req.query.authToken // Add authToken from query params
    
    if (!token) {
      return null // No token found
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    const user = await db.User.findByPk(decoded.id)
    return user
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

router.get('/subscription/confirm', async (req, res) => {
  const { productId, planId } = req.query
  console.log('🎯 Subscription confirm route - productId:', productId, 'planId:', planId)
  
  try {
    // Get authenticated user
    const authUser = await authenticateViewUser(req, res)
    
    if (!authUser) {
      // Redirect to login if not authenticated
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl))
    }
    
    // Fetch product and plan details from database
    const product = await db.Product.findByPk(productId)
    const plan = await db.Plan.findByPk(planId)
    
    if (!product || !plan) {
      return res.status(404).render('userpanel/404.njk', { 
        title: 'Product or Plan Not Found' 
      })
    }
    
    // Parse plan features if they exist
    let planFeatures = []
    if (plan.features) {
      try {
        // Features might be stored as JSON string or already parsed
        if (typeof plan.features === 'string') {
          // Handle escaped JSON string
          let cleanedFeatures = plan.features.replace(/^"+|"+$/g, '')
          // Replace escaped quotes with regular quotes
          cleanedFeatures = cleanedFeatures.replace(/\\"/g, '"')
          planFeatures = JSON.parse(cleanedFeatures)
        } else {
          planFeatures = plan.features
        }
      } catch (error) {
        console.error('Error parsing plan features:', error)
        planFeatures = []
      }
    }
    
    // Calculate subscription dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + (plan.numberOfDays || 30))
    
    // Use authenticated user data
    const user = {
      id: authUser.id,
      fullName: authUser.fullName,
      email: authUser.email,
      phoneNumber: authUser.phoneNumber
    }
    
    res.render('userpanel/subscription-confirm.njk', { 
      title: 'Confirm Subscription - SimpleIncome',
      user,
      product,
      plan: {
        ...plan.toJSON(),
        features: planFeatures
      },
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    })
  } catch (error) {
    console.error('Error loading subscription confirmation:', error)
    res.status(500).render('userpanel/error.njk', { 
      title: 'Error Loading Subscription',
      error: error.message 
    })
  }
})

// Payment retry route for failed payments
router.get('/payment/retry', async (req, res) => {
  const { subscriptionId, productId, planId } = req.query
  console.log('🎯 Payment retry route - subscriptionId:', subscriptionId, 'productId:', productId, 'planId:', planId)
  
  try {
    // Get authenticated user
    const user = await authenticateViewUser(req, res)
    if (!user) {
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl))
    }

    // Validate that the subscription belongs to this user and has failed payment
    const subscription = await db.Subscription.findByPk(subscriptionId, {
      include: [
        {
          model: db.Plan,
          include: [db.Product]
        }
      ]
    })

    if (!subscription || subscription.userId !== user.id) {
      return res.status(404).render('userpanel/error.njk', {
        title: 'Subscription Not Found',
        error: 'Subscription not found or access denied'
      })
    }

    // Check for failed payment transactions
    const transactions = await db.Transaction.findAll({
      where: {
        subscriptionId: subscriptionId,
        userId: user.id,
        paymentStatus: 'failed'
      },
      order: [['createdAt', 'DESC']],
      limit: 1
    })

    if (transactions.length === 0) {
      return res.status(400).render('userpanel/error.njk', {
        title: 'No Failed Payment Found',
        error: 'No failed payment transaction found for this subscription'
      })
    }

    // Redirect to payment page with the subscription details
    res.redirect(`/payment?subscriptionId=${subscriptionId}&productId=${subscription.plan.Product.id}&planId=${subscription.plan.id}`)
    
  } catch (error) {
    console.error('Error in payment retry route:', error)
    res.status(500).render('userpanel/error.njk', { 
      title: 'Error Processing Payment Retry',
      error: error.message 
    })
  }
})

// Payment page route
router.get('/payment', async (req, res) => {
  const { subscriptionId, productId, planId } = req.query
  console.log('🎯 Payment route - subscriptionId:', subscriptionId, 'productId:', productId, 'planId:', planId)
  
  try {
    // Get authenticated user
    const user = await authenticateViewUser(req, res)
    if (!user) {
      return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl))
    }

    // Get payment settings
    const settings = await db.Setting.findOne()
    const upiName = settings?.paymentUpiName || 'StockAgent UPI'
    const upiHandle = settings?.paymentUpiHandle || 'pay@examplebank'

    // Get subscription details if subscriptionId is provided
    let subscription = null
    let product = null
    let plan = null
    
    if (subscriptionId) {
      subscription = await db.Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: db.Plan,
            as: 'plan',
            include: [
              {
                model: db.Product,
                as: 'Product'
              }
            ]
          }
        ]
      })
      
      console.log('🎯 Payment route - subscription found:', subscription?.id)
      console.log('🎯 Payment route - plan cost:', subscription?.plan?.cost, 'type:', typeof subscription?.plan?.cost)
      console.log('🎯 Payment route - plan:', subscription?.plan)
    } else if (productId && planId) {
      // Get product and plan details
      product = await db.Product.findByPk(productId)
      plan = await db.Plan.findByPk(planId)
      
      if (!product || !plan) {
        return res.status(404).render('userpanel/404.njk', { title: 'Product or Plan Not Found' })
      }
    } else if (subscriptionId) {
      return res.status(400).render('userpanel/error.njk', { 
        title: 'Invalid Payment Request',
        error: 'Missing required parameters'
      })
    }

    console.log('🎯 Payment route - rendering with data:', {
      userId: user.id,
      subscriptionId: subscriptionId || '',
      productId: productId || product?.id || '',
      planId: planId || plan?.id || '',
      productName: product?.name || plan?.productName || subscription?.plan?.Product?.name || 'Stocks',
      planName: plan?.planName || subscription?.plan?.planName || 'Unknown Plan',
      planDuration: plan?.numberOfDays || subscription?.plan?.numberOfDays || 30,
      amount: Number(plan?.cost || subscription?.plan?.cost || 0).toFixed(2)
    });
    
    res.render('userpanel/payment.njk', {
      title: 'Payment - StockAgent',
      user: user.toJSON(),
      userId: user.id,
      subscriptionId: subscriptionId || '',
      productId: productId || product?.id || '',
      planId: planId || plan?.id || '',
      productName: product?.name || plan?.productName || subscription?.plan?.Product?.name || 'Stocks',
      planName: plan?.planName || subscription?.plan?.planName || 'Unknown Plan',
      planDuration: plan?.planDays || subscription?.plan?.planDays || 30,
      amount: (() => {
        const costValue = plan?.cost || subscription?.plan?.cost || 0;
        console.log('🎯 Payment route - cost calculation:', costValue, 'type:', typeof costValue);
        return Number(costValue).toFixed(2);
      })(),
      upiName: upiName,
      upiHandle: upiHandle
    })
  } catch (error) {
    console.error('Error loading payment page:', error)
    console.error('Error stack:', error.stack)
    res.status(500).render('userpanel/error.njk', { 
      title: 'Error Loading Payment Page',
      error: error.message 
    })
  }
})

module.exports = router
router.get('/products', async (req, res) => {
  try {
    const products = await getProducts({ status: 'active', sortByOrder: true })
    res.render('userpanel/products.njk', { title: 'Products - SimpleIncome', products })
  } catch (error) {
    res.status(500).render('userpanel/error.njk', { title: 'Error Loading Products', error: error.message })
  }
})
router.get('/dashboard', (req, res) => {
  res.render('userpanel/dashboard.njk', { title: 'My Dashboard - SimpleIncome' })
})

router.get('/dashboard/signals/:productName', (req, res) => {
  res.render('userpanel/user-signals.njk', { title: 'My Signals - SimpleIncome', productName: req.params.productName })
})
