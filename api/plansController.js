const { Op } = require('sequelize');

// Get database instance
const db = require('../models');

/**
 * Plans management controller
 */
const plansController = {
  /**
   * Get all plans with optional filtering
   * GET /api/plans
   */
  async getAllPlans(req, res) {
    try {
      const { 
        productName, 
        productId,
        isActive, 
        costMin, 
        costMax, 
        numberOfDays,
        sortBy = 'sortOrder',
        sortOrder = 'ASC'
      } = req.query;

      const whereClause = {};
      
      // Apply filters
      if (productId) whereClause.productId = parseInt(productId);
      else if (productName) whereClause.productName = productName;
      if (isActive !== undefined) whereClause.isActive = isActive === 'true';
      if (numberOfDays) whereClause.numberOfDays = parseInt(numberOfDays);
      
      // Cost range filter
      if (costMin || costMax) {
        whereClause.cost = {};
        if (costMin) whereClause.cost[Op.gte] = parseFloat(costMin);
        if (costMax) whereClause.cost[Op.lte] = parseFloat(costMax);
      }

      const plans = await db.Plan.findAll({
        where: whereClause,
        order: [[sortBy, sortOrder]]
      });

      res.json({
        success: true,
        data: plans,
        count: plans.length
      });
    } catch (error) {
      console.error('Get all plans error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching plans'
      });
    }
  },

  /**
   * Get single plan by ID
   * GET /api/plans/:id
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;

      const plan = await db.Plan.findByPk(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Get plan by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching plan'
      });
    }
  },

  /**
   * Create new plan
   * POST /api/plans
   */
  async createPlan(req, res) {
    try {
      const {
        productName,
        productId,
        planName,
        planDescription,
        numberOfDays,
        cost,
        currency = 'INR',
        features = [],
        isActive = true,
        sortOrder = 0,
        trialDays = 0,
        renewalType = 'manual'
      } = req.body;

      // Validation
      const requiredFields = ['planName', 'numberOfDays', 'cost'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Validate numberOfDays
      if (numberOfDays < 1 || numberOfDays > 3650) {
        return res.status(400).json({
          success: false,
          error: 'Number of days must be between 1 and 3650'
        });
      }

      // Validate trialDays
      if (trialDays < 0 || trialDays > 30) {
        return res.status(400).json({
          success: false,
          error: 'Trial days must be between 0 and 30'
        });
      }

      // Validate renewalType
      if (!['auto', 'manual'].includes(renewalType)) {
        return res.status(400).json({
          success: false,
          error: 'Renewal type must be either "auto" or "manual"'
        });
      }

      

      // Resolve product reference
      let resolvedProductId = productId
      let resolvedProductName = productName
      if (!resolvedProductId && resolvedProductName){
        const prod = await db.Product.findOne({ where: { name: resolvedProductName } })
        resolvedProductId = prod ? prod.id : null
      }
      if (!resolvedProductName && resolvedProductId){
        const prod = await db.Product.findByPk(resolvedProductId)
        resolvedProductName = prod ? prod.name : null
      }

      // Create plan
      const newPlan = await db.Plan.create({
        productId: resolvedProductId,
        productName: resolvedProductName,
        planName,
        planDescription,
        numberOfDays: parseInt(numberOfDays),
        cost: parseFloat(cost),
        currency,
        features: Array.isArray(features) ? features : [],
        isActive,
        sortOrder: parseInt(sortOrder),
        trialDays: parseInt(trialDays),
        renewalType
      });

      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        data: newPlan
      });
    } catch (error) {
      console.error('Create plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while creating plan'
      });
    }
  },

  /**
   * Update plan
   * PUT /api/plans/:id
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const {
        productName,
        productId,
        planName,
        planDescription,
        numberOfDays,
        cost,
        currency,
        features,
        isActive,
        sortOrder,
        trialDays,
        renewalType
      } = req.body;

      // Find plan
      const plan = await db.Plan.findByPk(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      

      // Validate numberOfDays if provided
      if (numberOfDays && (numberOfDays < 1 || numberOfDays > 3650)) {
        return res.status(400).json({
          success: false,
          error: 'Number of days must be between 1 and 3650'
        });
      }

      // Validate trialDays if provided
      if (trialDays && (trialDays < 0 || trialDays > 30)) {
        return res.status(400).json({
          success: false,
          error: 'Trial days must be between 0 and 30'
        });
      }

      // Validate renewalType if provided
      if (renewalType && !['auto', 'manual'].includes(renewalType)) {
        return res.status(400).json({
          success: false,
          error: 'Renewal type must be either "auto" or "manual"'
        });
      }

      // Update plan data
      if (productId !== undefined) plan.productId = parseInt(productId);
      if (productName !== undefined) plan.productName = productName;
      if (planName !== undefined) plan.planName = planName;
      if (planDescription !== undefined) plan.planDescription = planDescription;
      if (numberOfDays !== undefined) plan.numberOfDays = parseInt(numberOfDays);
      if (cost !== undefined) plan.cost = parseFloat(cost);
      if (currency !== undefined) plan.currency = currency;
      if (features !== undefined) plan.features = Array.isArray(features) ? features : plan.features;
      if (isActive !== undefined) plan.isActive = isActive;
      if (sortOrder !== undefined) plan.sortOrder = parseInt(sortOrder);
      if (trialDays !== undefined) plan.trialDays = parseInt(trialDays);
      if (renewalType !== undefined) plan.renewalType = renewalType;

      await plan.save();

      res.json({
        success: true,
        message: 'Plan updated successfully',
        data: plan
      });
    } catch (error) {
      console.error('Update plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while updating plan'
      });
    }
  },

  /**
   * Delete plan
   * DELETE /api/plans/:id
   */
  async deletePlan(req, res) {
    try {
      const { id } = req.params;

      const plan = await db.Plan.findByPk(id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // Check if plan has any active subscriptions
      const subscriptionCount = await db.Subscription.count({
        where: { planId: id }
      });

      if (subscriptionCount > 0) {
        return res.status(409).json({
          success: false,
          error: 'Cannot delete plan with active subscriptions'
        });
      }

      await plan.destroy();

      res.json({
        success: true,
        message: 'Plan deleted successfully'
      });
    } catch (error) {
      console.error('Delete plan error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while deleting plan'
      });
    }
  },

  /**
   * Get plans by product name
   * GET /api/plans/product/:productName
   */
  async getPlansByProduct(req, res) {
    try {
      const { productName } = req.params;
      const { isActive = 'true' } = req.query;

      // Map productName to productId for stronger filtering
      const prod = await db.Product.findOne({ where: { name: productName } })
      const whereClause = prod ? { productId: prod.id } : { productName };
      if (isActive !== undefined) whereClause.isActive = isActive === 'true';

      const plans = await db.Plan.findAll({
        where: whereClause,
        order: [['sortOrder', 'ASC'], ['cost', 'ASC']]
      });

      res.json({
        success: true,
        data: plans,
        count: plans.length
      });
    } catch (error) {
      console.error('Get plans by product error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching plans by product'
      });
    }
  },

  /**
   * Get plan statistics
   * GET /api/plans/stats
   */
  async getPlanStats(req, res) {
    try {
      const totalPlans = await db.Plan.count();
      const activePlans = await db.Plan.count({ where: { isActive: true } });
      const inactivePlans = await db.Plan.count({ where: { isActive: false } });

      // Get plans by product
      const plansByProduct = await db.Plan.findAll({
        attributes: [
          'productName',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        group: ['productName'],
        order: [[db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'DESC']]
      });

      // Get average cost by product
      const avgCostByProduct = await db.Plan.findAll({
        attributes: [
          'productName',
          [db.Sequelize.fn('AVG', db.Sequelize.col('cost')), 'avgCost']
        ],
        group: ['productName'],
        where: { isActive: true }
      });

      res.json({
        success: true,
        data: {
          totalPlans,
          activePlans,
          inactivePlans,
          plansByProduct,
          avgCostByProduct
        }
      });
    } catch (error) {
      console.error('Get plan stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching plan statistics'
      });
    }
  }
};

module.exports = {
  plansController
};
