const jwt = require('jsonwebtoken')
const db = require('../models')
const { Op } = require('sequelize')

// Load configuration from config.js
const config = require('../config')

const JWT_SECRET = process.env.JWT_SECRET || config.security.jwtSecret

async function createSubscription(req, res) {
  try {
    const { 
      userId, 
      planId, 
      startDate, 
      endDate, 
      amount,
      referenceNumber,
      status = 'active',
      paymentStatus = 'pending'
    } = req.body

    // Validate required fields
    if (!userId || !planId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        message: 'userId, planId, startDate, and endDate are required'
      })
    }

    // Get plan details
    const plan = await db.Plan.findByPk(planId, {
      include: [{
        model: db.Product,
        as: 'Product',
        attributes: ['id', 'name', 'category']
      }]
    })

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      })
    }

    // Generate reference number if not provided
    const finalReferenceNumber = referenceNumber || `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const subscription = await db.Subscription.create({
      userId,
      planId,
      plan: plan.planName,
      amount: amount || plan.cost,
      referenceNumber: finalReferenceNumber,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      paymentStatus
    })

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function getAllSubscriptions(req, res) {
  try {
    console.log('DEBUG: getAllSubscriptions called with query:', req.query)
    const {
      cursor,
      limit = 50,
      userId,
      status,
      paymentStatus,
      planId,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query

    const whereClause = {}

    // Apply filters
    if (userId) whereClause.userId = userId
    if (status) whereClause.status = status
    if (paymentStatus) whereClause.paymentStatus = paymentStatus
    if (planId) whereClause.planId = planId

    // If cursor is provided, get items after that cursor
    if (cursor) {
      whereClause.id = { [db.Op.gt]: cursor }
    }

    console.log('DEBUG: About to query subscriptions with whereClause:', whereClause)
    const rows = await db.Subscription.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          attributes: ['id', 'fullName', 'email', 'phoneNumber']
        },
        {
          model: db.Plan,
          as: 'plan',
          attributes: ['id', 'planName', 'planDescription', 'cost'],
          include: [{
            model: db.Product,
            as: 'Product',
            attributes: ['id', 'name', 'category']
          }]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit) + 1 // Fetch one extra to check if there are more
    })

    let hasNextPage = false
    let nextToken = null
    if (rows.length > parseInt(limit)) {
      hasNextPage = true
      nextToken = rows[rows.length - 2].id // The last item before the extra one
      rows.pop() // Remove the extra item
    }

    console.log('DEBUG: Found subscriptions, returning', rows.length, 'rows, hasNextPage:', hasNextPage)
    res.status(200).json({
      success: true,
      data: {
        subscriptions: rows,
        nextToken: nextToken
      }
    })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function getSubscriptionById(req, res) {
  try {
    const { id } = req.params
    
    const subscription = await db.Subscription.findByPk(id, {
      include: [
        {
          model: db.User,
          attributes: ['id', 'fullName', 'email', 'phoneNumber']
        },
        {
          model: db.Plan,
          as: 'plan',
          attributes: ['id', 'planName', 'planDescription', 'cost', 'numberOfDays'],
          include: [{
            model: db.Product,
            as: 'Product',
            attributes: ['id', 'name', 'category', 'description']
          }]
        },
        {
          model: db.Transaction,
          as: 'transactions',
          attributes: ['id', 'amount', 'paymentMethod', 'paymentStatus', 'createdAt']
        }
      ]
    })

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    res.status(200).json({
      success: true,
      data: subscription
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function updateSubscription(req, res) {
  try {
    const { id } = req.params
    const { 
      planId,
      startDate,
      endDate,
      amount,
      status,
      paymentStatus,
      referenceNumber,
      notes
    } = req.body

    const subscription = await db.Subscription.findByPk(id)
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    const updateData = {}
    if (planId !== undefined) updateData.planId = planId
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (amount !== undefined) updateData.amount = amount
    
    // Validate status values
    if (status !== undefined) {
      const validStatuses = ['active', 'pending', 'expired', 'cancelled']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`
        })
      }
      updateData.status = status
    }
    
    // Validate payment status values
    if (paymentStatus !== undefined) {
      const validPaymentStatuses = ['pending', 'completed', 'failed']
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment status value. Must be one of: ${validPaymentStatuses.join(', ')}`
        })
      }
      updateData.paymentStatus = paymentStatus
    }
    
    if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber
    if (notes !== undefined) updateData.notes = notes

    try {
      await subscription.update(updateData)
    } catch (error) {
      console.error('Database update error:', error)
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        sql: error.sql,
        parameters: error.parameters,
        fields: Object.keys(updateData),
        values: Object.values(updateData)
      })
      
      if (error.name === 'SequelizeDatabaseError' && error.message.includes('Data truncated')) {
        return res.status(400).json({
          success: false,
          message: `Database error: Invalid value for field. Attempted to update: ${JSON.stringify(updateData)}`,
          error: error.message,
          attemptedUpdate: updateData
        })
      }
      throw error // Re-throw other errors to be handled by the general catch block
    }

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function deleteSubscription(req, res) {
  try {
    const { id } = req.params
    const deleted = await db.Subscription.destroy({ where: { id } })
    
    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function getSubscriptionStats(req, res) {
  try {
    const { startDate, endDate } = req.query
    
    const whereClause = {}
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate)
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate)
    }

    const stats = await db.Subscription.findAll({
      where: whereClause,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('status')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalAmount']
      ],
      group: ['status'],
      raw: true
    })

    const totalSubscriptions = await db.Subscription.count({ where: whereClause })
    const totalRevenue = await db.Subscription.sum('amount', { where: whereClause })

    res.status(200).json({
      success: true,
      data: {
        totalSubscriptions,
        totalRevenue: totalRevenue || 0,
        statusBreakdown: stats
      }
    })
  } catch (error) {
    console.error('Error fetching subscription stats:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function getMySubscriptions(req, res) {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      })
    }

    jwt.verify(token, JWT_SECRET, async (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        })
      }

      const subscriptions = await db.Subscription.findAll({
        where: { userId: user.id },
        include: [
          {
            model: db.Plan,
            as: 'plan',
            attributes: ['id', 'planName', 'planDescription', 'cost'],
            include: [{
              model: db.Product,
              as: 'Product',
              attributes: ['id', 'name', 'category']
            }]
          }
        ],
        order: [['createdAt', 'DESC']]
      })

      res.status(200).json({
        success: true,
        data: subscriptions
      })
    })
  } catch (error) {
    console.error('Error fetching user subscriptions:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function getPendingSubscriptions(req, res) {
  try {
    const subscriptions = await db.Subscription.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: db.User,
          attributes: ['id', 'fullName', 'email']
        },
        {
          model: db.Plan,
          as: 'plan',
          attributes: ['id', 'planName', 'cost'],
          include: [{
            model: db.Product,
            as: 'Product',
            attributes: ['id', 'name']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    })

    res.status(200).json({
      success: true,
      data: subscriptions
    })
  } catch (error) {
    console.error('Error fetching pending subscriptions:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function approveSubscription(req, res) {
  try {
    const subscription = await db.Subscription.findByPk(req.params.id, {
      include: [{
        model: db.Plan,
        as: 'plan',
        attributes: ['numberOfDays']
      }]
    })

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    subscription.status = 'active'
    subscription.startDate = new Date()
    
    // Calculate end date based on plan duration
    const endDate = new Date()
    if (subscription.plan && subscription.plan.numberOfDays) {
      endDate.setDate(endDate.getDate() + subscription.plan.numberOfDays)
    } else {
      // Default to 30 days if no plan duration
      endDate.setDate(endDate.getDate() + 30)
    }
    
    subscription.endDate = endDate
    await subscription.save()

    res.status(200).json({
      success: true,
      message: 'Subscription approved successfully',
      data: subscription
    })
  } catch (error) {
    console.error('Error approving subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function rejectSubscription(req, res) {
  try {
    const subscription = await db.Subscription.findByPk(req.params.id)
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      })
    }

    subscription.status = 'cancelled'
    await subscription.save()

    res.status(200).json({
      success: true,
      message: 'Subscription rejected successfully',
      data: subscription
    })
  } catch (error) {
    console.error('Error rejecting subscription:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function generatePaymentQrCode(req, res) {
  try {
    const { id } = req.params;

    const subscription = await db.Subscription.findByPk(id, {
      include: [
        {
          model: db.Plan,
          as: 'plan',
          attributes: ['cost']
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (!subscription.plan || !subscription.plan.cost) {
      console.error('DEBUG (backend): Subscription plan or cost not found for subscription ID:', id);
      return res.status(400).json({ success: false, message: 'Subscription plan or cost not found' });
    }

    console.log('DEBUG (backend): Raw subscription.plan.cost:', subscription.plan.cost, 'type:', typeof subscription.plan.cost);

    let amountValue = parseFloat(subscription.plan.cost);

    if (isNaN(amountValue)) {
      console.error('DEBUG (backend): parseFloat resulted in NaN for cost:', subscription.plan.cost);
      return res.status(400).json({ success: false, message: 'Invalid plan cost received (NaN after parseFloat)' });
    }

    if (typeof amountValue !== 'number') {
      console.error('DEBUG (backend): amountValue is not a number before toFixed. Value:', amountValue, 'Type:', typeof amountValue);
      return res.status(500).json({ success: false, message: 'Internal server error: Amount value is not a number.' });
    }

    const amount = amountValue.toFixed(2);

    console.log('DEBUG (backend): Final amount for UPI link:', amount);
    const upiLink = `upi://pay?pa=pay@examplebank&pn=StockAgent&am=${amount}&cu=INR&mc=0000&tid=${subscription.id}`;

    res.status(200).json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        amount: amount,
        paymentUrl: upiLink
      }
    });

  } catch (error) {
    console.error('Error generating payment QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      stack: error.stack // Add stack trace for more detailed debugging
    });
  }
}

const subscriptionController = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  getSubscriptionStats,
  getMySubscriptions,
  getPendingSubscriptions,
  approveSubscription,
  rejectSubscription,
  generatePaymentQrCode
}

module.exports = { subscriptionController }