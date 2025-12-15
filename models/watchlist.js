'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Watchlist extends Model {
    static associate(models) {}
  }
  Watchlist.init({
    stockName: { type: DataTypes.STRING, allowNull: false },
    product: { type: DataTypes.STRING, allowNull: false },
    exchange: { type: DataTypes.STRING, allowNull: true },
    currentPrice: { type: DataTypes.DECIMAL(12,2), allowNull: true },
    alertPrice: { type: DataTypes.DECIMAL(12,2), allowNull: true },
  }, { sequelize, modelName: 'Watchlist' });
  return Watchlist;
};
