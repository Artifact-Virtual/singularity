# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication Endpoints

All authentication endpoints are under `/api/auth`

### Register User
**POST** `/api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "roleId": "optional-role-id"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roleId": "uuid",
    "isActive": true,
    "createdAt": "2026-02-02T14:00:00.000Z"
  },
  "token": "jwt-token",
  "refreshToken": "refresh-jwt-token"
}
```

### Login
**POST** `/api/auth/login`

Authenticate a user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": {
      "id": "uuid",
      "name": "user",
      "permissions": ["read:own"]
    }
  },
  "token": "jwt-token",
  "refreshToken": "refresh-jwt-token"
}
```

### Refresh Token
**POST** `/api/auth/refresh`

Get a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-jwt-token"
}
```

**Response:**
```json
{
  "token": "new-jwt-token",
  "refreshToken": "new-refresh-jwt-token"
}
```

### Get Current User
**GET** `/api/auth/me`

Get the currently authenticated user's information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": {
      "id": "uuid",
      "name": "user",
      "permissions": ["read:own"]
    }
  }
}
```

### Forgot Password
**POST** `/api/auth/forgot-password`

Request a password reset token.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

### Reset Password
**POST** `/api/auth/reset-password`

Reset password using a reset token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

## CRM Endpoints

All CRM endpoints require authentication.

### Contacts

#### List Contacts
**GET** `/api/crm/contacts?search=john&status=active&page=1&limit=10`

**Query Parameters:**
- `search` (optional): Search in firstName, lastName, email, company
- `status` (optional): Filter by status (active, inactive, lead)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "contacts": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

#### Get Contact
**GET** `/api/crm/contacts/:id`

#### Create Contact
**POST** `/api/crm/contacts`

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "position": "CEO",
  "status": "active",
  "source": "referral",
  "tags": ["vip", "enterprise"],
  "notes": "Important client"
}
```

#### Update Contact
**PUT** `/api/crm/contacts/:id`

#### Delete Contact
**DELETE** `/api/crm/contacts/:id`

### Deals

#### List Deals
**GET** `/api/crm/deals?stage=qualified&contactId=uuid&page=1&limit=10`

**Query Parameters:**
- `stage` (optional): Filter by stage (lead, qualified, proposal, negotiation, closed-won, closed-lost)
- `contactId` (optional): Filter by contact ID
- `page` (optional): Page number
- `limit` (optional): Items per page

#### Get Pipeline Stats
**GET** `/api/crm/deals/pipeline`

Returns deal count and total value by stage.

#### Get Deal
**GET** `/api/crm/deals/:id`

#### Create Deal
**POST** `/api/crm/deals`

**Request Body:**
```json
{
  "title": "Enterprise Deal",
  "description": "Large enterprise contract",
  "value": 100000,
  "currency": "USD",
  "stage": "qualified",
  "probability": 75,
  "expectedCloseDate": "2026-06-30",
  "contactId": "uuid"
}
```

#### Update Deal
**PUT** `/api/crm/deals/:id`

#### Delete Deal
**DELETE** `/api/crm/deals/:id`

## Development Endpoints

### Projects

#### List Projects
**GET** `/api/development/projects?status=active&priority=high&employeeId=uuid`

**Query Parameters:**
- `status` (optional): planning, active, on-hold, completed, cancelled
- `priority` (optional): low, medium, high, critical
- `employeeId` (optional): Filter by assigned employee
- `page`, `limit`: Pagination

#### Get Project
**GET** `/api/development/projects/:id`

#### Create Project
**POST** `/api/development/projects`

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "status": "planning",
  "priority": "high",
  "startDate": "2026-03-01",
  "endDate": "2026-06-30",
  "budget": 50000,
  "progress": 0,
  "employeeId": "uuid"
}
```

#### Update Project
**PUT** `/api/development/projects/:id`

#### Update Project Status
**PATCH** `/api/development/projects/:id/status`

**Request Body:**
```json
{
  "status": "active"
}
```

#### Update Project Progress
**PATCH** `/api/development/projects/:id/progress`

**Request Body:**
```json
{
  "progress": 45
}
```

#### Delete Project
**DELETE** `/api/development/projects/:id`

## Finance Endpoints

### Invoices

#### List Invoices
**GET** `/api/finance/invoices?status=paid&clientEmail=client@example.com`

**Query Parameters:**
- `status` (optional): draft, sent, paid, overdue, cancelled
- `clientEmail` (optional): Filter by client email
- `page`, `limit`: Pagination

#### Get Invoice
**GET** `/api/finance/invoices/:id`

#### Create Invoice
**POST** `/api/finance/invoices`

**Request Body:**
```json
{
  "title": "Consulting Services",
  "description": "Monthly consulting",
  "amount": 5000,
  "currency": "USD",
  "dueDate": "2026-03-15",
  "clientName": "Acme Corp",
  "clientEmail": "billing@acme.com",
  "clientAddress": "123 Main St",
  "items": [
    {
      "description": "Consulting hours",
      "quantity": 40,
      "rate": 125,
      "amount": 5000
    }
  ],
  "notes": "Payment due within 30 days"
}
```

#### Update Invoice
**PUT** `/api/finance/invoices/:id`

#### Update Invoice Status
**PATCH** `/api/finance/invoices/:id/status`

#### Record Payment
**POST** `/api/finance/invoices/:id/payment`

**Request Body:**
```json
{
  "paidAmount": 5000,
  "paymentMethod": "bank-transfer"
}
```

#### Generate PDF
**GET** `/api/finance/invoices/:id/pdf`

*(Placeholder - full implementation in Week 5-6)*

#### Delete Invoice
**DELETE** `/api/finance/invoices/:id`

## HRM Endpoints

### Employees

#### List Employees
**GET** `/api/hrm/employees?department=Engineering&status=active`

**Query Parameters:**
- `department` (optional): Filter by department
- `status` (optional): active, on-leave, terminated
- `page`, `limit`: Pagination

#### Get Employees by Department
**GET** `/api/hrm/employees/by-department`

Returns employee count grouped by department.

#### Get Employee
**GET** `/api/hrm/employees/:id`

#### Create Employee
**POST** `/api/hrm/employees`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phone": "+1234567890",
  "department": "Engineering",
  "position": "Senior Developer",
  "salary": 120000,
  "hireDate": "2026-01-15",
  "status": "active",
  "address": "123 Main St",
  "emergencyContact": "Jane Doe: +0987654321"
}
```

#### Update Employee
**PUT** `/api/hrm/employees/:id`

#### Update Employee Status
**PATCH** `/api/hrm/employees/:id/status`

**Request Body:**
```json
{
  "status": "on-leave"
}
```

#### Delete Employee
**DELETE** `/api/hrm/employees/:id`

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Account is inactive"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

*(To be implemented in Week 5-6)*

## Swagger Documentation

Interactive API documentation is available at `/docs` when the server is running.
