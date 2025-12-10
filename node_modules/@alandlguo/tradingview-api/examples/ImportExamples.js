/**
 * 这个示例展示了如何使用不同的导入方式来使用 @alandlguo/tradingview-api
 */

// ===== ES6 模块导入方式 =====

// 1. 导入特定的类
import { Client, BuiltInIndicator, PineIndicator } from '@alandlguo/tradingview-api';

// 2. 导入特定的函数
import { searchMarket, searchIndicator, getIndicator } from '@alandlguo/tradingview-api';

// 3. 导入默认导出 (整个 TradingView 对象)
import TradingView from '@alandlguo/tradingview-api';

// 4. 混合导入
import TradingViewAPI, { Client as TVClient, searchMarket as search } from '@alandlguo/tradingview-api';

// ===== CommonJS 导入方式 (向后兼容) =====

// 5. 传统的 require 方式
const TradingViewCJS = require('@alandlguo/tradingview-api');
const { Client: ClientCJS } = require('@alandlguo/tradingview-api');

// ===== 使用示例 =====

console.log('=== ES6 导入方式使用示例 ===');

// 使用导入的 Client 类
const client1 = new Client();
console.log('Client 实例创建成功:', !!client1);

// 使用导入的搜索函数
searchMarket('BINANCE:').then(markets => {
  console.log('搜索到的市场数量:', markets.length);
}).catch(err => {
  console.error('搜索失败:', err.message);
});

// 使用默认导出
const client2 = new TradingView.Client();
console.log('通过默认导出创建 Client:', !!client2);

// 使用重命名的导入
const client3 = new TVClient();
console.log('通过重命名导入创建 Client:', !!client3);

console.log('\n=== CommonJS 导入方式使用示例 ===');

// 使用 CommonJS 导入
const clientCJS = new TradingViewCJS.Client();
console.log('CommonJS 方式创建 Client:', !!clientCJS);

const clientCJS2 = new ClientCJS();
console.log('CommonJS 解构导入创建 Client:', !!clientCJS2);

// ===== 所有支持的导入方式总结 =====

console.log('\n=== 支持的所有导入方式 ===');
console.log(`
1. ES6 具名导入:
   import { Client, BuiltInIndicator, PineIndicator } from '@alandlguo/tradingview-api';

2. ES6 函数导入:
   import { searchMarket, searchIndicator, getIndicator } from '@alandlguo/tradingview-api';

3. ES6 默认导入:
   import TradingView from '@alandlguo/tradingview-api';

4. ES6 混合导入:
   import TradingView, { Client, searchMarket } from '@alandlguo/tradingview-api';

5. CommonJS 导入:
   const TradingView = require('@alandlguo/tradingview-api');
   const { Client } = require('@alandlguo/tradingview-api');

6. 直接路径导入 (如果需要):
   const Client = require('@alandlguo/tradingview-api/src/client');
`);
