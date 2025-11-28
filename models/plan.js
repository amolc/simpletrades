'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Plan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Plan.hasMany(models.Subscription, { foreignKey: 'planId' });
      Plan.belongsTo(models.Product, { foreignKey: 'productId' });
    }
  }
  Plan.init({
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Products', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    planName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    planDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    numberOfDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 3650 // Max 10 years
      }
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'INR'
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    trialDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 30
      }
    },
    renewalType: {
      type: DataTypes.ENUM('auto', 'manual'),
      allowNull: false,
      defaultValue: 'manual'
    }
  }, {
    sequelize,
    modelName: 'Plan',
    tableName: 'Plans',
    indexes: [
      {
        fields: ['productName']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['sortOrder']
      }
    ]
  });
  return Plan;
};
