<div align="center">

# AV-ERP Studio

**Enterprise Management Frontend**

[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)](./app/package.json)
[![Status](https://img.shields.io/badge/status-operational-success?style=for-the-badge)](#)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4+-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-4.0+-000000?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![React Query](https://img.shields.io/badge/React_Query-5.0+-FF4154?style=flat-square&logo=reactquery&logoColor=white)](https://tanstack.com/query)

</div>

---

## 📊 Module Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STUDIO STATUS                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Overall:            🟢 OPERATIONAL                                          │
│  API Integration:    ████████████████████████████████████  100%  ✅         │
│  UI Components:      ████████████████████████████████████  100%  ✅         │
│  Authentication:     ████████████████████████████████████  100%  ✅         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Module | UI | API Integration | Status |
|--------|-----|-----------------|--------|
| 🔐 **Authentication** | ✅ | ✅ | 🟢 Complete |
| 👥 **CRM - Contacts** | ✅ | ✅ | 🟢 Complete |
| 💼 **CRM - Deals** | ✅ | ✅ | 🟢 Complete |
| 👤 **HRM - Employees** | ✅ | ✅ | 🟢 Complete |
| 💰 **Finance - Invoices** | ✅ | ✅ | 🟢 Complete |
| 🚀 **Development - Projects** | ✅ | ✅ | 🟢 Complete |
| 📊 **Analytics - Dashboard** | ✅ | ✅ | 🟢 Complete |
| 📝 **Activities** | ✅ | ✅ | 🟢 Complete |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        STUDIO FRONTEND                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      React 18                            │    │
│  │  • Module-based routing                                  │    │
│  │  • Lazy loading                                          │    │
│  │  • Dark/Light theme                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    State Management                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │  Zustand    │  │ React Query │  │   Context   │       │  │
│  │  │  (Global)   │  │ (Server)    │  │   (Auth)    │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    API Services                          │    │
│  │  • authService                                           │    │
│  │  • contactsService                                       │    │
│  │  • dealsService                                          │    │
│  │  • employeesService                                      │    │
│  │  • projectsService                                       │    │
│  │  • invoicesService                                       │    │
│  │  • activitiesService                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                        REST API calls                            │
│                              ▼                                   │
│                    Backend API :3000                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
studio/
├── app/
│   ├── src/
│   │   ├── core/
│   │   │   ├── api/           # API client & services
│   │   │   │   ├── client.ts      # HTTP client
│   │   │   │   ├── endpoints.ts   # API endpoints
│   │   │   │   └── services.ts    # Service functions
│   │   │   ├── providers/     # Context providers
│   │   │   │   ├── AuthProvider.tsx
│   │   │   │   └── ThemeProvider.tsx
│   │   │   ├── router/        # Routing config
│   │   │   └── services/      # Data store
│   │   │       └── dataStore.ts
│   │   ├── modules/           # Feature modules
│   │   │   ├── auth/
│   │   │   ├── crm/
│   │   │   ├── hrm/
│   │   │   ├── finance/
│   │   │   ├── development/
│   │   │   ├── analytics/
│   │   │   └── dashboard/
│   │   ├── shared/            # Shared components
│   │   └── styles/            # Global styles
│   ├── package.json
│   └── vite.config.ts
└── QUICK_STATUS.md
```

---

## 🚀 Quick Start

```bash
cd studio/app
npm install
npm run dev
# Open http://localhost:5173
```

---

## 🔌 API Configuration

The frontend connects to the backend API at `http://localhost:3000/api`.

Configure via environment variable:
```bash
VITE_API_URL=http://localhost:3000/api
```

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `core/api/client.ts` | HTTP client with JWT handling |
| `core/api/services.ts` | API service functions |
| `core/api/endpoints.ts` | API endpoint constants |
| `core/providers/AuthProvider.tsx` | Authentication context |
| `core/services/dataStore.ts` | Zustand data store |

---

<div align="center">

**Version 1.0.0** | **Last Updated: 2026-02-02**

</div>
