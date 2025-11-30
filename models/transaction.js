'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Transaction.belongsTo(models.User, { foreignKey: 'userId', as: 'customer' });
      Transaction.belongsTo(models.Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
    }
  }
  Transaction.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    },
    subscriptionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Subscriptions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    amount: {
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
    paymentMethod: {
      type: DataTypes.ENUM('credit_card', 'debit_card', 'net_banking', 'upi', 'wallet', 'bank_transfer'),
      allowNull: false
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'partially_refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    transactionType: {
      type: DataTypes.ENUM('subscription_payment', 'refund', 'partial_refund'),
      allowNull: false,
      defaultValue: 'subscription_payment'
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    gatewayResponse: {
      type: DataTypes.JSON,
      allowNull: true
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'Transactions',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['subscriptionId']
      },
      {
        fields: ['paymentStatus']
      },
      {
        fields: ['transactionType']
      },
      {
        fields: ['processedAt']
      }
    ]
  });
  return Transaction;
};