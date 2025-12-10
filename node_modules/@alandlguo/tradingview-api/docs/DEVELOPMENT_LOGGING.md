# 开发模式日志配置

## 概述

项目现在支持基于环境变量的条件性日志输出。在开发模式下，`console.debug` 日志会正常输出；在生产模式下，这些日志会被静默处理，不会输出到控制台。

## 使用方法

### 1. 设置环境变量

**开发模式（显示 debug 日志）：**
```bash
NODE_ENV=development node your-script.js
# 或者
NODE_ENV=dev node your-script.js
```

**生产模式（隐藏 debug 日志）：**
```bash
NODE_ENV=production node your-script.js
```

**默认模式（隐藏 debug 日志）：**
```bash
node your-script.js
```

### 2. 在代码中使用

如果您想在其他文件中使用相同的模式，可以添加以下代码：

```javascript
// 简单的开发模式检测
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';

// 条件性的 debug 日志函数
const debugLog = isDevelopment ? console.debug : () => {};

// 使用示例
debugLog('这条消息只在开发模式下显示');
console.log('这条消息总是显示');
console.error('错误消息总是显示');
console.warn('警告消息总是显示');
```

## 当前实现

### 已修改的文件

- `src/connectionPool.js`: 已将部分日志改为条件性输出

### 日志级别说明

- `debugLog()`: 仅在开发模式下输出，用于调试信息
- `console.log()`: 总是输出，用于一般信息
- `console.warn()`: 总是输出，用于警告信息  
- `console.error()`: 总是输出，用于错误信息

## 测试示例

运行测试示例来查看效果：

```bash
# 开发模式 - 会看到 debug 日志
NODE_ENV=development node examples/DevelopmentLogging.js

# 生产模式 - 不会看到 debug 日志
NODE_ENV=production node examples/DevelopmentLogging.js
```

## 扩展建议

如果将来需要更复杂的日志功能，可以考虑：

1. **添加更多日志级别**：
   ```javascript
   const logLevel = process.env.LOG_LEVEL || 'info';
   const logger = {
     debug: logLevel === 'debug' ? console.debug : () => {},
     info: ['debug', 'info'].includes(logLevel) ? console.log : () => {},
     warn: ['debug', 'info', 'warn'].includes(logLevel) ? console.warn : () => {},
     error: console.error // 错误总是显示
   };
   ```

2. **集成专业日志库**：
   - winston
   - pino
   - bunyan

3. **添加日志格式化**：
   - 时间戳
   - 日志级别标识
   - 模块名称

## 注意事项

- 这是一个轻量级的解决方案，适合简单的开发/生产环境区分
- 如果需要更复杂的日志管理，建议使用专业的日志库
- 确保在部署时正确设置 `NODE_ENV` 环境变量
