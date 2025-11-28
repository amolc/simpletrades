'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Setting extends Model {
    static associate(models) {
      // no associations for now
    }
  }
  Setting.init({
    websiteName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    websiteUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isUrl: true }
    },
    paymentUpiName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    analystName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    telegramApiUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isUrl: true }
    },
    whatsappApiUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isUrl: true }
    },
    supportEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isEmail: true }
    },
    supportPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentUpiHandle: {
      type: DataTypes.STRING,
      allowNull: true
    },
    privacyPolicyUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isUrl: true }
    },
    termsUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isUrl: true }
    },
    maintenanceMode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Setting',
  });
  return Setting;
};
