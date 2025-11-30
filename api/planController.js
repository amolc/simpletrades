const db = require('../models');

const planController = {
  getAllPlans: async (req, res) => {
    try {
      const plans = await db.Plan.findAll();
      res.status(200).json({ success: true, data: plans });
    } catch (error) {
      console.error('Error fetching all plans:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  },

  getPlanStats: async (req, res) => {
    try {
      // Placeholder for plan stats logic
      res.status(200).json({ success: true, data: { message: 'Plan stats placeholder' } });
    } catch (error) {
      console.error('Error fetching plan stats:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  },

  getPlanById: async (req, res) => {
    try {
      // Placeholder for get plan by ID logic
      res.status(200).json({ success: true, data: { message: 'Get plan by ID placeholder' } });
    } catch (error) {
      console.error('Error fetching plan by ID:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  },

  createPlan: async (req, res) => {
    try {
      // Placeholder for create plan logic
      res.status(200).json({ success: true, data: { message: 'Create plan placeholder' } });
    } catch (error) {
      console.error('Error creating plan:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  },

  updatePlan: async (req, res) => {
    try {
      // Placeholder for update plan logic
      res.status(200).json({ success: true, data: { message: 'Update plan placeholder' } });
    } catch (error) {
      console.error('Error updating plan:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  },

  deletePlan: async (req, res) => {
    try {
      // Placeholder for delete plan logic
      res.status(200).json({ success: true, data: { message: 'Delete plan placeholder' } });
    } catch (error) {
      console.error('Error deleting plan:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  },

  getPlansByProduct: async (req, res) => {
    try {
      const { productName } = req.params;
      const plans = await db.Plan.findAll({
        include: [{
          model: db.Product,
          as: 'Product',
          where: { name: productName }
        }]
      });
      res.status(200).json({ success: true, data: plans });
    } catch (error) {
      console.error('Error fetching plans by product for productName:', productName, error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  },
  // Add other plan-related functions here if needed
};

module.exports = planController;