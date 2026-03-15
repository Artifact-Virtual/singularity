# Singularity ERP — API Reference

> Base URL: `https://erp.artifactvirtual.com/api`
> Authentication: Bearer JWT token (except auth endpoints)
> Interactive Docs: `https://erp.artifactvirtual.com/api/docs`

## Authentication

All protected endpoints require: `Authorization: Bearer <jwt_token>`

### POST /auth/register
Create a new user account.
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```
Returns: `{ user, token, refreshToken }`

### POST /auth/login
Authenticate and receive tokens.
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
Returns: `{ user, token, refreshToken }`
Rate limit: 5 requests/minute

### POST /auth/refresh
Refresh an expired access token.
```json
{ "refreshToken": "<refresh_token>" }
```
Returns: `{ token, refreshToken }`

### POST /auth/forgot-password
Request a password reset email.
```json
{ "email": "user@example.com" }
```

### POST /auth/reset-password
Reset password with token (1-hour expiry).
```json
{
  "token": "<reset_token>",
  "password": "newSecurePassword123"
}
```

## Contacts (CRM)

### GET /contacts
List all contacts. Supports query params: `?search=`, `?status=`, `?page=`, `?limit=`

### POST /contacts
Create a contact.
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "status": "LEAD"
}
```

### GET /contacts/:id
Get contact by ID.

### PUT /contacts/:id
Update contact.

### DELETE /contacts/:id
Delete contact.

## Deals (CRM Pipeline)

Pipeline stages: `LEAD → QUALIFIED → PROPOSAL → NEGOTIATION → CLOSED`

### GET /deals
List deals. Supports: `?stage=`, `?search=`, `?page=`, `?limit=`

### POST /deals
```json
{
  "name": "Enterprise License",
  "value": 50000,
  "stage": "LEAD",
  "probability": 20,
  "contactId": "<uuid>",
  "expectedCloseDate": "2026-06-01"
}
```

### PUT /deals/:id
Update deal (including stage transitions).

## Projects

### GET /projects
### POST /projects
```json
{
  "name": "Singularity v2.0",
  "description": "Next generation runtime",
  "status": "IN_PROGRESS",
  "startDate": "2026-03-01",
  "endDate": "2026-06-01"
}
```

## Invoices (Finance)

### GET /invoices
### POST /invoices
```json
{
  "contactId": "<uuid>",
  "amount": 5000,
  "currency": "USD",
  "status": "PENDING",
  "dueDate": "2026-04-01",
  "items": [
    { "description": "Monthly SaaS", "quantity": 1, "unitPrice": 5000 }
  ]
}
```

## Employees (HRM)

### GET /employees
### POST /employees
```json
{
  "name": "Developer One",
  "email": "dev@artifactvirtual.com",
  "departmentId": "<uuid>",
  "position": "Senior Engineer",
  "startDate": "2026-01-15"
}
```

## AI Chat (Singularity)

### POST /ai/chat
Send a message to the Singularity runtime.
```json
{
  "message": "What is the current system status?",
  "sessionId": "optional-session-id"
}
```
Returns:
```json
{
  "response": "⚡ All systems operational...",
  "sessionId": "http-erp-anon",
  "durationMs": 2985
}
```
Timeout: 300 seconds (LLM processing)

### GET /ai/health
Check Singularity connection.
Returns:
```json
{
  "status": "connected",
  "singularity": {
    "status": "ok",
    "runtime": "singularity",
    "uptime": 2078,
    "totalRequests": 3,
    "totalErrors": 0
  }
}
```

### GET /ai/sessions
List stored chat sessions (from localStorage on client).

## Admin

### GET /admin/users
List all users (admin only).

### PUT /admin/users/:id/role
Assign role to user.
```json
{ "roleId": "<uuid>" }
```

### GET /admin/roles
List all roles.

### POST /admin/roles
Create a role.
```json
{
  "name": "operator",
  "permissions": ["read:contacts", "write:deals", "read:analytics"]
}
```

## Health

### GET /health
```json
{
  "status": "ok",
  "timestamp": "2026-03-15T07:33:45.252Z"
}
```

## Error Responses

All errors follow:
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

Common status codes:
- `400` — Bad request / validation error
- `401` — Missing or invalid JWT
- `403` — Insufficient permissions
- `404` — Resource not found
- `429` — Rate limited
- `500` — Internal server error
