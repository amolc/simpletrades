'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Signals', 'entryDateTime', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('Signals', 'exitDateTime', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('Signals', 'duration', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Signals', 'entryDateTime');
    await queryInterface.removeColumn('Signals', 'exitDateTime');
    await queryInterface.removeColumn('Signals', 'duration');
  }
};