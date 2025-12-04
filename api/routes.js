module.exports = (db) => {
const express = require('express')
const planController = require('./planController')
const { userController } = require('./userController')
const { authenticate } = require('./user')
const { productController } = require('./productController')
const { signalsController } = require('./signalsController')
const { watchlistController } = require('./watchlistController')
const { subscriptionController } = require('./subscriptionController')
const { transactionController } = require('./transactionController')
const { settingsController } = require('./settingsController')

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
router.get('/subscriptions', subscriptionController.getAllSubscriptions)
router.post('/subscriptions', subscriptionController.createSubscription)
router.get('/subscriptions/:id', subscriptionController.getSubscriptionById)
router.put('/subscriptions/:id', subscriptionController.updateSubscription)
router.delete('/subscriptions/:id', subscriptionController.deleteSubscription)
router.get('/subscriptions/:id/payment-qrcode', subscriptionController.generatePaymentQrCode)

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
