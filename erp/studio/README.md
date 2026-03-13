# Artifact Virtual Studio

## Enterprise Management Platform

A comprehensive enterprise management SPA for Artifact Virtual operations.

---

## Directory Structure

```
studio/
├── docs/                    # Requirements, specs, user guides
├── design/                  # UI/UX design system, wireframes
├── architecture/            # Technical architecture documents
├── app/                     # Application source code
│   ├── src/
│   │   ├── core/           # Core framework (theme/config agnostic)
│   │   ├── modules/        # Feature modules
│   │   ├── shared/         # Shared components/utilities
│   │   └── main.tsx        # Entry point
│   ├── public/
│   └── package.json
├── config/                  # Environment & app configuration
│   ├── environments/       # dev, staging, prod configs
│   └── features/           # Feature flags
└── themes/                  # External theme packages
    ├── default/
    └── dark/
```

---

## Suites

1. **Development Management** - Projects, repos, CI/CD, deployments
2. **CRM** - Customer management, pipelines, communications
3. **HRM** - Employees, recruitment, performance, payroll
4. **Finance & Accounting** - Ledger, invoicing, budgets, reports
5. **Stakeholder Management** - Investors, board, communications
6. **Infrastructure** - Nginx, servers, monitoring, logs
7. **Security** - Access control, audit, compliance
8. **Analytics** - Dashboards, KPIs, business intelligence

---

## Design Principles

- **Theme Abstraction**: Themes are external packages, not hardcoded
- **Config Separation**: Environment configs isolated from core
- **Module Independence**: Each suite is a self-contained module
- **Core Stability**: Core framework never modified for customization

---

## Quick Start

```bash
cd app
npm install
npm run dev
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-02
