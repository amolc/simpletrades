// ES6 模块版本
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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

// ES6 模块导出
export { Client, BuiltInIndicator, PineIndicator, PinePermManager, ConnectionPool };
export default TradingView;

// 一次性导出 miscRequests 中的所有函数
export const {
  getTA,
  searchMarket,
  scanSymbol,
  searchIndicator,
  getIndicator,
  loginUser,
  getUser,
  getPrivateIndicators,
  getChartToken,
  getDrawings
} = miscRequests;
