const db = require('../models')

async function ensureTable(){
  await db.Watchlist.sync({ alter: true })
}

const watchlistController = {
  async getAll(req,res){
    try{
      await ensureTable()
      const where={}
      if(req.query.productName) where.productName = req.query.productName
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
      const required = ['stockName','market','currentPrice','alertPrice']
      const missing = required.filter(f=> req.body[f]===undefined || req.body[f]==='')
      if(missing.length){
        return res.status(400).json({ success:false, error:`Missing required fields: ${missing.join(', ')}` })
      }
      const item = await db.Watchlist.create({
        stockName: req.body.stockName,
        market: req.body.market,
        currentPrice: req.body.currentPrice,
        alertPrice: req.body.alertPrice,
        productName: req.body.productName || null
      })
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
      const fields = ['stockName','market','currentPrice','alertPrice','productName']
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
