'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Subscriptions', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'paymentStatus'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Subscriptions', 'notes');
  }
};