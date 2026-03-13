import type { AppConfig } from './types';

/**
 * Base configuration shared across all environments.
 * Environment-specific configs extend and override these values.
 */
export const baseConfig: Omit<AppConfig, 'app'> & { app: Omit<AppConfig['app'], 'environment'> } = {
  app: {
    name: 'Singularity',
    version: '1.0.0',
    defaultLocale: 'en',
    supportedLocales: ['en', 'es', 'fr', 'de', 'ur'],
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
    providers: ['email', 'google', 'github'],
  },

  modules: {
    dashboard: { enabled: true },
    development: { enabled: true, permissions: ['development:access'] },
    crm: { enabled: true, permissions: ['crm:access'] },
    hrm: { enabled: true, permissions: ['hrm:access'] },
    finance: { enabled: true, permissions: ['finance:access'] },
    stakeholders: { enabled: true, permissions: ['stakeholders:access'] },
    infrastructure: { enabled: true, permissions: ['infrastructure:access'] },
    security: { enabled: true, permissions: ['security:access'] },
    analytics: { enabled: true, permissions: ['analytics:access'] },
  },

  features: {
    global: {
      maintenanceMode: { enabled: false },
      betaFeatures: { enabled: false, rollout: 10 },
      darkMode: { enabled: true, rollout: 100 },
      notifications: { enabled: true, rollout: 100 },
      aiAssistant: { enabled: false, rollout: 0 },
    },
    crm: {
      emailIntegration: { enabled: true, rollout: 100 },
      aiLeadScoring: { enabled: false, rollout: 0 },
      advancedReporting: { enabled: true, rollout: 100 },
    },
    hrm: {
      selfService: { enabled: true, rollout: 100 },
      performanceReviews: { enabled: true, rollout: 100 },
    },
    finance: {
      multiCurrency: { enabled: true, rollout: 100 },
      automatedReconciliation: { enabled: false, rollout: 0 },
    },
  },

  theme: {
    default: 'system',
    available: ['light', 'dark', 'system'],
  },

  integrations: {
    github: { enabled: true },
    gitlab: { enabled: false },
    slack: { enabled: true },
  },
};
