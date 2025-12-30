const db = require('../models')
const { Op } = require('sequelize')
const axios = require('axios')

const getSignals = async (filters = {}) => {
  const whereClause = {}
  if (filters.status) {
    if (filters.status === 'completed') {
      whereClause.status = { [Op.in]: ['PROFIT', 'LOSS'] }
    } else {
      whereClause.status = filters.status
    }
  }
  if (filters.type) whereClause.signalType = filters.type
  if (filters.productId) whereClause.productId = filters.productId
  if (filters.date) whereClause.date = filters.date
  const signals = await db.Signal.findAll({ where: whereClause, order: [['createdAt', 'DESC']] })
  return signals.map(signal => ({
    id: signal.id,
    productId: signal.productId,
    product: signal.product,
    symbol: signal.symbol,
    exchange: signal.exchange,
    signalType: signal.signalType,
    type: signal.type,
    entry: parseFloat(signal.entry),
    target: parseFloat(signal.target),
    stopLoss: parseFloat(signal.stopLoss),
    exitPrice: signal.exitPrice ? parseFloat(signal.exitPrice) : null,
    profitLoss: signal.profitLoss ? parseFloat(signal.profitLoss) : null,
    status: signal.status,
    notes: signal.notes,
    date: signal.date,
    time: signal.time,
    entryDateTime: signal.entryDateTime,
    exitDateTime: signal.exitDateTime,
    duration: signal.duration,
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt
  }))
}

const getSignalById = async (id) => {
  const signal = await db.Signal.findByPk(id)
  if (!signal) return null
  return {
    id: signal.id,
    productId: signal.productId,
    product: signal.product,
    symbol: signal.symbol,
    exchange: signal.exchange,
    signalType: signal.signalType,
    type: signal.type,
    entry: parseFloat(signal.entry),
    target: parseFloat(signal.target),
    stopLoss: parseFloat(signal.stopLoss),
    exitPrice: signal.exitPrice ? parseFloat(signal.exitPrice) : null,
    profitLoss: signal.profitLoss ? parseFloat(signal.profitLoss) : null,
    status: signal.status,
    notes: signal.notes,
    date: signal.date,
    time: signal.time,
    entryDateTime: signal.entryDateTime,
    exitDateTime: signal.exitDateTime,
    duration: signal.duration,
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt
  }
}

const createSignal = async (signalData) => {
  const currentDate = new Date()
  const dateOnly = currentDate.toISOString().split('T')[0]
  const timeString = currentDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false })
  let userId = signalData.userId
  if (userId === undefined || userId === null) {
    const anyUser = await db.User.findOne({ order: [['id','ASC']] })
    userId = anyUser ? anyUser.id : null
  }
  const prod = await db.Product.findByPk(signalData.productId)
  const typeCat = prod ? String(prod.category||'').toLowerCase() : null
  const productName = prod ? prod.name : null
  const newSignal = await db.Signal.create({
    productId: signalData.productId,
    product: productName,
    symbol: (typeof (signalData.symbol || signalData.product) === 'string' ? (signalData.symbol || signalData.product).trim() : (signalData.symbol || signalData.product)),
    exchange: signalData.exchange || null,
    signalType: signalData.signalType || 'BUY',
    type: typeCat,
    entry: signalData.entry,
    target: signalData.target,
    stopLoss: signalData.stopLoss,
    exitPrice: signalData.exitPrice || null,
    profitLoss: signalData.profitLoss || null,
    status: signalData.status || 'IN_PROGRESS',
    notes: signalData.notes || '',
    date: signalData.date || dateOnly,
    time: signalData.time || timeString,
    entryDateTime: signalData.entryDateTime || currentDate,
    exitDateTime: signalData.exitDateTime || null,
    duration: signalData.duration || null,
    userId
  })
  return {
    id: newSignal.id,
    productId: newSignal.productId,
    product: newSignal.product,
    symbol: newSignal.symbol,
    exchange: newSignal.exchange,
    signalType: newSignal.signalType,
    type: newSignal.type,
    entry: parseFloat(newSignal.entry),
    target: parseFloat(newSignal.target),
    stopLoss: parseFloat(newSignal.stopLoss),
    exitPrice: newSignal.exitPrice ? parseFloat(newSignal.exitPrice) : null,
    profitLoss: newSignal.profitLoss ? parseFloat(newSignal.profitLoss) : null,
    status: newSignal.status,
    notes: newSignal.notes,
    date: newSignal.date,
    time: newSignal.time,
    entryDateTime: newSignal.entryDateTime,
    exitDateTime: newSignal.exitDateTime,
    duration: newSignal.duration,
    createdAt: newSignal.createdAt,
    updatedAt: newSignal.updatedAt
  }
}

const updateSignal = async (id, updateData) => {
  const signal = await db.Signal.findByPk(id)
  if (!signal) return null
  
  // Validate status transitions
  if (updateData.status !== undefined) {
    // Only allow transitions from IN_PROGRESS to PROFIT/LOSS
    if (signal.status !== 'IN_PROGRESS' && ['PROFIT', 'LOSS'].includes(updateData.status)) {
      throw new Error('Only IN_PROGRESS signals can be transitioned to PROFIT or LOSS')
    }
    signal.status = updateData.status
  }
  
  if (updateData.productId !== undefined) {
    signal.productId = updateData.productId
    try {
      const prod = await db.Product.findByPk(updateData.productId)
      if (prod) {
        signal.product = prod.name
        if (prod.category) signal.type = String(prod.category).toLowerCase()
      }
    } catch(e){}
  }
  if (updateData.symbol !== undefined) signal.symbol = (typeof updateData.symbol === 'string' ? updateData.symbol.trim() : updateData.symbol)
  if (updateData.exchange !== undefined) signal.exchange = updateData.exchange
  if (updateData.signalType !== undefined) signal.signalType = updateData.signalType
  if (updateData.type !== undefined) signal.type = updateData.type
  if (updateData.entry !== undefined) signal.entry = updateData.entry
  if (updateData.target !== undefined) signal.target = updateData.target
  if (updateData.stopLoss !== undefined) signal.stopLoss = updateData.stopLoss
  if (updateData.exitPrice !== undefined) signal.exitPrice = updateData.exitPrice
  if (updateData.profitLoss !== undefined) signal.profitLoss = updateData.profitLoss
  if (updateData.notes !== undefined) signal.notes = updateData.notes
  if (updateData.date !== undefined) signal.date = updateData.date
  if (updateData.time !== undefined) signal.time = updateData.time
  if (updateData.entryDateTime !== undefined) signal.entryDateTime = updateData.entryDateTime
  if (updateData.exitDateTime !== undefined) signal.exitDateTime = updateData.exitDateTime
  
  // Auto-set exitDateTime when transitioning to PROFIT/LOSS
  if (['PROFIT', 'LOSS'].includes(signal.status) && signal.entryDateTime && !signal.exitDateTime) {
    signal.exitDateTime = new Date()
  }
  
  // Calculate duration if both times are available
  if (signal.entryDateTime && signal.exitDateTime) {
    const durationMs = new Date(signal.exitDateTime) - new Date(signal.entryDateTime)
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    signal.duration = `${durationHours}h ${durationMinutes}m`
  }
  
  await signal.save()
  return {
    id: signal.id,
    productId: signal.productId,
    product: signal.product,
    symbol: signal.symbol,
    exchange: signal.exchange,
    signalType: signal.signalType,
    type: signal.type,
    entry: parseFloat(signal.entry),
    target: parseFloat(signal.target),
    stopLoss: parseFloat(signal.stopLoss),
    exitPrice: signal.exitPrice ? parseFloat(signal.exitPrice) : null,
    profitLoss: signal.profitLoss ? parseFloat(signal.profitLoss) : null,
    status: signal.status,
    notes: signal.notes,
    date: signal.date,
    time: signal.time,
    entryDateTime: signal.entryDateTime,
    exitDateTime: signal.exitDateTime,
    duration: signal.duration,
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt
  }
}

const deleteSignal = async (id) => {
  const result = await db.Signal.destroy({ where: { id } })
  return result > 0
}

const activateSignal = async (id) => {
  const signal = await db.Signal.findByPk(id)
  if (!signal) return null
  
  // Since we only have IN_PROGRESS, PROFIT, LOSS statuses now,
  // and signals are created as IN_PROGRESS by default,
  // this function is mainly for setting entry time if not already set
  if (!signal.entryDateTime) {
    signal.entryDateTime = new Date()
  }
  
  // Ensure status is IN_PROGRESS (should already be)
  if (signal.status !== 'IN_PROGRESS') {
    signal.status = 'IN_PROGRESS'
  }
  
  await signal.save()
  
  return {
    id: signal.id,
    productId: signal.productId,
    product: signal.product,
    symbol: signal.symbol,
    exchange: signal.exchange,
    signalType: signal.signalType,
    type: signal.type,
    entry: parseFloat(signal.entry),
    target: parseFloat(signal.target),
    stopLoss: parseFloat(signal.stopLoss),
    exitPrice: signal.exitPrice ? parseFloat(signal.exitPrice) : null,
    profitLoss: signal.profitLoss ? parseFloat(signal.profitLoss) : null,
    status: signal.status,
    notes: signal.notes,
    date: signal.date,
    time: signal.time,
    entryDateTime: signal.entryDateTime,
    exitDateTime: signal.exitDateTime,
    duration: signal.duration,
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt
  }
}

const closeSignal = async (id, exitPrice = null, notes = undefined) => {
  const signal = await db.Signal.findByPk(id)
  if (!signal) return null
  
  // Validate signal can be closed (must be IN_PROGRESS)
  if (signal.status !== 'IN_PROGRESS') {
    throw new Error('Only IN_PROGRESS signals can be closed')
  }
  
  // Set exit price - use provided price or target as fallback
  const finalExitPrice = exitPrice !== null ? exitPrice : signal.target
  try { console.log('closeSignal compute start', { id, symbol: signal.symbol, exchange: signal.exchange, entry: signal.entry, exitPrice: finalExitPrice, type: signal.signalType }) } catch(e){}
  signal.exitPrice = finalExitPrice
  signal.exitDateTime = new Date()
  
  // Calculate profit/loss based on signal type
  let profitLoss = 0
  let status = 'LOSS'
  
  if (signal.signalType === 'BUY') {
    // For BUY signals: profit when exit price > entry price
    profitLoss = finalExitPrice - signal.entry
    if (finalExitPrice > signal.entry) {
      status = 'PROFIT'
    } else if (finalExitPrice === signal.entry) {
      status = 'LOSS' // breakeven considered as loss
    }
  } else if (signal.signalType === 'SELL') {
    // For SELL signals: profit when exit price < entry price
    profitLoss = signal.entry - finalExitPrice
    if (finalExitPrice < signal.entry) {
      status = 'PROFIT'
    } else if (finalExitPrice === signal.entry) {
      status = 'LOSS' // breakeven considered as loss
    }
  }
  
  try { console.log('closeSignal compute result', { id, finalExitPrice, profitLoss, status }) } catch(e){}
  signal.profitLoss = profitLoss
  signal.status = status
  if (notes !== undefined) signal.notes = notes
  
  // Calculate duration
  if (signal.entryDateTime && signal.exitDateTime) {
    const durationMs = new Date(signal.exitDateTime) - new Date(signal.entryDateTime)
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    signal.duration = `${durationHours}h ${durationMinutes}m`
  }
  
  await signal.save()
  try { console.log('closeSignal saved', { id: signal.id, status: signal.status, exitPrice: signal.exitPrice, profitLoss: signal.profitLoss }) } catch(e){}
  
  return {
    id: signal.id,
    productId: signal.productId,
    product: signal.product,
    symbol: signal.symbol,
    exchange: signal.exchange,
    signalType: signal.signalType,
    type: signal.type,
    entry: parseFloat(signal.entry),
    target: parseFloat(signal.target),
    stopLoss: parseFloat(signal.stopLoss),
    exitPrice: signal.exitPrice ? parseFloat(signal.exitPrice) : null,
    profitLoss: signal.profitLoss ? parseFloat(signal.profitLoss) : null,
    status: signal.status,
    notes: signal.notes,
    date: signal.date,
    time: signal.time,
    entryDateTime: signal.entryDateTime,
    exitDateTime: signal.exitDateTime,
    duration: signal.duration,
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt
  }
}

const getSignalStats = async () => {
  const totalSignals = await db.Signal.count()
  const inProgressSignals = await db.Signal.count({ where: { status: 'IN_PROGRESS' } })
  const profitSignals = await db.Signal.count({ where: { status: 'PROFIT' } })
  const lossSignals = await db.Signal.count({ where: { status: 'LOSS' } })
  const completedSignals = profitSignals + lossSignals
  const winRate = completedSignals > 0 ? Math.round((profitSignals / completedSignals) * 100) : 0
  
  const profitResult = await db.Signal.findOne({ 
    attributes: [[db.sequelize.fn('SUM', db.sequelize.col('profitLoss')), 'totalProfit']], 
    where: { status: 'PROFIT' } 
  })
  const lossResult = await db.Signal.findOne({ 
    attributes: [[db.sequelize.fn('SUM', db.sequelize.col('profitLoss')), 'totalLoss']], 
    where: { status: 'LOSS' } 
  })
  
  const totalProfit = parseFloat(profitResult?.dataValues?.totalProfit || 0)
  const rawTotalLoss = parseFloat(lossResult?.dataValues?.totalLoss || 0)
  // totalLoss should be positive for display, but it's stored as negative in DB
  const totalLoss = Math.abs(rawTotalLoss)
  const netProfit = totalProfit + rawTotalLoss // adding negative loss to positive profit
  
  return { 
    totalSignals, 
    inProgressSignals, 
    profitSignals, 
    lossSignals, 
    completedSignals,
    winRate, 
    totalProfit, 
    totalLoss, 
    netProfit 
  }
}

const getProductSignalStats = async () => {
  try {
    const productTypes = await db.Signal.findAll({
      attributes: ['type'],
      group: ['type'],
      order: [['type', 'ASC']]
    })

    const productStats = []

    for (const productType of productTypes) {
      let productName = 'Stocks'
      if (productType.type === 'stocks') {
        productName = 'Stocks'
      } else if (productType.type === 'options') {
        productName = 'Options'
      } else if (productType.type === 'commodity') {
        productName = 'Commodity'
      } else if (productType.type === 'crypto') {
        productName = 'Crypto'
      } else if (productType.type === 'forex') {
        productName = 'Forex'
      }

      const totalSignals = await db.Signal.count({ where: { type: productType.type } })
      const profitSignals = await db.Signal.count({ where: { type: productType.type, status: 'PROFIT' } })
      const lossSignals = await db.Signal.count({ where: { type: productType.type, status: 'LOSS' } })
      const inProgressSignals = await db.Signal.count({ where: { type: productType.type, status: 'IN_PROGRESS' } })
      const completedSignals = profitSignals + lossSignals
      const winLossRatio = completedSignals > 0 ? Math.round((profitSignals / completedSignals) * 100) : 0

      const totalProfitRaw = await db.Signal.sum('profitLoss', { where: { type: productType.type, status: 'PROFIT' } })
      const rawTotalLoss = await db.Signal.sum('profitLoss', { where: { type: productType.type, status: 'LOSS' } })
      const totalProfit = parseFloat(totalProfitRaw || 0)
      const totalLoss = Math.abs(parseFloat(rawTotalLoss || 0))
      const netProfit = totalProfit + parseFloat(rawTotalLoss || 0)

      productStats.push({
        productName,
        totalSignals,
        winLossRatio,
        profitSignals,
        lossSignals,
        inProgressSignals,
        totalProfit,
        totalLoss,
        netProfit
      })
    }

    return productStats
  } catch (error) {
    console.error('Error getting product signal stats:', error)
    throw error
  }
}

const signalsController = {
  async getAllSignals(req, res) {
    try {
      const filters = {}
      if (req.query.status) filters.status = req.query.status
      if (req.query.type) filters.type = req.query.type
      if (req.query.productId) filters.productId = parseInt(req.query.productId)
      if (req.query.date) filters.date = req.query.date
      const signalList = await getSignals(filters)
      res.json({ success: true, data: signalList, count: signalList.length })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },
  async getSignalStats(req, res) {
    try {
      const stats = await getSignalStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },
  async getProductSignalStats(req, res) {
    try {
      const productStats = await getProductSignalStats()
      res.json({ success: true, data: productStats })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },
  async getSignalById(req, res) {
    try {
      const signal = await getSignalById(req.params.id)
      if (!signal) {
        return res.status(404).json({ success: false, error: 'Signal not found' })
      }
      res.json({ success: true, data: signal })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },
  async createSignal(req, res) {
    try {
      const requiredFields = ['productId', 'entry', 'target', 'stopLoss']
      const missingFields = requiredFields.filter(field => !req.body[field])
      if (missingFields.length > 0) {
        return res.status(400).json({ success: false, error: `Missing required fields: ${missingFields.join(', ')}` })
      }
      const newSignal = await createSignal(req.body)
      res.status(201).json({ success: true, data: newSignal, message: 'Signal created successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },
  async updateSignal(req, res) {
    try {
      const updatedSignal = await updateSignal(req.params.id, req.body)
      if (!updatedSignal) {
        return res.status(404).json({ success: false, error: 'Signal not found' })
      }
      res.json({ success: true, data: updatedSignal, message: 'Signal updated successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },
  async deleteSignal(req, res) {
    try {
      const deleted = await deleteSignal(req.params.id)
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Signal not found' })
      }
      res.json({ success: true, message: 'Signal deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },
  async activateSignal(req, res) {
    try {
      const signal = await activateSignal(req.params.id)
      if (!signal) {
        return res.status(404).json({ success: false, error: 'Signal not found' })
      }
      res.json({ success: true, data: signal, message: 'Signal activated successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },
  async closeSignal(req, res) {
    try {
      try { console.log('closeSignal route start', { id: req.params.id, body: req.body }) } catch(e){}
      let { exitPrice, notes } = req.body
      let sig = null
      if (exitPrice === undefined || exitPrice === null || Number.isNaN(Number(exitPrice))) {
        try { sig = await db.Signal.findByPk(req.params.id) } catch(e){}
        if (!sig) {
          return res.status(404).json({ success: false, error: 'Signal not found' })
        }
        const ex = (sig.exchange || 'NSE')
        const sy = (sig.symbol || '')
        if (exitPrice === undefined || exitPrice === null || Number.isNaN(Number(exitPrice))) exitPrice = null
      }
      try { console.log('closeSignal route computed exitPrice', { id: req.params.id, exitPrice }) } catch(e){}
      if (exitPrice === null) {
        try {
          const apiUrl = `https://data.simpleincome.co/api/price?symbol=${encodeURIComponent(sy)}&exchange=${encodeURIComponent(ex)}`
          const response = await axios.get(apiUrl, { timeout: 5000, headers: { 'User-Agent': 'stockagent/1.0', 'Accept': 'application/json' } })
          if (response.data && response.data.success && response.data.data && response.data.data.length > 0 && response.data.data[0].close !== null && response.data.data[0].close !== undefined) {
            exitPrice = Number(response.data.data[0].close)
            if (cache) {
              cache.set(key, { lp: exitPrice, timestamp: Date.now() })
            }
            try { console.log('closeSignal fetched live price', { id: req.params.id, exitPrice }) } catch(e){}
          }
        } catch(e) {
          try { console.log('closeSignal fetch live price failed', e.message) } catch(e){}
        }
      }
      const signal = await closeSignal(req.params.id, exitPrice, notes)
      if (!signal) {
        return res.status(404).json({ success: false, error: 'Signal not found' })
      }
      try { console.log('closeSignal route done', { id: signal.id, status: signal.status, exitPrice: signal.exitPrice, profitLoss: signal.profitLoss }) } catch(e){}
      res.json({ success: true, data: signal, message: `Signal closed as ${signal.status}` })
    } catch (error) {
      try { console.error('closeSignal route error', error && error.stack || error) } catch(e){}
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

module.exports = {
  getSignals,
  getSignalById,
  createSignal,
  updateSignal,
  deleteSignal,
  closeSignal,
  getSignalStats,
  getProductSignalStats,
  signalsController
}
