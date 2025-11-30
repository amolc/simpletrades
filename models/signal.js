'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Signal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Signal.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  Signal.init({
    stock: {
      type: DataTypes.STRING,
      allowNull: false
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: true
    },
    signalType: {
      type: DataTypes.ENUM('BUY', 'SELL'),
      allowNull: false,
      defaultValue: 'BUY'
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entry: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    target: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    stopLoss: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    exitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    profitLoss: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('IN_PROGRESS', 'PROFIT', 'LOSS'),
      allowNull: false,
      defaultValue: 'IN_PROGRESS'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    time: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entryDateTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    exitDateTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Signal',
  });
  return Signal;
};