const jwt = require('jsonwebtoken')
const db = require('../models')

const JWT_SECRET = process.env.JWT_SECRET

async function createSubscription(req, res) {
  try {
    const { userId, productName, startDate, endDate, plan } = req.body
    if (!userId || !productName || !startDate || !endDate) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    const subscription = await db.Subscription.create({ userId, productName, startDate, endDate, plan, status: 'pending' })
    res.status(201).json({ message: 'Subscription created successfully', subscriptionId: subscription.id })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function getSubscriptions(req, res) {
  try {
    const { userId, status } = req.query
    const whereClause = {}
    if (userId) whereClause.userId = userId
    if (status) whereClause.status = status
    const subscriptions = await db.Subscription.findAll({ where: whereClause, include: [{ model: db.User, attributes: ['id', 'username', 'email'] }] })
    res.status(200).json(subscriptions)
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function getSubscriptionById(req, res) {
  try {
    const { id } = req.params
    const subscription = await db.Subscription.findByPk(id, { include: [{ model: db.User, attributes: ['id', 'username', 'email'] }] })
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' })
    }
    res.status(200).json(subscription)
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function updateSubscription(req, res) {
  try {
    const { id } = req.params
    const { userId, productName, startDate, endDate, plan, status } = req.body
    const [updatedRows] = await db.Subscription.update({ userId, productName, startDate, endDate, plan, status }, { where: { id } })
    if (updatedRows === 0) {
      return res.status(404).json({ message: 'Subscription not found' })
    }
    const updatedSubscription = await db.Subscription.findByPk(id)
    res.status(200).json({ message: 'Subscription updated successfully', subscription: updatedSubscription })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function deleteSubscription(req, res) {
  try {
    const { id } = req.params
    const deleted = await db.Subscription.destroy({ where: { id } })
    if (deleted === 0) {
      return res.status(404).json({ message: 'Subscription not found' })
    }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function getMySubscriptions(req, res) {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({ message: 'Access token required' })
    }
    jwt.verify(token, JWT_SECRET, async (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' })
      }
      const subscriptions = await db.Subscription.findAll({ where: { userId: user.id }, order: [['createdAt', 'DESC']] })
      res.status(200).json(subscriptions)
    })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function getPendingSubscriptions(req, res) {
  try {
    const subscriptions = await db.Subscription.findAll({ where: { status: 'pending' }, include: [{ model: db.User, attributes: ['email'] }] })
    res.json(subscriptions)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

async function approveSubscription(req, res) {
  try {
    const subscription = await db.Subscription.findByPk(req.params.id)
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' })
    }
    subscription.status = 'active'
    subscription.startDate = new Date()
    let endDate = new Date()
    if (subscription.plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else if (subscription.plan === 'quarterly') {
      endDate.setMonth(endDate.getMonth() + 3)
    } else if (subscription.plan === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setDate(endDate.getDate() + 30)
    }
    subscription.endDate = endDate
    await subscription.save()
    res.json(subscription)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

async function rejectSubscription(req, res) {
  try {
    const subscription = await db.Subscription.findByPk(req.params.id)
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' })
    }
    subscription.status = 'rejected'
    await subscription.save()
    res.json(subscription)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const subscriptionController = {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  getMySubscriptions,
  getPendingSubscriptions,
  approveSubscription,
  rejectSubscription
}

module.exports = { subscriptionController }
