# 导入指南 - @alandlguo/tradingview-api

## 支持的导入方式

从版本 1.1.0 开始，`@alandlguo/tradingview-api` 支持多种导入方式，包括 ES6 模块和 CommonJS。

### 1. ES6 模块导入（推荐）

#### 导入特定的类
```javascript
import { Client, BuiltInIndicator, PineIndicator } from '@alandlguo/tradingview-api';

const client = new Client();
const chart = new client.Session.Chart();
```

#### 导入特定的函数
```javascript
import { searchMarket, searchIndicator, getIndicator } from '@alandlguo/tradingview-api';

// 搜索市场
const markets = await searchMarket('BINANCE:');

// 搜索指标
const indicators = await searchIndicator('RSI');
```

#### 导入默认导出（完整的 TradingView 对象）
```javascript
import TradingView from '@alandlguo/tradingview-api';

const client = new TradingView.Client();
const markets = await TradingView.searchMarket('NASDAQ:');
```

#### 混合导入
```javascript
import TradingView, { Client, searchMarket } from '@alandlguo/tradingview-api';

// 使用具名导入
const client1 = new Client();

// 使用默认导入
const client2 = new TradingView.Client();

// 使用导入的函数
const markets = await searchMarket('NYSE:');
```

### 2. CommonJS 导入（向后兼容）

#### 导入整个模块
```javascript
const TradingView = require('@alandlguo/tradingview-api');

const client = new TradingView.Client();
const markets = await TradingView.searchMarket('BINANCE:');
```

#### 解构导入
```javascript
const { Client, searchMarket, getIndicator } = require('@alandlguo/tradingview-api');

const client = new Client();
const markets = await searchMarket('NASDAQ:');
```

### 3. 直接路径导入（如果需要）

```javascript
// ES6
import Client from '@alandlguo/tradingview-api/src/client';

// CommonJS
const Client = require('@alandlguo/tradingview-api/src/client');
```

## 可用的导出

### 类（Classes）
- `Client` - 主要的 WebSocket 客户端
- `BuiltInIndicator` - 内置指标类
- `PineIndicator` - Pine 脚本指标类
- `PinePermManager` - Pine 权限管理器

### 函数（Functions）
- `searchMarket` - 搜索市场
- `searchIndicator` - 搜索指标
- `getIndicator` - 获取指标
- `getPrivateIndicators` - 获取私有指标
- `getUser` - 获取用户信息
- `scanSymbol` - 扫描符号

## 使用示例

### 创建客户端并获取市场数据
```javascript
import { Client } from '@alandlguo/tradingview-api';

const client = new Client();
const chart = new client.Session.Chart();

chart.setMarket('BINANCE:BTCEUR', {
  timeframe: 'D',
});

chart.onUpdate(() => {
  if (chart.periods[0]) {
    console.log(`价格: ${chart.periods[0].close}`);
  }
});
```

### 搜索和使用指标
```javascript
import { searchIndicator, getIndicator } from '@alandlguo/tradingview-api';

// 搜索 RSI 指标
const indicators = await searchIndicator('RSI');
console.log('找到的指标:', indicators.length);

// 获取特定指标
const rsi = await getIndicator('STD;RSI');
console.log('RSI 指标:', rsi.name);
```

## 迁移指南

如果您之前使用的是直接路径导入：

```javascript
// 旧方式
const Client = require('@alandlguo/tradingview-api/src/client');

// 新方式（推荐）
import { Client } from '@alandlguo/tradingview-api';
// 或
const { Client } = require('@alandlguo/tradingview-api');
```

## TypeScript 支持

目前包还没有内置的 TypeScript 定义，但您可以这样使用：

```typescript
import { Client } from '@alandlguo/tradingview-api';

const client: any = new Client();
```

我们计划在未来的版本中添加完整的 TypeScript 支持。
