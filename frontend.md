# Frontend User Flow

This document outlines the complete user flow of the StockAgent application, from the initial landing page to the subscription and dashboard.

## 1. Landing Page (`index.html`)

The user journey begins on the main landing page, which serves as the entry point for both new and existing users.

- **New Users**: Can navigate to the registration page by clicking the **Register** button.
- **Existing Users**: Can proceed to the login page by clicking the **Login** button.

## 2. Registration (`subscribe.html`)

New users are directed to the subscription page to create an account and select a plan.

- **Plan Selection**: Users can choose from various subscription plans, including a free trial and paid tiers (e.g., Monthly, Quarterly, Annual).
- **User Details**: A form captures the user's full name, mobile number, email address, and a password for the new account.
- **Alert Preferences**: Users can provide their Telegram ID and WhatsApp number and choose their preferred method for receiving alerts.
- **Terms and Conditions**: Users must agree to the terms and conditions before proceeding.
- **Registration and Subscription**: Upon clicking "Register and Subscribe," the system creates a new user account and a corresponding subscription.

## 3. Login (`login.html`)

Existing users can access their accounts through the login page.

- **Credentials**: Users enter their registered mobile phone number and password.
- **Authentication**: The system sends a request to the `/api/users/login` endpoint to verify the credentials.
- **Token Storage**: Upon successful authentication, a JWT token is returned and stored in the browser's `localStorage`.
- **Redirection**: The user is then redirected to the main dashboard.

## 4. Dashboard (`dashboard.html`)

The dashboard is the central hub for authenticated users, providing an overview of their account and subscription status.

- **Authentication**: Access to the dashboard is protected and requires a valid JWT token.
- **User Information**: The dashboard displays the user's phone number and email address, fetched from the `/api/users/dashboard` endpoint.
- **Subscription Status**:
    - **Pending**: If a subscription is awaiting manual verification, it is displayed with a "Pending Verification" status and a yellow warning indicator.
    - **Active**: Once approved, the subscription status changes to "Active," with a progress bar indicating the remaining duration.
- **Product Access**: The dashboard features cards for different products (e.g., Stocks, Options), which show an "Active" or "Pending" status based on the user's subscription.
- **Logout**: A logout button allows the user to securely log out, which clears the JWT token from `localStorage` and redirects to the login page.

## 5. Subscription Plans (`plans.html`)

From the dashboard, users can navigate to the plans page to view and select a subscription.

- **Plan Options**: The page displays all available subscription plans with their respective prices and features.
- **Plan Selection**: When a user chooses a plan, they are redirected to the payment page, with the selected plan and amount passed as URL parameters.

## 6. Payment (`payment.html`)

## 7. Settings (`settings.html`)

The settings page allows users to manage their profile and security settings.

- **Profile Information**: Users can update their personal details, such as their name and email address.
- **Password Reset**: A dedicated section allows users to change their password.
- **Alert Preferences**: Users can update their Telegram ID and WhatsApp number and change their preferred alert method.

## 8. Signals (`signals.html`)

This page displays the trading signals for the products the user has subscribed to.

- **Product-Specific Signals**: The left menu will dynamically populate with links to the signal pages for each subscribed product (e.g., "Stock Signals").
- **Signal History**: Users can view a history of all signals sent to them since their subscription started.
- **Signal Details**: Each signal in the list will show relevant details, such as the stock symbol, entry price, target price, and stop loss.


The payment page facilitates the subscription payment process.

- **Payment Details**: The selected plan and corresponding amount are displayed.
- **QR Code Generation**: A UPI QR code is generated for the specified amount, allowing the user to make a payment using any UPI-enabled app.
- **Reference Number**: After completing the payment, the user enters the transaction reference number (UTR/Transaction ID) into an input field.
- **Payment Confirmation**: The user clicks "I Have Completed Payment" to submit the reference number to the backend via the `/api/activate-subscription` endpoint.
- **Pending Status**: The system creates a new subscription with a `pending` status, which will be manually verified by an administrator.
- **Redirection**: The user is then redirected back to the dashboard, where they can see their new subscription in a pending state.