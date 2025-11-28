const express = require('express')

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

router.get('/signals', (req, res) => {
  res.render('admin/signals.njk', { title: 'Admin Signals' })
})

router.get('/products', (req, res) => {
  res.render('admin/products.njk', { title: 'Admin Products' })
})

router.get('/settings', (req, res) => {
  res.render('admin/settings.njk', { title: 'Settings - Admin' })
})

module.exports = router
router.get('/staff', (req, res) => {
  res.render('admin/staff.njk', { title: 'Staff - Admin' })
})

router.get('/customers', (req, res) => {
  res.render('admin/customers.njk', { title: 'Customers - Admin' })
})
router.get('/signals/:productName', (req, res) => {
  res.render('admin/signal-detail.njk', { title: 'Signal Detail - Admin', productName: req.params.productName })
})
