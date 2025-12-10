const TradingView = require('../main');
const ConnectionPool = require('../src/connectionPool');

/**
 * 这个示例演示如何在开发模式下启用 debug 日志
 * 
 * 使用方法：
 * 1. 开发模式：NODE_ENV=development node examples/DevelopmentLogging.js
 * 2. 生产模式：NODE_ENV=production node examples/DevelopmentLogging.js
 * 3. 默认模式：node examples/DevelopmentLogging.js
 */

console.log('当前环境:', process.env.NODE_ENV || 'undefined');
console.log('开发模式:', process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev');

// 创建连接池实例
const pool = new ConnectionPool({
  maxConnections: 2,
  clientOptions: {
    // 可以同时启用 TradingView 的 DEBUG 模式
    DEBUG: process.env.NODE_ENV === 'development'
  }
});

async function testConnectionPool() {
  try {
    console.log('\n=== 开始测试连接池 ===');
    
    // 初始化连接池 - 这里会输出 debug 日志（仅在开发模式下）
    await pool.initialize();
    
    console.log('\n连接池统计信息:');
    console.log(pool.getStats());
    
    // 等待一段时间让连接建立
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n=== 测试完成 ===');
    
    // 关闭所有连接 - 这里也会输出 debug 日志（仅在开发模式下）
    await pool.closeAll();
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testConnectionPool();

// 演示如何在其他地方使用相同的模式
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
const debugLog = isDevelopment ? console.debug : () => {};

// 示例：在您的代码中使用条件性日志
debugLog('这条消息只在开发模式下显示');
console.log('这条消息总是显示');
