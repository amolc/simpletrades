# Admin Panel Flow

This document outlines the flow and functionality of the admin panel, which is designed for administrators to manage user subscriptions.

## 1. Admin Authentication

-   **Login Page (`/adminpanel/login.html`)**:
    -   Administrators will use a dedicated login page to access the admin panel.
    -   Authentication will be handled separately from the user panel, using a distinct admin user model and authentication mechanism.
    -   Upon successful login, a JWT token will be issued and stored in the admin's local storage to manage the session.

## 2. Subscription Management Dashboard

-   **Dashboard Page (`/adminpanel/dashboard.html`)**:
    -   The main dashboard will display a list of all user subscriptions with a "pending" status.
    -   Each entry in the list will show relevant details, such as:
        -   User's name and email
        -   Subscription plan
        -   Payment reference number
        -   Date of subscription
    -   The dashboard will provide administrators with the ability to:
        -   **Approve** a pending subscription.
        -   **Reject** a pending subscription.

## 3. Subscription Approval Workflow

-   **Approve Action**:
    -   When an administrator approves a subscription, the system will:
        -   Update the subscription's status from "pending" to "active" in the database.
        -   Set the `startDate` to the current date and calculate the `endDate` based on the subscription plan.
        -   The user will then gain access to the features associated with their subscribed plan.
-   **Reject Action**:
    -   When an administrator rejects a subscription, the system will:
        -   Update the subscription's status from "pending" to "rejected" in the database.
        -   The user will be notified of the rejection, and their access will remain restricted.

## 4. API Endpoints

The admin panel will be supported by a set of dedicated API endpoints:

-   `POST /api/admin/login`: Authenticates an admin and returns a JWT token.
-   `GET /api/admin/subscriptions/pending`: Retrieves a list of all subscriptions with a "pending" status.
-   `PUT /api/admin/subscriptions/:id/approve`: Approves a subscription and updates its status to "active."
-   `PUT /api/admin/subscriptions/:id/reject`: Rejects a subscription and updates its status to "rejected."