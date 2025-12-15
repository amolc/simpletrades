# StockAgent Architecture Documentation

## Overview

StockAgent is a comprehensive stock trading and signal management system built with Node.js and Express. The application provides real-time stock data, trading signals, user management, and subscription services with a modular, service-oriented architecture.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        StockAgent System                        │
├─────────────────────────────────────────────────────────────────┤
│  Presentation Layer                                             │
│  ├─ Web Interface (Nunjucks Templates)                         │
│  ├─ Admin Dashboard                                            │
│  └─ User Portal                                                │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                      │
│  ├─ RESTful API Endpoints                                      │
│  ├─ WebSocket Real-time Data                                  │
│  └─ TradingView Integration                                   │
├─────────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                           │
│  ├─ Main Service (Core Business Logic)                        │
│  ├─ Signal Processing                                         │
│  ├─ Subscription Management                                   │
│  └─ User Management                                            │
├─────────────────────────────────────────────────────────────────┤
│  Data Access Layer                                              │
│  ├─ Database Manager (MySQL/SQLite)                          │
│  ├─ CRUD Operations                                            │
│  └─ Migrations & Models                                        │
├─────────────────────────────────────────────────────────────────┤
│  External Integrations                                          │
│  ├─ TradingView WebSocket API                                │
│  ├─ NSE Options Data                                          │
│  └─ Real-time Price Feeds                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Database Module (`modules/database/`)

**Purpose**: Handles all database operations and connection management

**Key Components**:
- `DatabaseManager`: Connection pooling, query execution, transaction management
- `CRUDOperations`: Generic CRUD operations for all tables
- `migrations.js`: Database schema migrations and versioning

**Features**:
- Connection pooling with retry logic
- Transaction support
- Health monitoring
- Schema introspection
- Query performance logging

**Technology**: Sequelize ORM with MySQL/SQLite support

### 2. Services Module (`modules/services/`)

**Purpose**: Core business logic and service orchestration

**Key Components**:
- `main-service.js`: Central service coordinator
- Price caching and management
- Signal processing and distribution
- Subscription validation
- Real-time data streaming

**Features**:
- In-memory price caching with TTL
- Automated signal generation
- Subscription-based content delivery
- Real-time WebSocket broadcasting
- Health monitoring and metrics

### 3. WebSocket Module (`modules/websocket/`)

**Purpose**: Real-time communication and TradingView integration

**Key Components**:
- `TradingViewWebSocket`: TradingView API integration
- WebSocket server for client connections
- Message parsing and protocol handling
- Subscription management

**Features**:
- TradingView real-time data streaming
- Client subscription management
- Bidirectional communication
- Error handling and reconnection
- Message broadcasting to subscribed clients

### 4. Utils Module (`modules/utils/`)

**Purpose**: Common utilities and helpers

**Key Components**:
- `helpers.js`: Logging, validation, common functions
- Error handling utilities
- Configuration management

## Data Models

### Core Entities

1. **User**
   - Authentication and profile management
   - Role-based access control (Admin, User)
   - Alert preferences and settings

2. **Subscription**
   - User subscription plans
   - Payment tracking and status
   - Plan features and limitations

3. **Signal**
   - Trading signals with buy/sell recommendations
   - Technical analysis indicators
   - Signal status and performance tracking

4. **Product**
   - Financial instruments (stocks, options)
   - Real-time price data
   - Market information and metadata

5. **Plan**
   - Subscription plan definitions
   - Feature sets and pricing
   - Usage limitations

## API Architecture

### RESTful Endpoints

**User Management**:
- `POST /api/register` - User registration
- `POST /api/login` - User authentication
- `GET /api/user/profile` - User profile management

**Subscription Management**:
- `GET /api/plans` - Available subscription plans
- `POST /api/subscribe` - Create subscription
- `GET /api/subscription/status` - Subscription status

**Signal Management**:
- `GET /api/signals` - Available trading signals
- `GET /api/signals/:id` - Signal details
- `POST /api/signals/subscribe` - Subscribe to signals

**Price Data**:
- `GET /api/price/:symbol` - Current price data
- `GET /api/cached-prices` - Cached price data
- `GET /api/cache/metrics` - Cache performance metrics

### WebSocket Endpoints

**Real-time Data**:
- `ws://localhost:3000/tradingview` - TradingView data stream
- `ws://localhost:3000/signals` - Real-time signal updates
- `ws://localhost:3000/prices` - Price change notifications

## Database Schema

### Migration System

The application uses a comprehensive migration system for schema management:

1. **User Management**: User creation, role assignment, profile fields
2. **Subscription System**: Plan definitions, subscription tracking, payment records
3. **Signal Processing**: Signal creation, status tracking, performance metrics
4. **Product Catalog**: Financial instruments, price history, metadata

### Key Relationships

- Users → Subscriptions (One-to-Many)
- Users → Signals (Many-to-Many through subscriptions)
- Plans → Subscriptions (One-to-Many)
- Products → Signals (One-to-Many)

## External Integrations

### TradingView Integration

**WebSocket Connection**:
- Real-time price data streaming
- Technical indicator calculations
- Market depth information
- Historical data retrieval

**Data Processing**:
- Message parsing and validation
- Price caching and distribution
- Signal generation based on technical analysis
- Error handling and reconnection logic

### NSE Options Data

**API Integration**:
- Options chain data retrieval
- Implied volatility calculations
- Greeks calculation (Delta, Gamma, Theta, Vega)
- Expiration date management

## Security Architecture

### Authentication & Authorization

**JWT-based Authentication**:
- Secure token-based authentication
- Role-based access control
- Session management
- Password encryption with bcrypt

**Input Validation**:
- Request validation middleware
- SQL injection prevention
- XSS protection
- Rate limiting

### Data Protection

**Encryption**:
- Password hashing with salt
- Sensitive data encryption
- Secure communication protocols

**Access Control**:
- Admin vs User role separation
- Subscription-based content access
- API rate limiting
- IP-based restrictions

## Performance & Scalability

### Caching Strategy

**Multi-level Caching**:
- In-memory price cache with TTL
- Database query result caching
- Static asset caching
- API response caching

**Cache Management**:
- Automatic cache invalidation
- Stale data detection
- Cache size limits
- Performance monitoring

### Scaling Considerations

**Horizontal Scaling**:
- Stateless application design
- Database connection pooling
- Load balancer compatibility
- Microservices-ready architecture

**Performance Optimization**:
- Database query optimization
- Index optimization
- Connection pooling
- Asynchronous processing

## Deployment Architecture

### Environment Configuration

**Development**:
- SQLite database for simplicity
- Debug logging enabled
- Hot reload for development

**Production**:
- MySQL database for scalability
- PM2 process management
- Nginx reverse proxy
- SSL/TLS encryption

### Docker Support

**Containerization**:
- Multi-stage Docker builds
- Environment-specific configurations
- Health check endpoints
- Graceful shutdown handling

## Monitoring & Observability

### Logging System

**Structured Logging**:
- Winston logger with multiple transports
- Log levels (error, warn, info, debug)
- Request/response logging
- Error tracking and reporting

### Health Monitoring

**System Health Checks**:
- Database connectivity monitoring
- WebSocket connection status
- Cache performance metrics
- External service availability

**Metrics Collection**:
- Response time tracking
- Error rate monitoring
- Cache hit/miss ratios
- Subscription usage statistics

## Testing Strategy

### Unit Testing

**Coverage Targets**:
- Main Service: 94.96% coverage (exceeds 70% target)
- WebSocket Module: 75.92% coverage (exceeds 75% target)
- Database Module: 45.4% coverage (working toward 80% target)

**Test Categories**:
- Business logic testing
- Data access layer testing
- WebSocket communication testing
- Error handling testing

### Integration Testing

**System Integration**:
- Database service integration
- WebSocket service integration
- External API integration
- End-to-end workflow testing

## Future Enhancements

### Planned Features

1. **Advanced Analytics**:
   - Signal performance tracking
   - User behavior analytics
   - Revenue optimization
   - Predictive analytics

2. **Mobile Support**:
   - Progressive Web App (PWA)
   - Mobile-optimized UI
   - Push notifications
   - Offline capability

3. **Advanced Trading Features**:
   - Algorithmic trading support
   - Portfolio management
   - Risk management tools
   - Backtesting capabilities

### Technical Improvements

1. **Performance**:
   - Redis integration for caching
   - Message queue implementation
   - Database sharding
   - CDN integration

2. **Security**:
   - Two-factor authentication
   - Advanced encryption
   - Security auditing
   - Compliance features

## Conclusion

StockAgent is designed with a modular, scalable architecture that separates concerns and promotes maintainability. The system provides robust real-time trading capabilities while maintaining high availability and performance. The architecture supports both current requirements and future enhancements, making it suitable for production deployment and scaling.