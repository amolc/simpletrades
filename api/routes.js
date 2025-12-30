module.exports = (db) => {
console.log('API routes initialized from', __filename)
const express = require('express')
const axios = require('axios')
const planController = require('./planController')
const { userController } = require('./userController')
const { authenticate } = require('./user')
const { productController } = require('./productController')
const { signalsController } = require('./signalsController')
const { watchlistController } = require('./watchlistController')
const { subscriptionController } = require('./subscriptionController')
const { transactionController } = require('./transactionController')
const { settingsController } = require('./settingsController')
const { priceController } = require('./priceController')
const { tvAdapterController } = require('./tvAdapterController')
const { tradexController } = require('./tradexController')
const nseOptionsController = require('./nseOptionsController')

const router = express.Router()

router.get('/products', productController.getAllProducts)
router.get('/products/:name', productController.getProductByName)
router.post('/products', productController.createProduct)
router.put('/products/:name', productController.updateProduct)
router.delete('/products/:name', productController.deleteProduct)

router.get('/plans', planController.getAllPlans)
router.get('/plans/product/:productName', planController.getPlansByProduct)
router.get('/plans/stats', planController.getPlanStats)
router.get('/plans/:id', planController.getPlanById)
router.post('/plans', planController.createPlan)
router.put('/plans/:id', planController.updatePlan)
router.delete('/plans/:id', planController.deletePlan)

router.get('/signals', signalsController.getAllSignals)
router.get('/signals/stats', signalsController.getSignalStats)
router.get('/signals/products/stats', signalsController.getProductSignalStats)
router.get('/signals/:id', signalsController.getSignalById)
router.post('/signals', signalsController.createSignal)
router.put('/signals/:id', signalsController.updateSignal)
router.delete('/signals/:id', signalsController.deleteSignal)
router.post('/signals/:id/activate', signalsController.activateSignal)
router.post('/signals/:id/close', signalsController.closeSignal)

router.post('/users/register', userController.registerUser)
router.post('/users/login', userController.loginUser)
router.post('/users/admin/login', userController.loginAdmin)
router.get('/users', userController.getAllUsers)
router.get('/users/stats', userController.getUserStats)
router.get('/users/:id', userController.getUserById)
router.put('/users/:id', userController.updateUser)
router.delete('/users/:id', userController.deleteUser)
router.put('/users/:id/change-password', userController.changePassword)

// router.get('/subscriptions/pending', subscriptionController.getPendingSubscriptions)
// router.put('/subscriptions/:id/approve', subscriptionController.approveSubscription)
// router.put('/subscriptions/:id/reject', subscriptionController.rejectSubscription)
// router.get('/subscriptions/my', subscriptionController.getMySubscriptions)
router.get('/subscriptions/pending', subscriptionController.getPendingSubscriptions)
router.put('/subscriptions/:id/approve', subscriptionController.approveSubscription)
router.put('/subscriptions/:id/reject', subscriptionController.rejectSubscription)
router.get('/subscriptions', subscriptionController.getAllSubscriptions)
router.get('/subscriptions/stats', subscriptionController.getSubscriptionStats)
router.get('/subscription-stats', subscriptionController.getSubscriptionStats)
router.post('/subscriptions', subscriptionController.createSubscription)
router.get('/subscriptions/:id', subscriptionController.getSubscriptionById)
router.put('/subscriptions/:id', subscriptionController.updateSubscription)
router.delete('/subscriptions/:id', subscriptionController.deleteSubscription)
router.get('/subscriptions/:id/payment-qrcode', subscriptionController.generatePaymentQrCode)

// Proxy to data.simpleincome.co group price API
router.post('/external-price', async (req, res) => {
  const symbolObjects = req.body
  console.log(`[External Price] Requesting prices for ${symbolObjects.length} symbols`)
  if (!Array.isArray(symbolObjects) || symbolObjects.length === 0) {
    return res.status(400).json({ success: false, error: 'array of symbol objects required' })
  }
  try {
    const response = await axios.post('https://data.simpleincome.co/api/groupprice', symbolObjects, {
      timeout: 80000,
      headers: {
        'User-Agent': 'stockagent/1.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    console.log(`[External Price] Response status: ${response.status}`)
    console.log(`[External Price] Response data:`, JSON.stringify(response.data, null, 2))
    if (typeof response.data === 'object' && response.data !== null) {
      // Update local price cache with received prices
      const cacheMap = req.app && req.app.locals ? req.app.locals.priceCache : null
      if (cacheMap && Array.isArray(response.data)) {
        let updatedCount = 0
        for (const item of response.data) {
          if (item.symbol && item.price !== undefined && item.price !== null) {
            const exchange = item.exchange || 'NSE'
            const key = `${exchange}:${item.symbol}`
            cacheMap.set(key, { lp: Number(item.price), timestamp: Date.now() })
            updatedCount++
          }
        }
        console.log(`[External Price] Updated cache for ${updatedCount} symbols`)
      }
      console.log(`[External Price] Sending response for ${symbolObjects.length} symbols`)
      res.json(response.data)
    } else {
      console.error(`[External Price] Invalid response type:`, typeof response.data)
      res.status(500).json({ success: false, error: 'Invalid response from external API' })
    }
  } catch (error) {
    console.error(`[External Price] Error:`, error.message)
    if (error.response) {
      console.error(`[External Price] Error response status: ${error.response.status}`)
      console.error(`[External Price] Error response data:`, error.response.data)
    }
    res.status(500).json({ success: false, error: error.message })
  }
})
console.log('Registered /api/external-price route')

// Price (TradingView adapter)
router.get('/price', priceController.getQuote)
console.log('Registered /api/price route')

// Price (TradingView API adapter - new)
router.get('/price/adapter', tvAdapterController.getQuote)
console.log('Registered /api/price/adapter route')

router.post('/tradingview/login', priceController.loginTradingView)
router.post('/tradingview/token', priceController.setTradingViewSession)
router.post('/tradingview/selenium-login', priceController.seleniumLoginTradingView)
router.post('/tradingview/auto-login', async (req, res) => {
  try {
    const ok = await priceController.autoLoginFromEnv(req.app)
    if (ok) return res.json({ success:true })
    res.status(400).json({ success:false, error:'missing_env_or_login_failed' })
  } catch(e){ res.status(500).json({ success:false, error: e && e.message }) }
})

router.post('/tradex/login', tradexController.login)
router.get('/tradex/currency', tradexController.getCurrency)
router.post('/tradex/feed/start', tradexController.startFeed)
router.post('/tradex/feed/stop', tradexController.stopFeed)
router.get('/tradex/feed', tradexController.getFeed)

// TradingView adapter feed routes (singleton subscription manager)
router.post('/adapter/feed/start', tvAdapterController.startAdapterFeed)
router.post('/adapter/feed/stop', tvAdapterController.stopAdapterFeed)
router.get('/adapter/feed', tvAdapterController.getAdapterFeed)
console.log('Registered /api/adapter/feed routes')

// NSE Options dedicated service
router.get('/nse-options/price', nseOptionsController.getPrice)
console.log('Registered /api/nse-options/price route')

// Debug ping
router.get('/ping', (req, res) => res.json({ ok: true }))

// Transaction routes
router.get('/transactions', transactionController.getAllTransactions)
router.get('/transactions/:id', transactionController.getTransactionById)
router.post('/transactions', transactionController.createTransaction)
router.put('/transactions/:id', transactionController.updateTransaction)
router.put('/transactions/:id/status', transactionController.updateTransactionStatus)
router.get('/transactions/export', transactionController.exportTransactions)

// Settings
router.get('/settings', settingsController.getSettings)
router.put('/settings', settingsController.updateSettings)
router.post('/settings/reset', settingsController.resetSettings)

// Watchlist
router.get('/watchlist', watchlistController.getAll)
router.get('/watchlist/:id', watchlistController.getById)
router.post('/watchlist', watchlistController.create)
router.put('/watchlist/:id', watchlistController.update)
router.delete('/watchlist/:id', watchlistController.remove)

const path = require('path')
router.get('/admin', authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, '../admin.html'))
})

return router
}
