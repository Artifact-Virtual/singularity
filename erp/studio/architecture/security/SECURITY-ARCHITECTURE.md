# Security Architecture

**Module:** Security Suite  
**Version:** 1.0.0  
**Date:** 2026-02-02

---

## 1. Authentication

### 1.1 Supported Methods

- **Email/Password** - Traditional authentication
- **OAuth 2.0** - Google, GitHub, Microsoft
- **SAML 2.0** - Enterprise SSO
- **Magic Links** - Passwordless email
- **API Keys** - Machine-to-machine

### 1.2 Session Management

```typescript
type Session = {
  id: string;
  userId: string;
  organizationId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
};
```

**Session Configuration:**
- Duration: 7 days (configurable)
- Refresh: Sliding window (activity extends session)
- Concurrent: Max 5 sessions per user
- Revocation: Immediate on logout or admin action

### 1.3 Multi-Factor Authentication (MFA)

Supported methods:
- TOTP (Google Authenticator, Authy)
- SMS (backup only)
- Email codes
- Hardware keys (WebAuthn/FIDO2)

---

## 2. Authorization (RBAC)

### 2.1 Permission Model

```typescript
type Permission = {
  resource: string;   // e.g., 'contacts', 'invoices'
  action: string;     // 'create', 'read', 'update', 'delete', 'manage'
  scope?: 'own' | 'team' | 'organization' | 'all';
  conditions?: Record<string, unknown>;
};

type Role = {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;  // System roles cannot be deleted
};
```

### 2.2 Default Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| Owner | Organization owner | All permissions |
| Admin | Full administrative access | All except owner transfer |
| Manager | Department management | Team-level CRUD |
| Member | Standard user | Own records + read team |
| Viewer | Read-only access | Read only |
| Guest | Limited access | Specific resources only |

### 2.3 Permission Checking

```typescript
// Server-side check
async function checkPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const user = await getUser(userId);
  const roles = await getUserRoles(userId);
  
  for (const role of roles) {
    if (roleHasPermission(role, permission)) {
      if (permission.scope) {
        return checkScope(user, permission.scope, permission.resource);
      }
      return true;
    }
  }
  
  return false;
}
```

---

## 3. API Security

### 3.1 Authentication Headers

```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
X-Organization-ID: <org_id>
```

### 3.2 Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 10 | 1 minute |
| API (Authenticated) | 100 | 1 minute |
| API (Public) | 20 | 1 minute |
| Webhooks | 1000 | 1 minute |

### 3.3 Request Validation

- Input sanitization
- Schema validation (Zod)
- File upload restrictions
- SQL injection prevention
- XSS prevention

---

## 4. Data Protection

### 4.1 Encryption

**At Rest:**
- Database: AES-256 encryption
- File storage: Server-side encryption
- Backups: Encrypted with separate key

**In Transit:**
- TLS 1.3 required
- HSTS enabled
- Certificate pinning (mobile apps)

### 4.2 Sensitive Data Handling

| Data Type | Storage | Display | Logging |
|-----------|---------|---------|---------|
| Passwords | Argon2id hash | Never shown | Never logged |
| API Keys | Encrypted | Partial mask | Never logged |
| PII | Encrypted | As-is for authorized | Redacted |
| Financial | Encrypted | Authorized only | Audit only |

### 4.3 Data Retention

- Active data: Retained indefinitely
- Deleted records: 30-day soft delete
- Audit logs: 2 years
- Access logs: 90 days
- Session data: 30 days after expiry

---

## 5. Audit Logging

### 5.1 Logged Events

```typescript
type AuditEvent = {
  id: string;
  timestamp: Date;
  userId: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  metadata: {
    ipAddress: string;
    userAgent: string;
    requestId: string;
  };
};
```

### 5.2 Audit Categories

- Authentication events (login, logout, MFA)
- Authorization changes (role assignments)
- Data modifications (CRUD operations)
- Configuration changes
- Security events (failed logins, blocked requests)
- Administrative actions

---

## 6. Security Headers

```typescript
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; ...",
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
```

---

**Document Owner:** Security Team  
**Review Cycle:** Quarterly
