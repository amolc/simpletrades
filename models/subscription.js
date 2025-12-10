'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Subscription.belongsTo(models.User, { foreignKey: 'userId' });
      Subscription.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
      Subscription.hasMany(models.Transaction, { foreignKey: 'subscriptionId', as: 'transactions' });
    }
  }
  Subscription.init({
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    userId: DataTypes.INTEGER,
    planId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Plans', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    amount: DataTypes.DECIMAL(10, 2),
    referenceNumber: DataTypes.STRING,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    status: {
      type: DataTypes.ENUM('active', 'pending', 'expired', 'cancelled'),
      defaultValue: 'active'
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Subscription',
  });
  return Subscription;
};
