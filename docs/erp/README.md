# Singularity ERP — Artifact Virtual Enterprise Platform

> The native AI-powered enterprise resource platform for Artifact Virtual.
> Built for Singularity. Runs autonomously.

## Overview

Singularity ERP is the operational backbone of Artifact Virtual — a full-stack enterprise platform with native AI integration via the Singularity runtime. Unlike traditional ERPs that bolt on AI as an afterthought, this was designed from the ground up as an **AI-native autonomous platform**.

The Singularity Chat panel connects directly to the Singularity runtime API, giving operators real-time access to the full autonomous enterprise system from within the ERP dashboard.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  erp.artifactvirtual.com                        │
│  ┌───────────────────────────────────────────┐  │
│  │  Studio (React 18 + Vite + Radix UI)      │  │
│  │  Port 8750 (nginx)                        │  │
│  │  14 Modules · Dark Theme · Responsive     │  │
│  └──────────────────┬────────────────────────┘  │
│                     │ /api/*                     │
│  ┌──────────────────▼────────────────────────┐  │
│  │  Backend (Fastify + Prisma + PostgreSQL)   │  │
│  │  Port 3100 · JWT Auth · Rate Limited       │  │
│  │  21 Route Modules · Swagger Docs           │  │
│  └──────────────────┬────────────────────────┘  │
│                     │ /api/ai/*                   │
│  ┌──────────────────▼────────────────────────┐  │
│  │  Singularity Runtime                       │  │
│  │  Port 8450 · API Key Auth                  │  │
│  │  Full Agent Loop · 28 Tools · C-Suite      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 7, TypeScript, Tailwind CSS, Radix UI, Zustand, TanStack Query |
| Backend | Fastify 5, Prisma ORM, PostgreSQL 14, JWT (bcrypt + refresh tokens) |
| AI Runtime | Singularity (Python 3.11+, asyncio, Claude claude-opus-4.6) |
| Hosting | nginx reverse proxy, systemd, Cloudflare tunnel |

## Modules (14)

| Module | Route | Description |
|--------|-------|-------------|
| **Dashboard** | `/dashboard` | KPI cards, activity feed, quick actions, system health |
| **Singularity AI** | `/ai` | Chat panel — direct connection to Singularity runtime |
| **CRM** | `/crm/*` | Contacts, Deals (5-stage Kanban), Campaigns, Support tickets |
| **HRM** | `/hrm/*` | Employees, Departments, Attendance, Leave, Payroll |
| **Finance** | `/finance/*` | Invoices, Expenses, Revenue tracking, Budget management |
| **Development** | `/dev/*` | Projects, Sprints, Issues, Code review, CI/CD pipelines |
| **Analytics** | `/analytics/*` | Business intelligence, Custom reports, Data visualization |
| **Stakeholders** | `/stakeholders/*` | Investors, Partners, Board members, Communications |
| **Infrastructure** | `/infrastructure/*` | Servers, Services, Deployments, Monitoring |
| **Security** | `/security/*` | Access control, Audit logs, Compliance, Threat monitoring |
| **Integrations** | `/integrations/*` | Third-party connectors, Webhooks, API management |
| **Workflows** | `/workflows/*` | Automation rules, Task pipelines, Approval chains |
| **Admin** | `/admin/*` | User management, Roles, System settings, Audit trail |
| **Settings** | — | Theme, Preferences, Profile (via AppLayout) |

## API Endpoints

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login (returns JWT + refresh token)
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset with token

### Core Resources
- `GET/POST /api/contacts` — Contact management
- `GET/POST /api/deals` — Deal pipeline
- `GET/POST /api/projects` — Project tracking
- `GET/POST /api/invoices` — Invoice management
- `GET/POST /api/employees` — Employee records
- `GET/POST /api/activities` — Activity feed
- `GET/POST /api/campaigns` — Marketing campaigns
- `GET/POST /api/support` — Support tickets
- `GET/POST /api/departments` — Department structure
- `GET/POST /api/stakeholders` — Stakeholder relations
- `GET/POST /api/workflows` — Workflow automation

### AI Integration
- `POST /api/ai/chat` — Send message to Singularity (proxied to :8450)
- `GET /api/ai/health` — Check Singularity connection status
- `GET /api/ai/sessions` — List chat sessions

### System
- `GET /api/health` — Backend health check
- `GET /api/docs` — Swagger/OpenAPI documentation (interactive)
- `GET/POST /api/admin/users` — User administration
- `GET/POST /api/admin/roles` — Role management

## Database Schema

8 core models with full relations:

```
User ──┬── Role (RBAC)
       ├── Contact ── Deal (5-stage pipeline)
       ├── Employee ── Department
       ├── Project
       ├── Invoice
       └── Activity (audit trail)
```

All models use UUIDs, timestamps (createdAt/updatedAt), and proper indexes.

## Security

- **Authentication:** JWT with bcrypt (10 salt rounds), refresh token rotation
- **Authorization:** Role-based access control (admin, manager, user)
- **Rate Limiting:** Global 100 req/min, Login 5 req/min
- **CORS:** Configurable origin whitelist
- **Secrets:** Environment-only (no hardcoded defaults — crashes on missing JWT_SECRET)
- **API Docs:** Password-protected Swagger UI
- **CodeQL:** GitHub Action scanning on every push (security-extended + security-and-quality)

## Configuration

### Environment Variables (backend/.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/artifact_erp

# Authentication
JWT_SECRET=<random-64-char>          # REQUIRED — no default
JWT_REFRESH_SECRET=<random-64-char>  # REQUIRED — no default

# Singularity Integration
SINGULARITY_API_KEY=<api-key>        # From singularity/.env
SINGULARITY_API_URL=http://localhost:8450

# Server
PORT=3100
NODE_ENV=production
```

## Deployment

### Services
- `artifact-erp.service` — Fastify backend (systemd --user)
- nginx at port 8750 — serves frontend + proxies API
- Cloudflare tunnel — `erp.artifactvirtual.com`

### Build & Deploy
```bash
# Frontend
cd studio/app && npm run build
cp -r dist/* /path/to/deploy/

# Backend
cd backend && npx tsx src/index.ts

# Or via systemd
systemctl --user restart artifact-erp
```

## Singularity Chat Integration

The AI module provides a direct chat interface to the Singularity runtime:

1. **Frontend** (`modules/ai/components/ChatPanel.tsx`) — Full chat UI with session management, message history, connection status indicator
2. **Service** (`modules/ai/services/chat.ts`) — API client with localStorage session persistence
3. **Backend Proxy** (`modules/ai/chat.routes.ts`) — Authenticated proxy to Singularity HTTP API
4. **Runtime** — Singularity processes messages through its full agent loop (28 tools, C-Suite delegation, memory)

Messages flow: `ChatPanel → /api/ai/chat → localhost:8450/api/v1/chat → Singularity Agent Loop → Response`

## URLs

| URL | Description |
|-----|-------------|
| https://erp.artifactvirtual.com | Production ERP |
| https://erp.artifactvirtual.com/api/docs | Swagger API Documentation |
| https://erp.artifactvirtual.com/api/health | Health Check |
| https://erp.artifactvirtual.com/api/ai/health | Singularity Connection Status |

## File Structure

```
singularity/erp/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Fastify app setup
│   │   ├── config/env.ts         # Environment config
│   │   ├── middleware/auth.ts     # JWT verification
│   │   └── modules/
│   │       ├── auth/             # Register, Login, Refresh, Reset
│   │       ├── ai/               # Singularity chat proxy
│   │       ├── admin/            # User & Role management
│   │       ├── contact/          # CRM contacts
│   │       ├── deal/             # Deal pipeline
│   │       ├── project/          # Project management
│   │       ├── invoice/          # Financial invoices
│   │       ├── employee/         # HRM employees
│   │       ├── department/       # Organization structure
│   │       ├── activity/         # Activity/audit feed
│   │       ├── campaign/         # Marketing campaigns
│   │       ├── support/          # Support tickets
│   │       ├── stakeholder/      # Stakeholder management
│   │       └── workflow/         # Workflow automation
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (8 models)
│   ├── package.json
│   └── .env
├── studio/app/
│   ├── src/
│   │   ├── core/                 # Router, providers, API client
│   │   ├── modules/              # 14 feature modules
│   │   ├── shared/               # Layouts, components, utils
│   │   └── styles/               # Tailwind + custom CSS
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
└── docker-compose.yml            # PostgreSQL + Redis
```
