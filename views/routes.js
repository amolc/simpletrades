const express = require('express')
const { getProducts } = require('../api/productController')
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
    const products = await getProducts({ status: 'active' })
    const product = products.find(p => p.name.toLowerCase() === req.params.name.toLowerCase())
    if (!product) {
      return res.status(404).render('userpanel/404.njk', { title: 'Product Not Found' })
    }
    res.render('userpanel/product-detail.njk', {
      product,
      title: `${product.name} Trading Signals - SimpleIncome`
    })
  } catch (error) {
    res.status(500).render('userpanel/error.njk', { title: 'Error Loading Product', error: error.message })
  }
})

router.get('/signals/', (req, res) => {
  res.render('userpanel/signals.njk', { title: 'Trading Signals - SimpleIncome' })
})

router.get('/signals', (req, res) => {
  res.render('userpanel/signals.njk', { title: 'Trading Signals - SimpleIncome' })
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
