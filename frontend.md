# Frontend Documentation - SimpleIncome

## Overview
SimpleIncome is a trading signals platform with both customer-facing and admin interfaces. The application uses Nunjucks templates for server-side rendering with a Node.js/Express backend.

## Authentication System

### User Authentication
- **Method**: JWT-based authentication
- **Token Storage**: LocalStorage (`authToken`)
- **Token Propagation**: Via query parameters for redirects
- **Authentication Check**: `authenticateViewUser()` function in routes

### Admin Authentication
- **Method**: Separate admin login system
- **Access**: Admin-only routes under `/admin/*`

## Page Structure & Authentication Requirements

### Public Pages (No Authentication Required)

#### 1. Home Page
- **URL**: `/`
- **Template**: `views/userpanel/index.njk`
- **Purpose**: Landing page with product showcase
- **Features**: Displays top 4 active products, hero section, features

#### 2. Product Details
- **URL**: `/product/:name`
- **Template**: `views/userpanel/product-detail.njk`
- **Purpose**: Individual product information and pricing
- **Features**: Product description, pricing plans, subscription options

#### 3. Products Listing
- **URL**: `/products`
- **Template**: `views/userpanel/products.njk`
- **Purpose**: Browse all available products
- **Features**: Product grid, filtering by category

#### 4. Plans Page
- **URL**: `/plans`
- **Template**: `views/userpanel/plans.njk`
- **Purpose**: Display all available subscription plans
- **Features**: Plan comparison, pricing details

#### 5. Stocks Page
- **URL**: `/stocks`
- **Template**: `views/userpanel/stocks.njk`
- **Purpose**: Stock market information
- **Features**: Stock listings, market data

#### 6. Contact Page
- **URL**: `/contact`
- **Template**: `views/userpanel/contact.njk`
- **Purpose**: Contact form and support information
- **Features**: Contact form, support details

#### 7. User Registration
- **URL**: `/register`
- **Template**: `views/userpanel/register.njk`
- **Purpose**: New user registration
- **Features**: Registration form, validation
- **API**: `POST /api/users/register`

#### 8. User Login
- **URL**: `/login`
- **Template**: `views/userpanel/login.njk`
- **Purpose**: User authentication
- **Features**: Login form, redirect handling
- **API**: `POST /api/users/login`
- **Authentication**: Phone number + password

#### 9. Error Pages
- **URL**: `/error` (generic error handler)
- **Templates**: 
  - `views/userpanel/error.njk` (generic errors)
  - `views/userpanel/404.njk` (not found)
- **Purpose**: Error handling and user feedback

### Authenticated Pages (User Login Required)

#### 10. Dashboard
- **URL**: `/dashboard`
- **Template**: `views/userpanel/dashboard.njk`
- **Purpose**: User dashboard with subscription overview
- **Features**: 
  - User welcome message
  - Active subscriptions table
  - Quick access to signals
- **JavaScript**: `assets/js/dashboard.js`
- **API**: `GET /api/subscriptions/user/:userId`

#### 11. Trading Signals
- **URL**: `/signals/`
- **Template**: `views/userpanel/signals.njk`
- **Purpose**: Trading signals dashboard
- **Features**:
  - Signal statistics (total, active, win rate, P&L)
  - Signals table with real-time data
  - Auto-refresh every 30 seconds
- **API**: `GET /api/signals`

#### 12. User-Specific Signals
- **URL**: `/dashboard/signals/:productName`
- **Template**: `views/userpanel/user-signals.njk`
- **Purpose**: Product-specific signals for subscribed users
- **Features**: Filtered signals by product, detailed signal information

#### 13. Subscription Confirmation
- **URL**: `/subscription/confirm?productId=X&planId=Y`
- **Template**: `views/userpanel/subscription-confirm.njk`
- **Purpose**: Confirm subscription details before payment
- **Features**:
  - Product and plan details
  - Subscription dates calculation
  - User information display
- **Authentication**: Required (redirects to login if not authenticated)
- **Flow**: Product page → Subscription confirm → Payment

#### 14. Payment Page
- **URL**: `/payment?subscriptionId=X&authToken=Y`
- **Template**: `views/userpanel/payment.njk`
- **Purpose**: Payment processing for subscriptions
- **Features**:
  - UPI payment instructions
  - Subscription details
  - Payment amount display
- **Authentication**: Required (via authToken in URL)
- **Parameters**: `subscriptionId` or `productId+planId`
- **Amount Calculation**: Uses `Number(plan.cost).toFixed(2)`

### Admin Pages (Admin Authentication Required)

#### 15. Admin Login
- **URL**: `/admin/login`
- **Template**: `views/admin/login.njk`
- **Purpose**: Admin authentication
- **Features**: Admin-specific login form
- **JavaScript**: `assets/admin/js/login.js`

#### 16. Admin Dashboard
- **URL**: `/admin/dashboard`
- **Template**: `views/admin/dashboard.njk`
- **Purpose**: Admin overview and statistics
- **Features**: System statistics, quick actions

#### 17. Admin Signals Management
- **URL**: `/admin/signals`
- **Template**: `views/admin/signals.njk`
- **Purpose**: Signal management and monitoring
- **Features**:
  - Signal statistics
  - Watchlist management
  - Signal creation/editing
  - Real-time data updates

#### 18. Admin Signal Details
- **URL**: `/admin/signals/:productName`
- **Template**: `views/admin/signal-detail.njk`
- **Purpose**: Product-specific signal management
- **Features**: Detailed signal analytics, product filtering

#### 19. Admin Products
- **URL**: `/admin/products`
- **Template**: `views/admin/products.njk`
- **Purpose**: Product management
- **Features**: Product CRUD operations, pricing management

#### 20. Admin Subscriptions
- **URL**: `/admin/subscriptions`
- **Template**: `views/admin/subscriptions.njk`
- **Purpose**: Subscription management
- **Features**:
  - All user subscriptions
  - Subscription status tracking
  - Pagination (50 items per page)
- **API**: Uses `subscriptionController.getAllSubscriptions()`

#### 21. Admin Transactions
- **URL**: `/admin/transactions`
- **Template**: `views/admin/transactions.njk`
- **Purpose**: Payment transaction management
- **Features**:
  - Transaction history
  - Payment status tracking
  - Pagination (50 items per page)
- **API**: Uses `transactionController.getAllTransactions()`

#### 22. Admin Staff Management
- **URL**: `/admin/staff`
- **Template**: `views/admin/staff.njk`
- **Purpose**: Staff user management
- **Features**: Staff CRUD operations, role management
- **API**: Uses `userController.getAllUsers()` with `userType=staff`

#### 23. Admin Customers
- **URL**: `/admin/customers`
- **Template**: `views/admin/customers.njk`
- **Purpose**: Customer management
- **Features**: Customer overview, subscription tracking
- **API**: Uses `userController.getAllUsers()` with `userType=customer`

#### 24. Admin Settings
- **URL**: `/admin/settings`
- **Template**: `views/admin/settings.njk`
- **Purpose**: System configuration
- **Features**: Payment settings, system preferences

## Authentication Flow

### User Authentication Flow
1. **Login**: `/login` → API call → Store token in localStorage
2. **Authenticated Access**: Include token in requests
3. **Token Propagation**: Pass authToken in URLs for redirects
4. **Logout**: Clear localStorage, redirect to home

### Subscription Flow
1. **Product Selection**: `/product/:name`
2. **Plan Selection**: Choose subscription plan
3. **Confirmation**: `/subscription/confirm?productId=X&planId=Y`
4. **Payment**: `/payment?subscriptionId=X&authToken=Y`
5. **Dashboard**: `/dashboard` (view active subscription)

### Admin Authentication Flow
1. **Admin Login**: `/admin/login`
2. **Admin Dashboard**: `/admin/dashboard`
3. **Management Pages**: Various admin routes

## JavaScript Files

### User Panel Scripts
- `assets/js/dashboard.js`: Dashboard functionality, subscription loading
- `assets/js/main.js`: Common functionality
- Template-specific scripts embedded in Nunjucks files

### Admin Scripts
- `assets/admin/js/login.js`: Admin authentication
- Admin-specific functionality embedded in templates

## Error Handling
- **404 Errors**: Custom 404 page for missing content
- **500 Errors**: Generic error page with error messages
- **Authentication Errors**: Redirect to login with return URL
- **API Errors**: Displayed in-page with user-friendly messages

## Template Inheritance
- **Base Layout**: `views/layout.njk` (user panel)
- **Admin Layout**: `views/admin/layout.njk` (admin panel)
- **Common Components**: Header, footer shared across pages

## Data Flow
- **Server-Side Rendering**: Nunjucks templates with data injection
- **API Integration**: Fetch calls to backend API endpoints
- **Real-Time Updates**: JavaScript polling for signal updates (30s intervals)
- **Authentication**: JWT tokens passed via headers, cookies, or URL parameters