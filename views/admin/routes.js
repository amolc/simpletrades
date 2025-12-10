const express = require('express')
const { userController } = require('../../api/userController')
const { signalsController } = require('../../api/signalsController')
const { watchlistController } = require('../../api/watchlistController')
const { subscriptionController } = require('../../api/subscriptionController')
const { transactionController } = require('../../api/transactionController')
const db = require('../../models')

const router = express.Router()

router.get('/login', (req, res) => {
  res.render('admin/login.njk', { title: 'Admin Login' })
})

router.get('/dashboard', async (req, res) => {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const totalCustomers = await db.User.count({ where: { userType: 'customer' } })
    const todayCustomers = await db.User.count({ 
      where: { 
        userType: 'customer', 
        createdAt: { [db.Sequelize.Op.between]: [startOfDay, endOfDay] } 
      } 
    })

    const totalSubscriptions = await db.Subscription.count()
    const todaySubscriptions = await db.Subscription.count({ 
      where: { createdAt: { [db.Sequelize.Op.between]: [startOfDay, endOfDay] } } 
    })

    let productStats = []
    try {
      const mockReq = {}
      const mockRes = {
        json: (data) => { if (data.success && data.data) productStats = data.data },
        status: () => ({ json: () => {} })
      }
      await signalsController.getProductSignalStats(mockReq, mockRes)
    } catch (e) {}

    res.render('admin/dashboard.njk', { 
      title: 'Admin Dashboard',
      stats: {
        totalCustomers,
        todayCustomers,
        totalSubscriptions,
        todaySubscriptions
      },
      productStats
    })
  } catch (error) {
    res.render('admin/dashboard.njk', { 
      title: 'Admin Dashboard',
      error: error.message,
      stats: { totalCustomers: 0, todayCustomers: 0, totalSubscriptions: 0, todaySubscriptions: 0 },
      productStats: []
    })
  }
})

router.get('/clients', (req, res) => {
  res.render('admin/clients.njk', { title: 'Clients - Admin' })
})

router.get('/signals', async (req, res) => {
  try {
    // Fetch active clients count
    const mockReqClients = { query: { userType: 'customer', status: 'active' } }
    let activeClients = 0
    
    const mockResClients = {
      json: (data) => {
        if (data.success) {
          activeClients = data.count || data.data?.length || 0
        }
      },
      status: () => ({ json: () => {} })
    }
    
    await userController.getAllUsers(mockReqClients, mockResClients)
    
    // Fetch signal statistics
    let signalStats = { winRate: 0, netProfit: 0, inProgressSignals: 0, profitSignals: 0, lossSignals: 0, completedSignals: 0 }
    try {
      const mockReqStats = {}
      const mockResStats = {
        json: (data) => {
          if (data.success && data.data) {
            signalStats = data.data
          }
        },
        status: () => ({ json: () => {} })
      }
      await signalsController.getSignalStats(mockReqStats, mockResStats)
    } catch (statsError) {
      console.error('Error fetching signal stats:', statsError)
    }
    
    // Fetch product signal statistics
    let productStats = []
    try {
      const mockReqProductStats = { url: '/api/signals/products/stats' }
      const mockResProductStats = {
        json: (data) => {
          if (data.success && data.data) {
            productStats = data.data
          }
        },
        status: () => ({ json: () => {} })
      }
      await signalsController.getProductSignalStats(mockReqProductStats, mockResProductStats)
    } catch (productStatsError) {
      console.error('Error fetching product signal stats:', productStatsError)
    }
    
    // Fetch products data for watchlist dropdown
    let productsData = []
    try {
      productsData = await productController.getAllProducts()
      console.log('Products data fetched:', productsData.length, 'items') // Debug log
    } catch (productsError) {
      console.error('Error fetching products data:', productsError)
    }
    
    // Fetch watchlist data directly from database
    let watchlistData = []
    try {
      console.log('Attempting to fetch watchlist data directly...') // Debug log
      const list = await db.Watchlist.findAll({ order:[['updatedAt','DESC']] })
      console.log('Raw database result:', list) // Debug log
      // Convert to plain objects for template
      watchlistData = list.map(item => item.get({ plain: true }))
      console.log('Watchlist data fetched directly:', watchlistData.length, 'items') // Debug log
    } catch (watchlistError) {
      console.error('Error fetching watchlist data:', watchlistError)
    }
    
    // Fetch signals data directly from database
    let signalsData = []
    try {
      console.log('Attempting to fetch signals data directly...') // Debug log
      const signalsList = await db.Signal.findAll({ 
        order: [['createdAt', 'DESC']] 
      })
      console.log('Raw signals database result:', signalsList.length, 'signals') // Debug log
      
      // Convert to plain objects and format for template
      signalsData = signalsList.map(item => {
        const plainItem = item.get({ plain: true })
        return {
          ...plainItem,
          entry: parseFloat(plainItem.entry),
          target: parseFloat(plainItem.target),
          stopLoss: parseFloat(plainItem.stopLoss),
          exitPrice: plainItem.exitPrice ? parseFloat(plainItem.exitPrice) : null,
          profitLoss: plainItem.profitLoss ? parseFloat(plainItem.profitLoss) : null,
          entryDateTime: plainItem.entryDateTime instanceof Date ? plainItem.entryDateTime : (plainItem.entryDateTime ? new Date(plainItem.entryDateTime) : null),
          exitDateTime: plainItem.exitDateTime instanceof Date ? plainItem.exitDateTime : (plainItem.exitDateTime ? new Date(plainItem.exitDateTime) : null),
          createdAt: plainItem.createdAt instanceof Date ? plainItem.createdAt : new Date(plainItem.createdAt),
          updatedAt: plainItem.updatedAt instanceof Date ? plainItem.updatedAt : new Date(plainItem.updatedAt)
        }
      })
      console.log('Signals data fetched directly:', signalsData.length, 'signals') // Debug log
      console.log('First signal sample:', signalsData[0]) // Debug log
    } catch (signalsError) {
      console.error('Error fetching signals data:', signalsError)
    }
    
    console.log('Rendering signals template with watchlist:', watchlistData.length, 'items') // Debug log
    res.render('admin/signals.njk', { 
      title: 'Admin Signals',
      activeClients: activeClients || 0,
      winRate: signalStats.winRate || 0,
      netProfit: signalStats.netProfit || 0,
      productStats: productStats,
      watchlist: watchlistData,
      signals: signalsData,
      products: productsData
    })
    
  } catch (error) {
    console.error('Error fetching signals data:', error)
    res.render('admin/signals.njk', { 
      title: 'Admin Signals',
      activeClients: 0,
      winRate: 0,
      netProfit: 0,
      watchlist: [],
      signals: [],
      products: [],
      error: error.message
    })
  }
})

const productController = require('../../api/productController')

router.get('/products', async (req, res) => {
  try {
    const products = await productController.getAllProducts()
    res.render('admin/products.njk', { title: 'Admin Products', products })
  } catch (error) {
    res.render('admin/products.njk', { title: 'Admin Products', products: [], error: error.message })
  }
})

router.get('/settings', (req, res) => {
  res.render('admin/settings.njk', { title: 'Settings - Admin' })
})

router.get('/subscriptions', async (req, res) => {
  try {
    console.log('DEBUG: /admin/subscriptions route called')
    // Create a mock request object for the subscriptionController
    const mockReq = { query: { page: 1, limit: 50 } }
    const mockRes = {
      json: (data) => {
        if (data.success) {
          res.render('admin/subscriptions.njk', { 
            title: 'Subscriptions - Admin',
            subscriptions: data.data.subscriptions,
            pagination: data.data.pagination
          })
        } else {
          res.render('admin/subscriptions.njk', { 
            title: 'Subscriptions - Admin',
            subscriptions: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
            error: data.error
          })
        }
      },
      status: () => ({
        json: (data) => {
          res.render('admin/subscriptions.njk', { 
            title: 'Subscriptions - Admin',
            subscriptions: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
            error: data.error || 'Failed to fetch subscription data'
          })
        }
      })
    }
    
    await subscriptionController.getAllSubscriptions(mockReq, mockRes)
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    console.error('Error stack:', error.stack)
    res.render('admin/subscriptions.njk', { 
      title: 'Subscriptions - Admin',
      subscriptions: [],
      pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      error: error.message
    })
  }
})

router.get('/transactions', async (req, res) => {
  try {
    console.log('DEBUG: /admin/transactions route called')
    // Create a mock request object for the transactionController
    const mockReq = { query: { page: 1, limit: 50 } }
    const mockRes = {
      json: (data) => {
        if (data.success) {
          res.render('admin/transactions.njk', { 
            title: 'Transactions - Admin',
            transactions: data.data.transactions,
            pagination: data.data.pagination
          })
        } else {
          res.render('admin/transactions.njk', { 
            title: 'Transactions - Admin',
            transactions: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
            error: data.error
          })
        }
      },
      status: () => ({
        json: (data) => {
          res.render('admin/transactions.njk', { 
            title: 'Transactions - Admin',
            transactions: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
            error: data.error || 'Failed to fetch transaction data'
          })
        }
      })
    }
    
    await transactionController.getAllTransactions(mockReq, mockRes)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    console.error('Error stack:', error.stack)
    res.render('admin/transactions.njk', { 
      title: 'Transactions - Admin',
      transactions: [],
      pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
      error: error.message
    })
  }
})

router.get('/staff', async (req, res) => {
  try {
    // Directly call the database and render - simpler and more reliable
    const staff = await db.User.findAll({
      where: { userType: 'staff' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/staff.njk', {
      title: 'Staff - Admin',
      staff: staff
    })
  } catch (error) {
    console.error('Error fetching staff:', error)
    res.render('admin/staff.njk', {
      title: 'Staff - Admin',
      staff: [],
      error: error.message
    })
  }
})

router.get('/customers', async (req, res) => {
  try {
    // Directly call the database and render - simpler and more reliable
    const customers = await db.User.findAll({
      where: { userType: 'customer' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/customers.njk', {
      title: 'Customers - Admin',
      customers: customers
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.render('admin/customers.njk', {
      title: 'Customers - Admin',
      customers: [],
      error: error.message
    })
  }
})

// Test modal route
router.get('/test-modal', (req, res) => {
  res.render('admin/test-modal.njk', {
    title: 'Test Modal - Admin'
  })
})

router.get('/signals/:productName', async (req, res) => {
  try {
    const productName = req.params.productName
    const productRow = await db.Product.findOne({ where: { name: productName } })
    
    // Fetch product signal statistics for this specific product
    let productStats = null
    try {
      // Get all product stats and filter for this specific product
      const mockReqProductStats = { url: '/api/signals/products/stats' }
      const mockResProductStats = {
        json: (data) => {
          if (data.success && data.data) {
            productStats = data.data.find(p => p.productName === productName) || {
              productName: productName,
              totalSignals: 0,
              winLossRatio: 0,
              profitSignals: 0,
              lossSignals: 0,
              inProgressSignals: 0
            }
          }
        },
        status: () => ({ json: () => {} })
      }
      await signalsController.getProductSignalStats(mockReqProductStats, mockResProductStats)
    } catch (productStatsError) {
      console.error('Error fetching product signal stats:', productStatsError)
      productStats = {
        productName: productName,
        totalSignals: 0,
        winLossRatio: 0,
        profitSignals: 0,
        lossSignals: 0,
        inProgressSignals: 0
      }
    }
    
    // Fetch signals filtered by productId when available
    let filteredSignals = []
    try {
      const where = productRow ? { productId: productRow.id } : {}
      const signalsList = await db.Signal.findAll({ 
        where,
        order: [['createdAt', 'DESC']] 
      })
      
      // Convert to plain objects and format for template
      filteredSignals = signalsList.map(item => {
        const plainItem = item.get({ plain: true })
        return {
          ...plainItem,
          entry: parseFloat(plainItem.entry),
          target: parseFloat(plainItem.target),
          stopLoss: parseFloat(plainItem.stopLoss),
          exitPrice: plainItem.exitPrice ? parseFloat(plainItem.exitPrice) : null,
          profitLoss: plainItem.profitLoss ? parseFloat(plainItem.profitLoss) : null,
          entryDateTime: plainItem.entryDateTime instanceof Date ? plainItem.entryDateTime : (plainItem.entryDateTime ? new Date(plainItem.entryDateTime) : null),
          exitDateTime: plainItem.exitDateTime instanceof Date ? plainItem.exitDateTime : (plainItem.exitDateTime ? new Date(plainItem.exitDateTime) : null),
          createdAt: plainItem.createdAt instanceof Date ? plainItem.createdAt : new Date(plainItem.createdAt),
          updatedAt: plainItem.updatedAt instanceof Date ? plainItem.updatedAt : new Date(plainItem.updatedAt)
        }
      })
    } catch (signalsError) {
      console.error('Error fetching filtered signals:', signalsError)
    }
    
    // Fetch watchlist data filtered by product
    let watchlistData = []
    try {
      const watchlistList = await db.Watchlist.findAll({
        where: { product: productName },
        order: [['updatedAt', 'DESC']]
      })
      watchlistData = watchlistList.map(item => {
        const itemData = item.get({ plain: true })
        // Convert decimal fields to numbers for template rendering
        itemData.currentPrice = parseFloat(itemData.currentPrice)
        itemData.alertPrice = parseFloat(itemData.alertPrice)
        return itemData
      })
    } catch (watchlistError) {
      console.error('Error fetching watchlist data:', watchlistError)
    }
    
    res.render('admin/signals-product.njk', { 
      title: `${productName} Signals - Admin`, 
      productName: productName,
      product: productRow ? productRow.get({ plain: true }) : null,
      productStats: productStats,
      signals: filteredSignals,
      watchlist: watchlistData
    })
    
  } catch (error) {
    console.error('Error fetching signal detail data:', error)
    res.render('admin/signals-product.njk', { 
      title: `${req.params.productName} Signals - Admin`, 
      productName: req.params.productName,
      productStats: {
        productName: req.params.productName,
        totalSignals: 0,
        winLossRatio: 0,
        profitSignals: 0,
        lossSignals: 0,
        inProgressSignals: 0
      },
      signals: [],
      watchlist: [],
      error: error.message
    })
  }
})

// Add subscription detail route
router.get('/subscriptions/:id', async (req, res) => {
  try {
    const subscriptionId = req.params.id;

    // Fetch subscription data directly from database
    const subscription = await db.Subscription.findByPk(subscriptionId, {
      include: [
        { model: db.User, as: 'User' },
        { model: db.Plan, as: 'plan', include: [{ model: db.Product, as: 'Product' }] }
      ]
    });

    if (!subscription) {
      return res.status(404).render('admin/404.njk', {
        title: 'Subscription Not Found',
        message: 'The requested subscription does not exist.'
      });
    }

    // Fetch related transactions
    const transactions = await db.Transaction.findAll({
      where: { subscriptionId: subscriptionId },
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/subscription-detail.njk', {
      title: 'Subscription Details - Admin',
      subscription: subscription,
      transactions: transactions
    });

  } catch (error) {
    console.error('Error fetching subscription details:', error);
    res.status(500).render('admin/error.njk', {
      title: 'Error - Admin',
      message: 'Error loading subscription details',
      error: error.message
    });
  }
});

module.exports = router
