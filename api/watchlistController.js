const db = require('../models')

const watchlistController = {
  async getAll(req,res){
    try{
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
      const item = await db.Watchlist.findByPk(req.params.id)
      if(!item) return res.status(404).json({ success:false, error:'Watchlist item not found' })
      res.json({ success:true, data:item })
    }catch(err){
      res.status(500).json({ success:false, error:err.message })
    }
  },
  async create(req,res){
    try{
      const missing = []
      if (req.body.stockName===undefined || req.body.stockName==='') missing.push('stockName')
      if (req.body.product===undefined || req.body.product==='') missing.push('product')
      if(missing.length){
        return res.status(400).json({ success:false, error:`Missing required fields: ${missing.join(', ')}` })
      }
      const payload = {
        stockName: (typeof req.body.stockName === 'string' ? req.body.stockName.trim() : req.body.stockName),
        product: (typeof req.body.product === 'string' ? req.body.product.trim() : req.body.product),
        exchange: (typeof req.body.exchange === 'string' ? req.body.exchange.trim() : req.body.exchange) || null
      }
      if (req.body.currentPrice !== undefined) {
        payload.currentPrice = req.body.currentPrice;
        console.log(`Creating watchlist with currentPrice: ${req.body.currentPrice}`);
      }
      if (req.body.alertPrice !== undefined) {
        payload.alertPrice = req.body.alertPrice;
        console.log(`Creating watchlist with alertPrice: ${req.body.alertPrice}`);
      }
      const item = await db.Watchlist.create(payload)
      console.log(`Watchlist created successfully: ${item.id} with currentPrice: ${item.currentPrice}, alertPrice: ${item.alertPrice}`);
      res.status(201).json({ success:true, data:item })
    }catch(err){
      console.error('Watchlist creation error:', err);
      res.status(500).json({ success:false, error:err.message })
    }
  },
  async update(req,res){
    try{
      const item = await db.Watchlist.findByPk(req.params.id)
      if(!item) return res.status(404).json({ success:false, error:'Watchlist item not found' })
      const fields = ['stockName','product','exchange','currentPrice','alertPrice']
      fields.forEach(f=>{ 
        if(req.body[f]!==undefined) {
          const oldValue = item[f];
          if (f === 'stockName' || f === 'product' || f === 'exchange') {
            item[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
          } else {
            item[f] = req.body[f];
          }
          if (f === 'currentPrice' || f === 'alertPrice') {
            console.log(`Updating ${f} for watchlist ${item.id}: ${oldValue} -> ${item[f]}`);
          }
        }
      })
      await item.save()
      console.log(`Watchlist updated successfully: ${item.id} with currentPrice: ${item.currentPrice}, alertPrice: ${item.alertPrice}`);
      res.json({ success:true, data:item })
    }catch(err){
      console.error('Watchlist update error:', err);
      res.status(500).json({ success:false, error:err.message })
    }
  },
  async remove(req,res){
    try{
      const count = await db.Watchlist.destroy({ where:{ id:req.params.id } })
      if(!count) return res.status(404).json({ success:false, error:'Watchlist item not found' })
      res.json({ success:true, message:'Deleted' })
    }catch(err){
      res.status(500).json({ success:false, error:err.message })
    }
  }
}

// Ensure table exists on startup (async)
db.Watchlist.sync({ alter: true }).catch(err => {
  console.error('Watchlist sync error:', err);
  // If sync fails, try without alter to at least ensure table exists
  db.Watchlist.sync().catch(err2 => console.error('Watchlist basic sync also failed:', err2));
});


module.exports = { watchlistController }
