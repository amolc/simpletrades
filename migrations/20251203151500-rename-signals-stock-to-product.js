'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename the 'stock' column to 'product' in the Signals table
    await queryInterface.renameColumn('Signals', 'stock', 'product');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the change: rename 'product' back to 'stock'
    await queryInterface.renameColumn('Signals', 'product', 'stock');
  }
};