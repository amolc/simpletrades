const db = require('../models')

async function run(){
  try{
    await db.sequelize.sync()
    const products = await db.Product.findAll({ order:[['sortOrder','ASC']] })
    for(const p of products){
      const entries = []
      if(Number(p.pricingMonthly)>0){
        entries.push({ name:'Monthly', days:30, cost:p.pricingMonthly })
      }
      if(Number(p.pricingQuarterly)>0){
        entries.push({ name:'Quarterly', days:90, cost:p.pricingQuarterly })
      }
      if(Number(p.pricingYearly)>0){
        entries.push({ name:'Yearly', days:365, cost:p.pricingYearly })
      }
      if(Number(p.pricingTrial)>0){
        entries.push({ name:'Trial', days:7, cost:p.pricingTrial })
      }
      for(const e of entries){
        const planName = `${p.name} ${e.name}`
        const existing = await db.Plan.findOne({ where: { planName } })
        const payload = {
          productId: p.id,
          productName: p.name,
          planName,
          planDescription: `${e.name} subscription for ${p.name}`,
          numberOfDays: e.days,
          cost: e.cost,
          currency: 'INR',
          features: p.keyFeatures || [],
          isActive: true,
          sortOrder: e.name==='Monthly'?1:e.name==='Quarterly'?2:e.name==='Yearly'?3:0,
          trialDays: e.name==='Trial'?7:0,
          renewalType: 'manual'
        }
        if(existing){
          await existing.update(payload)
          console.log(`Updated plan: ${planName}`)
        }else{
          await db.Plan.create(payload)
          console.log(`Created plan: ${planName}`)
        }
      }
    }
    console.log('Plans import complete')
    process.exit(0)
  }catch(e){
    console.error('Plans import error', e)
    process.exit(1)
  }
}

run()
