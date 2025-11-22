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
    stock: DataTypes.STRING,
    entryPrice: DataTypes.DECIMAL,
    targetPrice: DataTypes.DECIMAL,
    stopLoss: DataTypes.DECIMAL,
    userId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Signal',
  });
  return Signal;
};