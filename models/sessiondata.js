'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SessionData extends Model {
    static associate(models) {}
  }
  SessionData.init({
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    provider: { type: DataTypes.STRING, allowNull: false }, // e.g., 'tradex', 'tradingview'
    account: { type: DataTypes.STRING, allowNull: false },  // username/phone/email
    companyName: { type: DataTypes.STRING, allowNull: true }, // for Tradex 2/3
    userId: { type: DataTypes.STRING, allowNull: true },
    token: { type: DataTypes.TEXT, allowNull: true }, // generic token
    accessToken: { type: DataTypes.TEXT, allowNull: true }, // bearer token
    signature: { type: DataTypes.TEXT, allowNull: true }, // tradingview signature
    refreshToken: { type: DataTypes.TEXT, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('active','expired','revoked'), allowNull: false, defaultValue: 'active' },
    lastUsedAt: { type: DataTypes.DATE, allowNull: true },
    meta: { type: DataTypes.JSON, allowNull: true, defaultValue: {} }
  }, {
    sequelize,
    modelName: 'SessionData',
    tableName: 'SessionData',
    indexes: [
      { unique: true, fields: ['provider','account'] },
      { fields: ['provider'] },
      { fields: ['status'] }
    ]
  });
  return SessionData;
};
