const fs = require('fs')
const path = require('path')
const db = require('../models')

async function run(){
  try{
    const file = path.join(__dirname,'..','admin','products.json')
    const json = JSON.parse(fs.readFileSync(file,'utf8'))
    await db.Product.sync()
    for(const p of json){
      const payload = {
        name: p.name,
        description: p.description,
        category: p.category,
        status: p.status||'active',
        sortOrder: p.sortOrder||0,
        targetAudience: p.targetAudience||'',
        keyFeatures: p.keyFeatures||[],
        pricingTrial: p.pricing?.trial||0,
        pricingMonthly: p.pricing?.monthly||0,
        pricingQuarterly: p.pricing?.quarterly||0,
        pricingYearly: p.pricing?.yearly||0
      }
      const existing = await db.Product.findOne({ where: { name: p.name } })
      if(existing){
        await existing.update(payload)
        console.log(`Updated product: ${p.name}`)
      }else{
        await db.Product.create(payload)
        console.log(`Created product: ${p.name}`)
      }
    }
    console.log('Import complete')
    process.exit(0)
  }catch(e){
    console.error('Import error', e)
    process.exit(1)
  }
}

run()
