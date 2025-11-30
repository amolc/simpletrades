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

router.get('/dashboard', (req, res) => {
  res.render('admin/dashboard.njk', { title: 'Admin Dashboard' })
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
    // Create a mock request object for the userController
    const mockReq = { query: { userType: 'staff' } }
    const mockRes = {
      json: (data) => {
        if (data.success) {
          res.render('admin/staff.njk', { 
            title: 'Staff - Admin',
            staff: data.data
          })
        } else {
          res.render('admin/staff.njk', { 
            title: 'Staff - Admin',
            staff: [],
            error: data.error
          })
        }
      },
      status: () => ({
        json: (data) => {
          res.render('admin/staff.njk', { 
            title: 'Staff - Admin',
            staff: [],
            error: data.error || 'Failed to fetch staff data'
          })
        }
      })
    }
    
    await userController.getAllUsers(mockReq, mockRes)
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
    // Create a mock request object for the userController
    const mockReq = { query: { userType: 'customer' } }
    const mockRes = {
      json: (data) => {
        if (data.success) {
          res.render('admin/customers.njk', { 
            title: 'Customers - Admin',
            customers: data.data
          })
        } else {
          res.render('admin/customers.njk', { 
            title: 'Customers - Admin',
            customers: [],
            error: data.error
          })
        }
      },
      status: () => ({
        json: (data) => {
          res.render('admin/customers.njk', { 
            title: 'Customers - Admin',
            customers: [],
            error: data.error || 'Failed to fetch customer data'
          })
        }
      })
    }
    
    await userController.getAllUsers(mockReq, mockRes)
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.render('admin/customers.njk', { 
      title: 'Customers - Admin',
      customers: [],
      error: error.message
    })
  }
})

router.get('/signals/:productName', async (req, res) => {
  try {
    const productName = req.params.productName
    
    // Create mock request objects for controllers
    const watchlistReq = {
      query: { productName: productName },
      headers: {}
    }
    const signalsReq = {
      query: {},
      headers: {}
    }
    
    // Mock response objects to capture controller data
    let watchlistData = []
    let signalsData = []
    
    const watchlistRes = {
      json: (data) => { watchlistData = data.data || [] },
      status: () => ({ json: () => {} })
    }
    
    const signalsRes = {
      json: (data) => { signalsData = data.data || [] },
      status: () => ({ json: () => {} })
    }
    
    // Fetch watchlist data filtered by productName
    await watchlistController.getAll(watchlistReq, watchlistRes)
    
    // Fetch all signals data
    await signalsController.getAllSignals(signalsReq, signalsRes)
    
    res.render('admin/signal-detail.njk', { 
      title: 'Signal Detail - Admin', 
      productName: productName,
      watchlist: watchlistData,
      signals: signalsData
    })
    
  } catch (error) {
    console.error('Error fetching signal detail data:', error)
    res.render('admin/signal-detail.njk', { 
      title: 'Signal Detail - Admin', 
      productName: req.params.productName,
      watchlist: [],
      signals: []
    })
  }
})

module.exports = router
