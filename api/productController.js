const db = require('../models')

async function getAllProducts() {
  console.log('getAllProducts: Starting to fetch products from database...')
  const rows = await db.Product.findAll({ 
    include: [{ model: db.Plan, as: 'plans' }],
    order: [['sortOrder','ASC'], ['name','ASC']] 
  })
  console.log(`getAllProducts: Found ${rows.length} products in database`)
  const products = rows.map(row => toDto(row))
  console.log(`getAllProducts: Returning ${products.length} products after DTO conversion`)
  return products
}

async function getProducts(options = {}) {
  try {
    const products = await getAllProducts()
    let filteredProducts = [...products]

    if (options.status) {
      filteredProducts = filteredProducts.filter(product => product.status === options.status)
    }

    if (options.category) {
      filteredProducts = filteredProducts.filter(product => product.category === options.category)
    }

    if (options.sortByOrder) {
      filteredProducts.sort((a, b) => a.sortOrder - b.sortOrder)
    }

    if (options.limit && options.limit > 0) {
      filteredProducts = filteredProducts.slice(0, options.limit)
    }

    return filteredProducts
  } catch (error) {
    throw error
  }
}

async function getProductByName(name) {
  const row = await db.Product.findOne({ where: { name } })
  return row ? toDto(row) : null
}

async function createProduct(productData) {
  const requiredFields = ['name', 'description', 'category']
  for (const field of requiredFields) {
    if (!productData[field]) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
  const existing = await db.Product.findOne({ where: { name: productData.name } })
  if (existing) throw new Error('Product with this name already exists')
  
  // Create the product first
  const row = await db.Product.create(fromDto(productData))
  
  // Create plans if provided
  if (productData.plans && productData.plans.length > 0) {
    const plansData = productData.plans.map(plan => ({
      productId: row.id,
      planName: plan.planName,
      planDescription: plan.planDescription || '',
      numberOfDays: plan.numberOfDays,
      cost: plan.cost,
      isActive: plan.isActive !== false, // Default to true
      currency: plan.currency || 'INR'
    }))
    
    await db.Plan.bulkCreate(plansData)
  }
  
  // Return the product with plans
  const productWithPlans = await db.Product.findOne({ 
    where: { id: row.id },
    include: [{ model: db.Plan, as: 'plans' }]
  })
  
  return toDto(productWithPlans)
}

async function updateProduct(name, updateData) {
  const row = await db.Product.findOne({ where: { name } })
  if (!row) throw new Error('Product not found')
  const payload = fromDto({ ...toDto(row), ...updateData, name })
  Object.keys(payload).forEach(k => { row[k] = payload[k] })
  await row.save()
  return toDto(row)
}

async function deleteProduct(name) {
  const count = await db.Product.destroy({ where: { name } })
  if (!count) throw new Error('Product not found')
  return { message: 'Product deleted successfully' }
}

function toDto(row){
  return {
    name: row.name,
    description: row.description,
    category: row.category,
    status: row.status,
    sortOrder: row.sortOrder,
    targetAudience: row.targetAudience,
    keyFeatures: typeof row.keyFeatures === 'string' ? JSON.parse(row.keyFeatures) : (row.keyFeatures || []),
    pricing: {
      trial: Number(row.pricingTrial||0),
      monthly: Number(row.pricingMonthly||0),
      quarterly: Number(row.pricingQuarterly||0),
      yearly: Number(row.pricingYearly||0)
    },
    plans: row.plans ? row.plans.map(p => ({
      id: p.id,
      name: p.planName,
      description: p.planDescription,
      cost: p.cost,
      days: p.numberOfDays,
      isActive: p.isActive
    })) : []
  }
}

function fromDto(dto){
  return {
    name: dto.name,
    description: dto.description,
    category: dto.category,
    status: dto.status || 'active',
    sortOrder: dto.sortOrder || 0,
    targetAudience: dto.targetAudience || '',
    keyFeatures: dto.keyFeatures || [],
    pricingTrial: dto.pricing?.trial ?? dto.trial ?? 0,
    pricingMonthly: dto.pricing?.monthly ?? dto.monthly ?? 0,
    pricingQuarterly: dto.pricing?.quarterly ?? dto.quarterly ?? 0,
    pricingYearly: dto.pricing?.yearly ?? dto.yearly ?? 0
  }
}

const productController = {
  async getAllProducts(req, res) {
    try {
      const options = {
        status: req.query?.status,
        category: req.query?.category,
        limit: req.query?.limit ? parseInt(req.query.limit) : undefined,
        sortByOrder: req.query?.sortByOrder === 'true'
      }

      const products = await getProducts(options)
      res.json({ success: true, count: products.length, data: products })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },

  async getProductByName(req, res) {
    try {
      const product = await getProductByName(req.params.name)
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' })
      }
      res.json({ success: true, data: product })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  },

  async createProduct(req, res) {
    try {
      const newProduct = await createProduct(req.body)
      res.status(201).json({ success: true, data: newProduct })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  },

  async updateProduct(req, res) {
    try {
      const updatedProduct = await updateProduct(req.params.name, req.body)
      res.json({ success: true, data: updatedProduct })
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ success: false, error: error.message })
      }
      res.status(400).json({ success: false, error: error.message })
    }
  },

  async deleteProduct(req, res) {
    try {
      const result = await deleteProduct(req.params.name)
      res.json({ success: true, message: result.message })
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ success: false, error: error.message })
      }
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

module.exports = {
  getAllProducts,
  getProducts,
  getProductByName,
  createProduct,
  updateProduct,
  deleteProduct,
  productController
}
