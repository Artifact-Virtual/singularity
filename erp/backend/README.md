<div align="center">

# AV-ERP Backend API

**Enterprise Resource Planning Backend**

[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)](./package.json)
[![Status](https://img.shields.io/badge/status-production--ready-success?style=for-the-badge)](#)
[![Node](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Fastify](https://img.shields.io/badge/Fastify-4.0+-000000?style=flat-square&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## 📋 Overview

Full-featured ERP backend API providing authentication, CRM, HRM, Finance, and Development management capabilities.

| Feature | Status | Endpoints |
|---------|--------|-----------|
| Authentication | ✅ Complete | 6 |
| Role Management | ✅ Complete | 5 |
| CRM - Contacts | ✅ Complete | 5 |
| CRM - Deals | ✅ Complete | 6 |
| HRM - Employees | ✅ Complete | 7 |
| Finance - Invoices | ✅ Complete | 6 |
| Development - Projects | ✅ Complete | 7 |
| Activities | ✅ Complete | 6 |
| **Total** | **100%** | **48** |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND API                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Fastify Server                        │    │
│  │  • Rate Limiting (100 req/min)                          │    │
│  │  • CORS enabled                                          │    │
│  │  • JWT Authentication                                    │    │
│  │  • OpenAPI/Swagger Docs                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────┬───────────┬───────────┬───────────┬──────────┐  │
│  │   Auth    │    CRM    │    HRM    │  Finance  │   Dev    │  │
│  │  Module   │  Module   │  Module   │  Module   │  Module  │  │
│  └───────────┴───────────┴───────────┴───────────┴──────────┘  │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Prisma ORM                            │    │
│  │  • 8 Database Models                                     │    │
│  │  • Migrations                                            │    │
│  │  • Type-safe queries                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Database Models

| Model | Fields | Relations |
|-------|--------|-----------|
| **User** | id, email, password, firstName, lastName, roleId, isActive | Role, Activity |
| **Role** | id, name, description, permissions[] | User |
| **Contact** | id, firstName, lastName, email, phone, company, status, tags[] | Deal, Activity |
| **Deal** | id, title, value, stage, probability, contactId | Contact, Activity |
| **Employee** | id, firstName, lastName, email, department, position, salary | Project |
| **Project** | id, name, status, priority, progress, budget, employeeId | Employee, Activity |
| **Invoice** | id, invoiceNumber, amount, status, items[], clientName | — |
| **Activity** | id, type, subject, status, userId, contactId, dealId, projectId | User, Contact, Deal, Project |

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | User registration | No |
| POST | `/login` | User login | No |
| POST | `/refresh` | Refresh access token | No |
| GET | `/me` | Get current user | Yes |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password | No |

### Roles (`/api/auth/roles`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/roles` | List all roles | Yes |
| GET | `/roles/:id` | Get role | Yes |
| POST | `/roles` | Create role | Yes |
| PUT | `/roles/:id` | Update role | Yes |
| DELETE | `/roles/:id` | Delete role | Yes |

### CRM - Contacts (`/api/crm/contacts`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/contacts` | List contacts (search/filter) | Yes |
| GET | `/contacts/:id` | Get contact | Yes |
| POST | `/contacts` | Create contact | Yes |
| PUT | `/contacts/:id` | Update contact | Yes |
| DELETE | `/contacts/:id` | Delete contact | Yes |

### CRM - Deals (`/api/crm/deals`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/deals` | List deals | Yes |
| GET | `/deals/pipeline` | Get pipeline stats | Yes |
| GET | `/deals/:id` | Get deal | Yes |
| POST | `/deals` | Create deal | Yes |
| PUT | `/deals/:id` | Update deal | Yes |
| DELETE | `/deals/:id` | Delete deal | Yes |

### HRM - Employees (`/api/hrm/employees`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/employees` | List employees | Yes |
| GET | `/employees/by-department` | Group by department | Yes |
| GET | `/employees/:id` | Get employee | Yes |
| POST | `/employees` | Create employee | Yes |
| PUT | `/employees/:id` | Update employee | Yes |
| PATCH | `/employees/:id/status` | Update status | Yes |
| DELETE | `/employees/:id` | Delete employee | Yes |

### Development - Projects (`/api/development/projects`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/projects` | List projects | Yes |
| GET | `/projects/:id` | Get project | Yes |
| POST | `/projects` | Create project | Yes |
| PUT | `/projects/:id` | Update project | Yes |
| PATCH | `/projects/:id/status` | Update status | Yes |
| PATCH | `/projects/:id/progress` | Update progress | Yes |
| DELETE | `/projects/:id` | Delete project | Yes |

### Finance - Invoices (`/api/finance/invoices`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/invoices` | List invoices | Yes |
| GET | `/invoices/:id` | Get invoice | Yes |
| POST | `/invoices` | Create invoice | Yes |
| PUT | `/invoices/:id` | Update invoice | Yes |
| POST | `/invoices/:id/payment` | Record payment | Yes |
| DELETE | `/invoices/:id` | Delete invoice | Yes |

### Activities (`/api/activities`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/activities` | List activities | Yes |
| GET | `/activities/:id` | Get activity | Yes |
| POST | `/activities` | Create activity | Yes |
| PUT | `/activities/:id` | Update activity | Yes |
| PATCH | `/activities/:id/complete` | Mark complete | Yes |
| DELETE | `/activities/:id` | Delete activity | Yes |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure DATABASE_URL in .env
# DATABASE_URL="postgresql://user:password@localhost:5432/averp"

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Docker Setup

```bash
# Start with Docker Compose
docker-compose up -d

# Server runs on http://localhost:3000
# Docs at http://localhost:3000/docs
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API.md](./API.md) | Complete API reference |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guides |
| [SECURITY.md](./SECURITY.md) | Security documentation |
| [QUICKSTART.md](./QUICKSTART.md) | Getting started |

---

## 🔒 Security

- JWT authentication with access + refresh tokens
- Password hashing with bcrypt
- Rate limiting (100 requests/minute)
- CORS configuration
- Input validation

---

<div align="center">

**Version 1.0.0** | **© 2026 Artifact Virtual**

</div>
