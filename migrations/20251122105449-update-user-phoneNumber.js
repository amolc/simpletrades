'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if phoneNumber column exists, if not add it
    const tableDescription = await queryInterface.describeTable('Users');
    if (!tableDescription.phoneNumber) {
      await queryInterface.addColumn('Users', 'phoneNumber', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      });
    }
    
    // Check if username column exists, if so remove it
    if (tableDescription.username) {
      await queryInterface.removeColumn('Users', 'username');
    }
  },

  async down (queryInterface, Sequelize) {
    // Revert changes if needed
    const tableDescription = await queryInterface.describeTable('Users');
    if (tableDescription.phoneNumber) {
      await queryInterface.removeColumn('Users', 'phoneNumber');
    }
    if (!tableDescription.username) {
      await queryInterface.addColumn('Users', 'username', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      });
    }
  }
};
