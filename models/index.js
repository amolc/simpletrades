'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

// Load configuration from main config.js file
const mainConfig = require(__dirname + '/../config');
const config = {
  username: process.env.DB_USER || mainConfig.database.username,
  password: process.env.DB_PASSWORD || mainConfig.database.password,
  database: process.env.DB_NAME || mainConfig.database.database,
  host: process.env.DB_HOST || mainConfig.database.host,
  port: process.env.DB_PORT || mainConfig.database.port || 3306,
  dialect: mainConfig.database.dialect || 'mysql',
  logging: mainConfig.database.logging || false
};

const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
