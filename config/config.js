require('dotenv').config();

module.exports = {
  development: {
    username: 'simpletrades',
    password: '10gXWOqeaf!',
    database: 'stockagent_db',
    host: 'quantbots.co',
    dialect: "mysql",
    logging: 'console.log'
  },
  production: {
    username: 'simpletrades',
    password: '10gXWOqeaf!',
    database: 'stockagent_db',
    host: 'quantbots.co',
    dialect: "mysql",
    logging: console.log
  }
};
