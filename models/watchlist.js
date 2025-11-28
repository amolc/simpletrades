'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Watchlist extends Model {
    static associate(models) {}
  }
  Watchlist.init({
    stockName: { type: DataTypes.STRING, allowNull: false },
    market: { type: DataTypes.STRING, allowNull: false },
    currentPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
    alertPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
    productName: { type: DataTypes.STRING, allowNull: true }
  }, { sequelize, modelName: 'Watchlist' });
  return Watchlist;
};
