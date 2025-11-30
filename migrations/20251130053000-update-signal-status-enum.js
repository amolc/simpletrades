'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, update existing signals to use valid new statuses
    await queryInterface.sequelize.query(`
      UPDATE Signals 
      SET status = CASE 
        WHEN status IN ('PENDING', 'ACTIVE') THEN 'IN_PROGRESS'
        WHEN status IN ('CLOSED', 'EXPIRED') THEN 'LOSS'
        WHEN status IN ('PROFIT', 'LOSS') THEN status
        ELSE 'IN_PROGRESS'
      END
    `);
    
    // Then, modify the ENUM to only have the 3 statuses
    await queryInterface.changeColumn('Signals', 'status', {
      type: Sequelize.ENUM('IN_PROGRESS', 'PROFIT', 'LOSS'),
      allowNull: false,
      defaultValue: 'IN_PROGRESS'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to the original ENUM
    await queryInterface.changeColumn('Signals', 'status', {
      type: Sequelize.ENUM('PENDING', 'ACTIVE', 'CLOSED', 'EXPIRED', 'PROFIT', 'LOSS'),
      allowNull: false,
      defaultValue: 'PENDING'
    });
  }
};