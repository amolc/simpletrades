'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {}
  }
  Product.init({
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('active','inactive','archived'), allowNull: false, defaultValue: 'active' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    targetAudience: { type: DataTypes.STRING, allowNull: true },
    keyFeatures: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    pricingTrial: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
    pricingMonthly: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
    pricingQuarterly: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
    pricingYearly: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'Products'
  });
  return Product;
};
