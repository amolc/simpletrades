const db = require('../models')

async function ensureTable(){
  await db.Watchlist.sync({ alter: true })
}

const watchlistController = {
  async getAll(req,res){
    try{
      await ensureTable()
      const where={}
      if(req.query.product) where.product = req.query.product
      const list = await db.Watchlist.findAll({ where, order:[['updatedAt','DESC']] })
      // Convert decimal fields to numbers for proper JSON serialization
      const processedList = list.map(item => {
        const itemData = item.get({ plain: true })
        itemData.currentPrice = parseFloat(itemData.currentPrice)
        itemData.alertPrice = parseFloat(itemData.alertPrice)
        return itemData
      })
      res.json({ success:true, data:processedList, count:processedList.length })
    }catch(err){
      res.status(500).json({ success:false, error:err.message })
    }
  },
  async getById(req,res){
    try{
      await ensureTable()
      const item = await db.Watchlist.findByPk(req.params.id)
      if(!item) return res.status(404).json({ success:false, error:'Watchlist item not found' })
      res.json({ success:true, data:item })
    }catch(err){
      res.status(500).json({ success:false, error:err.message })
    }
  },
  async create(req,res){
    try{
      await ensureTable()
      const missing = []
      if (req.body.stockName===undefined || req.body.stockName==='') missing.push('stockName')
      if (req.body.product===undefined || req.body.product==='') missing.push('product')
      if(missing.length){
        return res.status(400).json({ success:false, error:`Missing required fields: ${missing.join(', ')}` })
      }
      const payload = {
        stockName: req.body.stockName,
        product: req.body.product,
        exchange: req.body.exchange || null
      }
      if (req.body.currentPrice !== undefined) payload.currentPrice = req.body.currentPrice
      if (req.body.alertPrice !== undefined) payload.alertPrice = req.body.alertPrice
      const item = await db.Watchlist.create(payload)
      res.status(201).json({ success:true, data:item })
    }catch(err){
      res.status(500).json({ success:false, error:err.message })
    }
  },
  async update(req,res){
    try{
      await ensureTable()
      const item = await db.Watchlist.findByPk(req.params.id)
      if(!item) return res.status(404).json({ success:false, error:'Watchlist item not found' })
      const fields = ['stockName','product','exchange','currentPrice','alertPrice']
      fields.forEach(f=>{ if(req.body[f]!==undefined) item[f]=req.body[f] })
      await item.save()
      res.json({ success:true, data:item })
    }catch(err){
      res.status(500).json({ success:false, error:err.message })
    }
  },
  async remove(req,res){
    try{
      await ensureTable()
      const count = await db.Watchlist.destroy({ where:{ id:req.params.id } })
      if(!count) return res.status(404).json({ success:false, error:'Watchlist item not found' })
      res.json({ success:true, message:'Deleted' })
    }catch(err){
      res.status(500).json({ success:false, error:err.message })
    }
  }
}

module.exports = { watchlistController }
