'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // For MySQL, we need to modify the existing enum to include 'pending'
    await queryInterface.changeColumn('Subscriptions', 'status', {
      type: Sequelize.ENUM('active', 'pending', 'expired', 'cancelled'),
      defaultValue: 'active',
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert back to the original enum (this might fail if there are 'pending' values)
    await queryInterface.changeColumn('Subscriptions', 'status', {
      type: Sequelize.ENUM('active', 'expired', 'cancelled'),
      defaultValue: 'active',
      allowNull: false
    });
  }
};