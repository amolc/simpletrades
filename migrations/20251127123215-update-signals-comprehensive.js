'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add all the necessary columns for comprehensive signal tracking
    await queryInterface.addColumn('Signals', 'symbol', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('Signals', 'signalType', {
      type: Sequelize.ENUM('BUY', 'SELL'),
      allowNull: false,
      defaultValue: 'BUY'
    });
    
    await queryInterface.addColumn('Signals', 'type', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('Signals', 'entry', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });
    
    await queryInterface.addColumn('Signals', 'target', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });
    
    // Update existing stopLoss column to have proper constraints
    await queryInterface.changeColumn('Signals', 'stopLoss', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
    
    await queryInterface.addColumn('Signals', 'exitPrice', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
    
    await queryInterface.addColumn('Signals', 'profitLoss', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
    
    await queryInterface.addColumn('Signals', 'status', {
      type: Sequelize.ENUM('PENDING', 'ACTIVE', 'CLOSED'),
      allowNull: false,
      defaultValue: 'PENDING'
    });
    
    await queryInterface.addColumn('Signals', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('Signals', 'date', {
      type: Sequelize.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.NOW
    });
    
    await queryInterface.addColumn('Signals', 'time', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Rename existing columns to match our schema
    await queryInterface.renameColumn('Signals', 'entryPrice', 'entryPrice_old');
    await queryInterface.renameColumn('Signals', 'targetPrice', 'targetPrice_old');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns in reverse order
    await queryInterface.removeColumn('Signals', 'time');
    await queryInterface.removeColumn('Signals', 'date');
    await queryInterface.removeColumn('Signals', 'notes');
    await queryInterface.removeColumn('Signals', 'status');
    await queryInterface.removeColumn('Signals', 'profitLoss');
    await queryInterface.removeColumn('Signals', 'exitPrice');
    
    // Revert stopLoss column changes
    await queryInterface.changeColumn('Signals', 'stopLoss', {
      type: Sequelize.DECIMAL,
      allowNull: true
    });
    
    await queryInterface.removeColumn('Signals', 'target');
    await queryInterface.removeColumn('Signals', 'entry');
    await queryInterface.removeColumn('Signals', 'type');
    await queryInterface.removeColumn('Signals', 'signalType');
    await queryInterface.removeColumn('Signals', 'symbol');
    
    // Rename columns back
    await queryInterface.renameColumn('Signals', 'entryPrice_old', 'entryPrice');
    await queryInterface.renameColumn('Signals', 'targetPrice_old', 'targetPrice');
    
    // Remove the enum types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Signals_signalType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Signals_status";');
  }
};