# System Architecture

**Version:** 1.0.0  
**Date:** 2026-02-02

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                   │
│                          (Nginx / Cloud LB)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CDN / Edge Cache                                │
│                          (CloudFlare / Fastly)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────────┐
│         FRONTEND (SPA)           │  │            API GATEWAY               │
│  ┌────────────────────────────┐  │  │  ┌────────────────────────────────┐  │
│  │       React + Vite         │  │  │  │    Rate Limiting + Auth        │  │
│  │     TypeScript + Zustand   │  │  │  │    Request Routing             │  │
│  │   TailwindCSS + Shadcn/ui  │  │  │  │    API Versioning              │  │
│  └────────────────────────────┘  │  │  └────────────────────────────────┘  │
└──────────────────────────────────┘  └──────────────────────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Core API  │ │   Auth      │ │  File       │ │   Background        │   │
│  │   (tRPC)    │ │   Service   │ │  Service    │ │   Workers (BullMQ)  │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────────┐
│   PostgreSQL    │    │       Redis         │    │        MinIO            │
│   (Primary DB)  │    │   (Cache/Sessions)  │    │    (Object Storage)     │
└─────────────────┘    └─────────────────────┘    └─────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Meilisearch   │
│   (Full-text)   │
└─────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Directory Structure

```
app/src/
├── core/                      # Framework core (DO NOT MODIFY)
│   ├── components/           # Base components (unstyled)
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── ...
│   ├── hooks/               # Core hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   └── useTheme.ts
│   ├── providers/           # Context providers
│   │   ├── ThemeProvider.tsx
│   │   ├── AuthProvider.tsx
│   │   └── ConfigProvider.tsx
│   ├── router/              # Routing setup
│   ├── api/                 # API client setup
│   └── types/               # Core type definitions
│
├── modules/                   # Feature modules (lazy-loaded)
│   ├── dashboard/
│   ├── development/
│   │   ├── projects/
│   │   ├── repositories/
│   │   ├── pipelines/
│   │   └── deployments/
│   ├── crm/
│   │   ├── contacts/
│   │   ├── deals/
│   │   ├── campaigns/
│   │   └── support/
│   ├── hrm/
│   │   ├── employees/
│   │   ├── recruitment/
│   │   ├── performance/
│   │   └── payroll/
│   ├── finance/
│   │   ├── ledger/
│   │   ├── receivables/
│   │   ├── payables/
│   │   └── reports/
│   ├── stakeholders/
│   │   ├── investors/
│   │   ├── board/
│   │   └── partners/
│   ├── infrastructure/
│   │   ├── nginx/
│   │   ├── servers/
│   │   ├── containers/
│   │   └── monitoring/
│   ├── security/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── audit/
│   │   └── compliance/
│   └── analytics/
│       ├── dashboards/
│       ├── reports/
│       └── kpis/
│
├── shared/                    # Shared utilities
│   ├── components/           # Shared UI components
│   ├── hooks/               # Shared hooks
│   ├── utils/               # Utility functions
│   ├── constants/           # App constants
│   └── types/               # Shared types
│
├── App.tsx                   # Root component
├── main.tsx                  # Entry point
└── vite-env.d.ts
```

### 2.2 Module Structure

Each module follows this structure:

```
modules/crm/
├── index.ts                  # Module exports
├── routes.tsx               # Module routes
├── api/                     # Module-specific API calls
│   ├── contacts.ts
│   └── deals.ts
├── components/              # Module components
│   ├── ContactCard.tsx
│   └── DealPipeline.tsx
├── hooks/                   # Module hooks
│   ├── useContacts.ts
│   └── useDeals.ts
├── stores/                  # Module state
│   └── crm.store.ts
├── types/                   # Module types
│   └── crm.types.ts
└── pages/                   # Module pages
    ├── ContactsPage.tsx
    ├── ContactDetailPage.tsx
    └── DealsPage.tsx
```

### 2.3 Theme Architecture

```
themes/
├── default/
│   ├── index.ts             # Theme entry
│   ├── tokens.css           # CSS variables
│   ├── components/          # Styled component variants
│   └── package.json
│
├── dark/
│   ├── index.ts
│   ├── tokens.css
│   ├── components/
│   └── package.json
│
└── corporate/
    ├── index.ts
    ├── tokens.css
    ├── components/
    └── package.json
```

**Theme Token Example (tokens.css):**
```css
:root {
  /* Colors */
  --color-primary: 220 90% 56%;
  --color-primary-foreground: 0 0% 100%;
  --color-secondary: 220 14% 96%;
  --color-background: 0 0% 100%;
  --color-foreground: 222 47% 11%;
  --color-muted: 220 14% 96%;
  --color-muted-foreground: 220 9% 46%;
  --color-accent: 220 14% 96%;
  --color-destructive: 0 84% 60%;
  --color-border: 220 13% 91%;
  --color-ring: 220 90% 56%;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

---

## 3. Backend Architecture

### 3.1 Service Structure

```
backend/
├── src/
│   ├── app.ts               # Application setup
│   ├── server.ts            # Server entry
│   │
│   ├── config/              # Configuration
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── redis.ts
│   │
│   ├── core/                # Core framework
│   │   ├── auth/
│   │   ├── database/
│   │   ├── cache/
│   │   ├── queue/
│   │   └── storage/
│   │
│   ├── modules/             # Feature modules
│   │   ├── development/
│   │   ├── crm/
│   │   ├── hrm/
│   │   ├── finance/
│   │   ├── stakeholders/
│   │   ├── infrastructure/
│   │   ├── security/
│   │   └── analytics/
│   │
│   ├── shared/              # Shared utilities
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── types/
│   │
│   └── workers/             # Background workers
│       ├── email.worker.ts
│       ├── report.worker.ts
│       └── sync.worker.ts
│
├── prisma/                  # Database schema
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
└── package.json
```

### 3.2 Module Structure

```
modules/crm/
├── index.ts                 # Module exports
├── crm.router.ts           # tRPC router
├── crm.service.ts          # Business logic
├── crm.repository.ts       # Data access
├── crm.types.ts            # Type definitions
├── crm.validation.ts       # Input validation
└── crm.constants.ts        # Module constants
```

### 3.3 API Design (tRPC)

```typescript
// Example: CRM Router
export const crmRouter = router({
  contacts: router({
    list: protectedProcedure
      .input(contactListSchema)
      .query(({ ctx, input }) => contactService.list(ctx, input)),
    
    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(({ ctx, input }) => contactService.get(ctx, input.id)),
    
    create: protectedProcedure
      .input(contactCreateSchema)
      .mutation(({ ctx, input }) => contactService.create(ctx, input)),
    
    update: protectedProcedure
      .input(contactUpdateSchema)
      .mutation(({ ctx, input }) => contactService.update(ctx, input)),
    
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ ctx, input }) => contactService.delete(ctx, input.id)),
  }),
  
  deals: router({
    // ... deal procedures
  }),
});
```

---

## 4. Database Schema (Simplified)

### 4.1 Core Tables

```sql
-- Users & Auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Organizations (Multi-tenant support)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_members (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  PRIMARY KEY (organization_id, user_id)
);
```

### 4.2 Module Tables (Examples)

```sql
-- CRM Module
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  job_title VARCHAR(255),
  source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  name VARCHAR(255) NOT NULL,
  value DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  stage VARCHAR(100) NOT NULL,
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HRM Module
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  employee_number VARCHAR(50),
  department_id UUID,
  job_title VARCHAR(255),
  hire_date DATE,
  employment_type VARCHAR(50),
  salary DECIMAL(15, 2),
  salary_currency VARCHAR(3) DEFAULT 'USD',
  manager_id UUID REFERENCES employees(id),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Module
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_number VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
  parent_id UUID REFERENCES accounts(id),
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  reference_number VARCHAR(100),
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Configuration Architecture

### 5.1 Environment Configuration

```
config/
├── environments/
│   ├── base.ts              # Base configuration
│   ├── development.ts       # Dev overrides
│   ├── staging.ts           # Staging overrides
│   └── production.ts        # Production overrides
│
├── features/
│   └── flags.ts             # Feature flags
│
└── index.ts                 # Config loader
```

**Base Configuration (base.ts):**
```typescript
export const baseConfig = {
  app: {
    name: 'Artifact Studio',
    version: '1.0.0',
    defaultLocale: 'en',
    supportedLocales: ['en', 'es', 'fr', 'de'],
  },
  api: {
    baseUrl: '/api',
    timeout: 30000,
    retries: 3,
  },
  auth: {
    sessionDuration: '7d',
    refreshThreshold: '1d',
    mfaRequired: false,
  },
  modules: {
    development: { enabled: true },
    crm: { enabled: true },
    hrm: { enabled: true },
    finance: { enabled: true },
    stakeholders: { enabled: true },
    infrastructure: { enabled: true },
    security: { enabled: true },
    analytics: { enabled: true },
  },
  features: {
    darkMode: true,
    notifications: true,
    aiAssistant: false,
  },
};
```

### 5.2 Feature Flags

```typescript
export const featureFlags = {
  // Module features
  crm: {
    emailIntegration: { enabled: true, rollout: 100 },
    aiLeadScoring: { enabled: false, rollout: 0 },
    advancedReporting: { enabled: true, rollout: 100 },
  },
  
  // Global features
  global: {
    maintenanceMode: { enabled: false },
    betaFeatures: { enabled: false, rollout: 10 },
    newDashboard: { enabled: true, rollout: 50 },
  },
};
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────▶│  API Gateway │────▶│  Auth Service│
└──────────┘     └──────────────┘     └──────────────┘
     │                  │                     │
     │  1. Login        │                     │
     │  Request         │                     │
     │ ─────────────────▶                     │
     │                  │   2. Validate       │
     │                  │   Credentials       │
     │                  │ ────────────────────▶
     │                  │                     │
     │                  │   3. Generate       │
     │                  │   JWT Tokens        │
     │                  │ ◀────────────────────
     │  4. Return       │                     │
     │  Tokens          │                     │
     │ ◀─────────────────                     │
     │                  │                     │
     │  5. API Request  │                     │
     │  + Access Token  │                     │
     │ ─────────────────▶                     │
     │                  │   6. Verify Token   │
     │                  │ ────────────────────▶
     │                  │                     │
     │                  │   7. Token Valid    │
     │                  │ ◀────────────────────
     │  8. Response     │                     │
     │ ◀─────────────────                     │
```

### 6.2 Authorization (RBAC)

```typescript
// Permission structure
type Permission = {
  resource: string;  // 'contacts', 'deals', 'employees', etc.
  action: string;    // 'create', 'read', 'update', 'delete', 'manage'
  scope?: string;    // 'own', 'team', 'organization', 'all'
};

// Role example
const salesRole = {
  name: 'Sales Representative',
  permissions: [
    { resource: 'contacts', action: 'read', scope: 'organization' },
    { resource: 'contacts', action: 'create', scope: 'organization' },
    { resource: 'contacts', action: 'update', scope: 'own' },
    { resource: 'deals', action: 'read', scope: 'team' },
    { resource: 'deals', action: 'create', scope: 'team' },
    { resource: 'deals', action: 'update', scope: 'own' },
  ],
};
```

---

## 7. Deployment Architecture

### 7.1 Container Architecture

```yaml
# docker-compose.yml (simplified)
services:
  frontend:
    build: ./app
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=${API_URL}
    depends_on:
      - api

  api:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

  meilisearch:
    image: getmeili/meilisearch:latest
    volumes:
      - meilisearch_data:/meili_data
```

### 7.2 Nginx Configuration

See `architecture/nginx/` for complete Nginx configurations.

---

## 8. Scalability Considerations

### 8.1 Horizontal Scaling

- Frontend: Static files via CDN
- API: Multiple instances behind load balancer
- Database: Read replicas for queries
- Cache: Redis Cluster for high availability
- Background Jobs: Multiple worker processes

### 8.2 Performance Optimization

- Database: Proper indexing, query optimization
- API: Response caching, pagination
- Frontend: Code splitting, lazy loading
- Assets: CDN delivery, image optimization

---

**Document Owner:** Architecture Team  
**Review Cycle:** Quarterly  
**Last Updated:** 2026-02-02
