const db = require('../models')
const { Op } = require('sequelize')

const getSignals = async (filters = {}) => {
  const whereClause = {}
  if (filters.status) whereClause.status = filters.status
  if (filters.type) whereClause.signalType = filters.type
  if (filters.stock) whereClause.stock = { [Op.like]: `%${filters.stock}%` }
  if (filters.date) whereClause.date = filters.date
  const signals = await db.Signal.findAll({ where: whereClause, order: [['createdAt', 'DESC']] })
  return signals.map(signal => ({
    id: signal.id,
    stock: signal.stock,
    symbol: signal.symbol,
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
    stock: signal.stock,
    symbol: signal.symbol,
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
  const newSignal = await db.Signal.create({
    stock: signalData.stock,
    symbol: signalData.symbol || signalData.stock,
    signalType: signalData.signalType || 'BUY',
    type: signalData.type,
    entry: signalData.entry,
    target: signalData.target,
    stopLoss: signalData.stopLoss,
    exitPrice: signalData.exitPrice || null,
    profitLoss: signalData.profitLoss || null,
    status: signalData.status || 'PENDING',
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
    stock: newSignal.stock,
    symbol: newSignal.symbol,
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
  if (updateData.stock !== undefined) signal.stock = updateData.stock
  if (updateData.symbol !== undefined) signal.symbol = updateData.symbol
  if (updateData.signalType !== undefined) signal.signalType = updateData.signalType
  if (updateData.type !== undefined) signal.type = updateData.type
  if (updateData.entry !== undefined) signal.entry = updateData.entry
  if (updateData.target !== undefined) signal.target = updateData.target
  if (updateData.stopLoss !== undefined) signal.stopLoss = updateData.stopLoss
  if (updateData.exitPrice !== undefined) signal.exitPrice = updateData.exitPrice
  if (updateData.profitLoss !== undefined) signal.profitLoss = updateData.profitLoss
  if (updateData.status !== undefined) signal.status = updateData.status
  if (updateData.notes !== undefined) signal.notes = updateData.notes
  if (updateData.date !== undefined) signal.date = updateData.date
  if (updateData.time !== undefined) signal.time = updateData.time
  if (updateData.entryDateTime !== undefined) signal.entryDateTime = updateData.entryDateTime
  if (updateData.exitDateTime !== undefined) signal.exitDateTime = updateData.exitDateTime
  if (updateData.status === 'CLOSED' && signal.entryDateTime && !signal.exitDateTime) {
    signal.exitDateTime = new Date()
  }
  if (signal.entryDateTime && signal.exitDateTime) {
    const durationMs = new Date(signal.exitDateTime) - new Date(signal.entryDateTime)
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    signal.duration = `${durationHours}h ${durationMinutes}m`
  }
  await signal.save()
  return {
    id: signal.id,
    stock: signal.stock,
    symbol: signal.symbol,
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

const getSignalStats = async () => {
  const totalSignals = await db.Signal.count()
  const activeSignals = await db.Signal.count({ where: { status: 'ACTIVE' } })
  const closedSignals = await db.Signal.count({ where: { status: 'CLOSED' } })
  const pendingSignals = await db.Signal.count({ where: { status: 'PENDING' } })
  const profitableSignals = await db.Signal.count({ where: { status: 'CLOSED', profitLoss: { [Op.gt]: 0 } } })
  const losingSignals = await db.Signal.count({ where: { status: 'CLOSED', profitLoss: { [Op.lt]: 0 } } })
  const winRate = closedSignals > 0 ? Math.round((profitableSignals / closedSignals) * 100) : 0
  const profitResult = await db.Signal.findOne({ attributes: [[db.sequelize.fn('SUM', db.sequelize.col('profitLoss')), 'totalProfit']], where: { status: 'CLOSED', profitLoss: { [Op.gt]: 0 } } })
  const lossResult = await db.Signal.findOne({ attributes: [[db.sequelize.fn('SUM', db.sequelize.literal('ABS("profitLoss")')), 'totalLoss']], where: { status: 'CLOSED', profitLoss: { [Op.lt]: 0 } } })
  const totalProfit = profitResult?.dataValues?.totalProfit || 0
  const totalLoss = lossResult?.dataValues?.totalLoss || 0
  const netProfit = totalProfit - totalLoss
  return { totalSignals, activeSignals, closedSignals, pendingSignals, profitableSignals, losingSignals, winRate, totalProfit: parseFloat(totalProfit), totalLoss: parseFloat(totalLoss), netProfit: parseFloat(netProfit) }
}

const signalsController = {
  async getAllSignals(req, res) {
    try {
      const filters = {}
      if (req.query.status) filters.status = req.query.status
      if (req.query.type) filters.type = req.query.type
      if (req.query.stock) filters.stock = req.query.stock
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
      const requiredFields = ['stock', 'entry', 'target', 'stopLoss', 'type']
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
  }
}

module.exports = {
  getSignals,
  getSignalById,
  createSignal,
  updateSignal,
  deleteSignal,
  getSignalStats,
  signalsController
}
