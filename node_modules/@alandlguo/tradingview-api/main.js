const miscRequests = require('./src/miscRequests');
const Client = require('./src/client');
const BuiltInIndicator = require('./src/classes/BuiltInIndicator');
const PineIndicator = require('./src/classes/PineIndicator');
const PinePermManager = require('./src/classes/PinePermManager');
const ConnectionPool = require('./src/connectionPool');

const TradingView = {
  ...miscRequests,
  Client,
  BuiltInIndicator,
  PineIndicator,
  PinePermManager,
  ConnectionPool
};

// CommonJS 导出 (主要导出方式)
module.exports = TradingView;

// 同时导出各个组件以支持解构
module.exports.Client = Client;
module.exports.BuiltInIndicator = BuiltInIndicator;
module.exports.PineIndicator = PineIndicator;
module.exports.PinePermManager = PinePermManager;
module.exports.ConnectionPool = ConnectionPool;

// 导出所有 miscRequests 函数
module.exports.getTA = miscRequests.getTA;
module.exports.searchMarket = miscRequests.searchMarket;
module.exports.scanSymbol = miscRequests.scanSymbol;
module.exports.searchIndicator = miscRequests.searchIndicator;
module.exports.getIndicator = miscRequests.getIndicator;
module.exports.loginUser = miscRequests.loginUser;
module.exports.getUser = miscRequests.getUser;
module.exports.getPrivateIndicators = miscRequests.getPrivateIndicators;
module.exports.getChartToken = miscRequests.getChartToken;
module.exports.getDrawings = miscRequests.getDrawings;
