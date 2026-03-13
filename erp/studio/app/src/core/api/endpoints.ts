/**
 * API Endpoint Constants
 * Central location for all API endpoints
 * Updated to match backend routes (2026-02-02)
 */

export const API_ENDPOINTS = {
  // Authentication - /api/auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Roles - /api/auth/roles
  ROLES: {
    LIST: '/auth/roles',
    GET: (id: string) => `/auth/roles/${id}`,
    CREATE: '/auth/roles',
    UPDATE: (id: string) => `/auth/roles/${id}`,
    DELETE: (id: string) => `/auth/roles/${id}`,
  },

  // CRM Contacts - /api/crm/contacts
  CONTACTS: {
    LIST: '/crm/contacts',
    GET: (id: string) => `/crm/contacts/${id}`,
    CREATE: '/crm/contacts',
    UPDATE: (id: string) => `/crm/contacts/${id}`,
    DELETE: (id: string) => `/crm/contacts/${id}`,
  },

  // CRM Deals - /api/crm/deals
  DEALS: {
    LIST: '/crm/deals',
    GET: (id: string) => `/crm/deals/${id}`,
    CREATE: '/crm/deals',
    UPDATE: (id: string) => `/crm/deals/${id}`,
    DELETE: (id: string) => `/crm/deals/${id}`,
    PIPELINE: '/crm/deals/pipeline',
  },

  // HRM Employees - /api/hrm/employees
  EMPLOYEES: {
    LIST: '/hrm/employees',
    GET: (id: string) => `/hrm/employees/${id}`,
    CREATE: '/hrm/employees',
    UPDATE: (id: string) => `/hrm/employees/${id}`,
    DELETE: (id: string) => `/hrm/employees/${id}`,
    STATUS: (id: string) => `/hrm/employees/${id}/status`,
    BY_DEPARTMENT: '/hrm/employees/by-department',
  },

  // Development Projects - /api/development/projects
  PROJECTS: {
    LIST: '/development/projects',
    GET: (id: string) => `/development/projects/${id}`,
    CREATE: '/development/projects',
    UPDATE: (id: string) => `/development/projects/${id}`,
    DELETE: (id: string) => `/development/projects/${id}`,
    STATUS: (id: string) => `/development/projects/${id}/status`,
    PROGRESS: (id: string) => `/development/projects/${id}/progress`,
  },

  // Finance Invoices - /api/finance/invoices
  INVOICES: {
    LIST: '/finance/invoices',
    GET: (id: string) => `/finance/invoices/${id}`,
    CREATE: '/finance/invoices',
    UPDATE: (id: string) => `/finance/invoices/${id}`,
    DELETE: (id: string) => `/finance/invoices/${id}`,
    PAYMENT: (id: string) => `/finance/invoices/${id}/payment`,
    PDF: (id: string) => `/finance/invoices/${id}/pdf`,
  },

  // Activities - /api/activities
  ACTIVITIES: {
    LIST: '/activities',
    GET: (id: string) => `/activities/${id}`,
    CREATE: '/activities',
    UPDATE: (id: string) => `/activities/${id}`,
    DELETE: (id: string) => `/activities/${id}`,
    COMPLETE: (id: string) => `/activities/${id}/complete`,
  },

  // Health Check
  HEALTH: '/health',

  // Admin - /api/admin
  ADMIN: {
    USERS: {
      LIST: '/admin/users',
      GET: (id: string) => `/admin/users/${id}`,
      CREATE: '/admin/users',
      UPDATE: (id: string) => `/admin/users/${id}`,
      DELETE: (id: string) => `/admin/users/${id}`,
    },
    ROLES: {
      LIST: '/admin/roles',
    },
  },

  // CRM Campaigns - /api/crm/campaigns
  CAMPAIGNS: {
    LIST: '/crm/campaigns',
    GET: (id: string) => `/crm/campaigns/${id}`,
    CREATE: '/crm/campaigns',
    UPDATE: (id: string) => `/crm/campaigns/${id}`,
    DELETE: (id: string) => `/crm/campaigns/${id}`,
  },

  // CRM Tickets - /api/crm/tickets
  TICKETS: {
    LIST: '/crm/tickets',
    GET: (id: string) => `/crm/tickets/${id}`,
    CREATE: '/crm/tickets',
    UPDATE: (id: string) => `/crm/tickets/${id}`,
    DELETE: (id: string) => `/crm/tickets/${id}`,
  },

  // HRM Job Postings - /api/hrm/jobs
  JOBS: {
    LIST: '/hrm/jobs',
    GET: (id: string) => `/hrm/jobs/${id}`,
    CREATE: '/hrm/jobs',
    UPDATE: (id: string) => `/hrm/jobs/${id}`,
    DELETE: (id: string) => `/hrm/jobs/${id}`,
  },

  // HRM Applicants - /api/hrm/applicants
  APPLICANTS: {
    LIST: '/hrm/applicants',
    CREATE: '/hrm/applicants',
    UPDATE: (id: string) => `/hrm/applicants/${id}`,
    DELETE: (id: string) => `/hrm/applicants/${id}`,
  },

  // HRM Performance Reviews - /api/hrm/reviews
  REVIEWS: {
    LIST: '/hrm/reviews',
    CREATE: '/hrm/reviews',
    UPDATE: (id: string) => `/hrm/reviews/${id}`,
    DELETE: (id: string) => `/hrm/reviews/${id}`,
  },

  // HRM Goals - /api/hrm/goals
  GOALS: {
    LIST: '/hrm/goals',
    CREATE: '/hrm/goals',
    UPDATE: (id: string) => `/hrm/goals/${id}`,
    DELETE: (id: string) => `/hrm/goals/${id}`,
  },

  // HRM Payroll - /api/hrm/payroll
  PAYROLL: {
    LIST: '/hrm/payroll',
    CREATE: '/hrm/payroll',
    UPDATE: (id: string) => `/hrm/payroll/${id}`,
    DELETE: (id: string) => `/hrm/payroll/${id}`,
  },

  // Finance Ledger Accounts - /api/finance/accounts
  LEDGER_ACCOUNTS: {
    LIST: '/finance/accounts',
    CREATE: '/finance/accounts',
    UPDATE: (id: string) => `/finance/accounts/${id}`,
    DELETE: (id: string) => `/finance/accounts/${id}`,
  },

  // Finance Journal Entries - /api/finance/journal
  JOURNAL: {
    LIST: '/finance/journal',
    CREATE: '/finance/journal',
    DELETE: (id: string) => `/finance/journal/${id}`,
  },

  // Finance Bills - /api/finance/bills
  BILLS: {
    LIST: '/finance/bills',
    CREATE: '/finance/bills',
    UPDATE: (id: string) => `/finance/bills/${id}`,
    DELETE: (id: string) => `/finance/bills/${id}`,
  },

  // Development Pipelines - /api/development/pipelines
  PIPELINES: {
    LIST: '/development/pipelines',
    CREATE: '/development/pipelines',
    UPDATE: (id: string) => `/development/pipelines/${id}`,
    DELETE: (id: string) => `/development/pipelines/${id}`,
  },

  // Development Deployments - /api/development/deployments
  DEPLOYMENTS: {
    LIST: '/development/deployments',
    CREATE: '/development/deployments',
    UPDATE: (id: string) => `/development/deployments/${id}`,
    DELETE: (id: string) => `/development/deployments/${id}`,
  },

  // Stakeholders - /api/stakeholders
  STAKEHOLDERS: {
    LIST: '/stakeholders',
    GET: (id: string) => `/stakeholders/${id}`,
    CREATE: '/stakeholders',
    UPDATE: (id: string) => `/stakeholders/${id}`,
    DELETE: (id: string) => `/stakeholders/${id}`,
  },

  // Workflows - /api/workflows
  WORKFLOWS: {
    LIST: '/workflows',
    GET: (id: string) => `/workflows/${id}`,
    CREATE: '/workflows',
    UPDATE: (id: string) => `/workflows/${id}`,
    DELETE: (id: string) => `/workflows/${id}`,
  },
};
