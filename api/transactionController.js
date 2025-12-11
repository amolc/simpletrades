const db = require('../models')
const { Op } = require('sequelize')
const XLSX = require('xlsx')

async function getAllTransactions(req, res) {
  try {
    console.log('DEBUG: getAllTransactions called with query:', req.query)
    const { 
      page = 1, 
      limit = 50, 
      userId, 
      paymentStatus, 
      paymentMethod, 
      transactionType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query

    const offset = (page - 1) * limit
    const whereClause = {}

    // Apply filters
    if (userId) whereClause.userId = userId
    if (paymentStatus) whereClause.paymentStatus = paymentStatus
    if (paymentMethod) whereClause.paymentMethod = paymentMethod
    if (transactionType) whereClause.transactionType = transactionType

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate)
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate)
    }

    console.log('DEBUG: About to query transactions with whereClause:', whereClause)
    const { count, rows } = await db.Transaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'customer',
          attributes: ['id', 'fullName', 'email', 'phoneNumber']
        },
        {
          model: db.Subscription,
          as: 'subscription',
          attributes: ['id', 'status'],
          include: [{
            model: db.Plan,
            as: 'plan',
            attributes: ['id', 'planName', 'cost'],
            include: [{
              model: db.Product,
              as: 'Product',
              attributes: ['id', 'name']
            }]
          }]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

    // Normalize for templates and clients
    const transactions = rows.map(tx => {
      const t = tx.get({ plain: true })
      const plan = t.subscription?.plan
      t.displayProductName = (plan && plan.Product && plan.Product.name) || (plan && plan.productName) || 'N/A'
      t.displayPlanName = (plan && plan.planName) || 'N/A'
      // Ensure dates are Date objects
      t.createdAt = t.createdAt instanceof Date ? t.createdAt : (t.createdAt ? new Date(t.createdAt) : null)
      return t
    })

    console.log('DEBUG: Found', count, 'transactions, returning', rows.length, 'rows')
    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      stack: error.stack // Add stack trace for more detailed debugging
    });
  }
}

async function getTransactionById(req, res) {
  try {
    const { id } = req.params
    
    const transaction = await db.Transaction.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'customer',
          attributes: ['id', 'fullName', 'email', 'phoneNumber']
        },
        {
          model: db.Subscription,
          as: 'subscription',
          include: [{
            model: db.Plan,
            as: 'plan',
            attributes: ['id', 'planName', 'planDescription', 'cost'],
            include: [{
              model: db.Product,
              as: 'Product',
              attributes: ['id', 'name']
            }]
          }]
        }
      ]
    })

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
    }

    res.status(200).json({
      success: true,
      data: transaction
    })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function createTransaction(req, res) {
  try {
    const {
      userId,
      subscriptionId,
      amount,
      currency = 'INR',
      paymentMethod,
      transactionType = 'subscription_payment',
      referenceNumber,
      gatewayResponse = null
    } = req.body

    // Get the intended payment status from the body, but don't use it for initial transaction creation
    const incomingPaymentStatus = req.body.paymentStatus;
    console.log('DEBUG createTransaction incomingPaymentStatus:', incomingPaymentStatus, 'subscriptionId:', subscriptionId)

    // Validate required fields
    if (!userId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'userId, amount, and paymentMethod are required'
      })
    }

    // Generate reference number if not provided
    const finalReferenceNumber = referenceNumber || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const transaction = await db.Transaction.create({
      userId,
      subscriptionId,
      amount,
      currency,
      paymentMethod,
      paymentStatus: 'pending', // Always set to 'pending' for initial transaction creation
      transactionType,
      referenceNumber: finalReferenceNumber,
      gatewayResponse
    })

    // If a subscriptionId is provided and the incoming payment status indicates success, update states
    if (subscriptionId && (incomingPaymentStatus === 'paid' || incomingPaymentStatus === 'completed')) {
      console.log('DEBUG marking subscription and transaction completed for subscriptionId', subscriptionId)
      const subscription = await db.Subscription.findByPk(subscriptionId);
      if (subscription) {
        subscription.paymentStatus = 'completed';
        await subscription.save();
      }
      // Also mark transaction as completed immediately if frontend confirmed payment
      transaction.paymentStatus = 'completed';
      transaction.processedAt = new Date();
      await transaction.save();
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    })
  } catch (error) {
    console.error('Error creating transaction:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function updateTransaction(req, res) {
  try {
    const { id } = req.params
    const {
      paymentStatus,
      failureReason,
      gatewayResponse,
      processedAt
    } = req.body

    const transaction = await db.Transaction.findByPk(id)
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
    }

    // Update transaction
    const updateData = {}
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus
    if (failureReason !== undefined) updateData.failureReason = failureReason
    if (gatewayResponse !== undefined) updateData.gatewayResponse = gatewayResponse
    if (processedAt !== undefined) updateData.processedAt = processedAt

    await transaction.update(updateData)

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    })
  } catch (error) {
    console.error('Error updating transaction:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function updateTransaction(req, res) {
  try {
    const { id } = req.params
    const {
      paymentStatus,
      failureReason,
      gatewayResponse,
      processedAt
    } = req.body

    const transaction = await db.Transaction.findByPk(id)
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      })
    }

    // Update transaction
    const updateData = {}
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus
    if (failureReason !== undefined) updateData.failureReason = failureReason
    if (gatewayResponse !== undefined) updateData.gatewayResponse = gatewayResponse
    if (processedAt !== undefined) updateData.processedAt = processedAt

    await transaction.update(updateData)

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    })
  } catch (error) {
    console.error('Error updating transaction:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

async function updateTransactionStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const transaction = await db.Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    transaction.paymentStatus = status;
    await transaction.save();

    res.status(200).json({ success: true, message: 'Transaction status updated successfully', data: transaction });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}

async function exportTransactions(req, res) {
  try {
    const { 
      userId, 
      paymentStatus, 
      paymentMethod, 
      transactionType,
      startDate,
      endDate,
      format = 'csv' // csv or excel
    } = req.query

    const whereClause = {}

    // Apply filters
    if (userId) whereClause.userId = userId
    if (paymentStatus) whereClause.paymentStatus = paymentStatus
    if (paymentMethod) whereClause.paymentMethod = paymentMethod
    if (transactionType) whereClause.transactionType = transactionType

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate)
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate)
    }

    const transactions = await db.Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'customer',
          attributes: ['id', 'fullName', 'email', 'phoneNumber']
        },
        {
          model: db.Subscription,
          as: 'subscription',
          attributes: ['id', 'status'],
          include: [{
            model: db.Plan,
            as: 'plan',
            attributes: ['id', 'planName']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    })

    // Convert to CSV format
    const csvData = transactions.map(txn => ({
      'Transaction ID': txn.id,
      'Date': txn.createdAt.toISOString().split('T')[0],
      'Customer Name': txn.customer?.fullName || 'N/A',
      'Customer Email': txn.customer?.email || 'N/A',
      'Plan Name': txn.subscription?.plan?.planName || 'N/A',
      'Amount': txn.amount,
      'Currency': txn.currency,
      'Payment Method': txn.paymentMethod,
      'Payment Status': txn.paymentStatus,
      'Transaction Type': txn.transactionType,
      'Reference Number': txn.referenceNumber,
      'Processed At': txn.processedAt ? txn.processedAt.toISOString() : 'N/A'
    }))

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`)
      res.send(csvContent)
    } else if (format === 'excel') {
      // Convert to Excel
      const worksheet = XLSX.utils.json_to_sheet(csvData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Transaction ID
        { wch: 12 }, // Date
        { wch: 20 }, // Customer Name
        { wch: 25 }, // Customer Email
        { wch: 10 }, // Amount
        { wch: 8 },  // Currency
        { wch: 15 }, // Payment Method
        { wch: 15 }, // Payment Status
        { wch: 20 }, // Transaction Type
        { wch: 20 }, // Reference Number
        { wch: 20 }  // Processed At
      ]
      worksheet['!cols'] = colWidths
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.xlsx"`)
      res.send(excelBuffer)
    } else {
      // Invalid format
      res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: csv, excel'
      })
    }
  } catch (error) {
    console.error('Error exporting transactions:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    })
  }
}

const transactionController = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  updateTransactionStatus,
  exportTransactions
}

module.exports = { transactionController }
