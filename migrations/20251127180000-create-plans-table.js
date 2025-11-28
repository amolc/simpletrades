'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Plans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      productName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      planName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      planDescription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      numberOfDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 3650
        }
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'INR'
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      trialDays: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 30
        }
      },
      renewalType: {
        type: Sequelize.ENUM('auto', 'manual'),
        allowNull: false,
        defaultValue: 'manual'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('Plans', ['productName']);
    await queryInterface.addIndex('Plans', ['isActive']);
    await queryInterface.addIndex('Plans', ['sortOrder']);
    await queryInterface.addIndex('Plans', ['planName']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Plans');
  }
};