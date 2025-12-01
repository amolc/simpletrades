# Admin Documentation

## Database Models

### User Model (`/models/user.js`)
- **Fields**: id, username, email, password, role, status, createdAt, updatedAt
- **Roles**: 'admin', 'moderator', 'user'
- **Status**: 'active', 'inactive', 'suspended'
- **Associations**: Has many Subscriptions
- **Password**: Hashed using bcrypt

### Subscription Model (`/models/subscription.js`)
- **Fields**: id, userId, planId, startDate, endDate, status, paymentStatus, amount, transactionId, createdAt, updatedAt
- **Status**: 'active', 'expired', 'cancelled'
- **Payment Status**: 'pending', 'completed', 'failed', 'refunded'
- **Associations**: Belongs to User and Plan

### Plan Model (`/models/plan.js`)
- **Fields**: id, name, description, price, duration, features, isActive, createdAt, updatedAt
- **Duration**: In days (e.g., 30, 90, 365)
- **Features**: JSON array of feature strings
- **isActive**: Boolean flag for availability

### Product Model (`/models/product.js`)
- **Fields**: id, name, description, price, category, imageUrl, isActive, createdAt, updatedAt
- **Category**: 'stocks', 'options', 'futures', 'commodities'
- **isActive**: Boolean flag for availability

### Signal Model (`/models/signal.js`)
- **Fields**: id, title, description, type, symbol, entryPrice, targetPrice, stopLoss, status, confidence, createdBy, createdAt, updatedAt
- **Type**: 'buy', 'sell', 'hold'
- **Status**: 'active', 'expired', 'cancelled', 'achieved'
- **Confidence**: 1-10 scale
- **createdBy**: References User ID

### Payment Model (`/models/payment.js`)
- **Fields**: id, userId, amount, currency, status, transactionId, paymentMethod, paymentDate, createdAt, updatedAt
- **Status**: 'pending', 'completed', 'failed', 'refunded'
- **Payment Method**: 'upi', 'card', 'netbanking'

### Contact Model (`/models/contact.js`)
- **Fields**: id, name, email, subject, message, status, createdAt, updatedAt
- **Status**: 'new', 'read', 'replied', 'closed'

## API Controllers

### User Controller (`/api/userController.js`)
- **POST /api/auth/register** - User registration
- **POST /api/auth/login** - User login with JWT
- **POST /api/auth/logout** - User logout
- **GET /api/users/profile** - Get user profile (auth required)
- **PUT /api/users/profile** - Update user profile (auth required)
- **GET /api/users** - List all users (admin only)
- **PUT /api/users/:id/status** - Update user status (admin only)

### Subscription Controller (`/api/subscriptionController.js`)
- **GET /api/subscriptions** - List user subscriptions (auth required)
- **POST /api/subscriptions** - Create new subscription (auth required)
- **GET /api/subscriptions/:id** - Get subscription details (auth required)
- **PUT /api/subscriptions/:id** - Update subscription (admin only)
- **DELETE /api/subscriptions/:id** - Cancel subscription (auth required)

### Plan Controller (`/api/planController.js`)
- **GET /api/plans** - List all active plans
- **GET /api/plans/:id** - Get plan details
- **POST /api/plans** - Create new plan (admin only)
- **PUT /api/plans/:id** - Update plan (admin only)
- **DELETE /api/plans/:id** - Delete plan (admin only)

### Product Controller (`/api/productController.js`)
- **GET /api/products** - List all active products
- **GET /api/products/:id** - Get product details
- **POST /api/products** - Create new product (admin only)
- **PUT /api/products/:id** - Update product (admin only)
- **DELETE /api/products/:id** - Delete product (admin only)

### Signal Controller (`/api/signalController.js`)
- **GET /api/signals** - List all signals (auth required)
- **GET /api/signals/:id** - Get signal details (auth required)
- **POST /api/signals** - Create new signal (admin/moderator only)
- **PUT /api/signals/:id** - Update signal (admin/moderator only)
- **DELETE /api/signals/:id** - Delete signal (admin only)

### Payment Controller (`/api/paymentController.js`)
- **POST /api/payments/create** - Create payment order
- **POST /api/payments/verify** - Verify payment completion
- **GET /api/payments/history** - Payment history (auth required)
- **POST /api/payments/refund** - Process refund (admin only)

### Contact Controller (`/api/contactController.js`)
- **POST /api/contact** - Submit contact form
- **GET /api/contact** - List all messages (admin only)
- **GET /api/contact/:id** - Get message details (admin only)
- **PUT /api/contact/:id/status** - Update message status (admin only)

### Admin Controller (`/api/adminController.js`)
- **GET /api/admin/dashboard** - Admin dashboard stats (admin only)
- **GET /api/admin/users** - List users with filters (admin only)
- **GET /api/admin/subscriptions** - List subscriptions with filters (admin only)
- **GET /api/admin/payments** - List payments with filters (admin only)
- **GET /api/admin/signals** - List signals with filters (admin only)

## Authentication System

### JWT Token Structure
- **Access Token**: 15-minute expiry, contains user ID and role
- **Refresh Token**: 7-day expiry, stored in httpOnly cookie
- **Token Propagation**: Headers, cookies, and query parameters supported

### Role-Based Access Control
- **Admin**: Full access to all endpoints and admin panel
- **Moderator**: Can manage signals, view user data
- **User**: Can access own data, subscriptions, and signals

### Authentication Flow
1. User submits login credentials
2. Server validates credentials and generates JWT tokens
3. Access token returned in response, refresh token in cookie
4. Frontend stores access token in localStorage/sessionStorage
5. Subsequent requests include token in Authorization header

## Payment Integration (UPI)

### Payment Flow
1. User selects subscription plan
2. Frontend creates payment order via `/api/payments/create`
3. Server generates UPI payment link/QR code
4. User completes payment using UPI app
5. Frontend verifies payment via `/api/payments/verify`
6. Server confirms payment and activates subscription

### Payment Security
- All payment data encrypted in transit
- Transaction IDs validated with payment provider
- Webhook support for payment notifications
- Refund processing with proper authorization

## Database Relationships

### Primary Associations
- **User → Subscriptions**: One-to-many
- **Subscription → Plan**: Many-to-one
- **Subscription → User**: Many-to-one
- **Signal → User**: Many-to-one (created by)
- **Payment → User**: Many-to-one

### Foreign Key Constraints
- User deletion cascades to subscriptions and payments
- Plan deletion prevented if active subscriptions exist
- Signal creator must be admin/moderator role

## Error Handling

### Standard Response Format
```json
{
  "success": boolean,
  "message": string,
  "data": object/array,
  "error": string (if applicable)
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

## Security Measures

### Input Validation
- All user inputs validated and sanitized
- SQL injection prevention via Sequelize ORM
- XSS protection through proper escaping
- Rate limiting on authentication endpoints

### Data Protection
- Passwords hashed with bcrypt (salt rounds: 10)
- Sensitive data excluded from API responses
- HTTPS enforcement in production
- CORS properly configured

## Admin Panel Features

### Dashboard
- User registration statistics
- Subscription revenue metrics
- Signal performance analytics
- Payment transaction overview

### User Management
- View all users with filters
- Update user roles and status
- View user subscription history
- Export user data

### Content Management
- Create/edit/delete signals
- Manage subscription plans
- Handle product catalog
- Process contact messages

### Financial Management
- View payment transactions
- Process refunds
- Generate revenue reports
- Export financial data

## API Rate Limiting

### Default Limits
- **Authentication**: 5 requests per minute
- **General API**: 100 requests per minute
- **Admin endpoints**: 50 requests per minute
- **Payment endpoints**: 10 requests per minute

### Rate Limit Headers
- **X-RateLimit-Limit**: Request limit
- **X-RateLimit-Remaining**: Remaining requests
- **X-RateLimit-Reset**: Reset timestamp

## Logging and Monitoring

### Application Logs
- Request/response logging
- Error tracking and reporting
- Performance metrics collection
- Security event monitoring

### Database Monitoring
- Query performance tracking
- Connection pool monitoring
- Error rate analysis
- Backup verification

## Deployment Considerations

### Environment Variables
- **DATABASE_URL**: PostgreSQL connection string
- **JWT_SECRET**: JWT signing secret
- **JWT_EXPIRY**: Token expiry time
- **PAYMENT_API_KEY**: Payment provider key
- **NODE_ENV**: Environment (development/production)

### Production Setup
- SSL/TLS certificate installation
- Database migration execution
- Admin user creation
- Payment webhook configuration
- CDN setup for static assets

## Backup and Recovery

### Database Backups
- Daily automated backups
- Weekly full database dumps
- Point-in-time recovery support
- Cross-region backup replication

### Disaster Recovery
- Database failover procedures
- Application redundancy setup
- Data integrity verification
- Recovery time objectives (RTO): 4 hours
- Recovery point objectives (RPO): 1 hour

## Support and Maintenance

### Regular Maintenance
- Monthly security updates
- Quarterly dependency updates
- Annual security audits
- Performance optimization reviews

### Support Channels
- Email support system
- Contact form integration
- Admin message management
- User feedback collection