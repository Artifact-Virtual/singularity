/**
 * Application Configuration Types
 * 
 * These types define the shape of all configuration throughout the application.
 * Configuration is loaded from environment-specific files and injected at runtime.
 */

export type ModuleConfig = {
  enabled: boolean;
  permissions?: string[];
};

export type FeatureFlagConfig = {
  enabled: boolean;
  rollout?: number; // Percentage 0-100
  metadata?: Record<string, unknown>;
};

export type AppConfig = {
  // Application metadata
  app: {
    name: string;
    version: string;
    defaultLocale: string;
    supportedLocales: string[];
    environment: 'development' | 'staging' | 'production';
  };

  // API configuration
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };

  // Authentication configuration
  auth: {
    sessionDuration: string;
    refreshThreshold: string;
    mfaRequired: boolean;
    providers: string[];
  };

  // Module enablement
  modules: {
    dashboard: ModuleConfig;
    development: ModuleConfig;
    crm: ModuleConfig;
    hrm: ModuleConfig;
    finance: ModuleConfig;
    stakeholders: ModuleConfig;
    infrastructure: ModuleConfig;
    security: ModuleConfig;
    analytics: ModuleConfig;
  };

  // Feature flags
  features: {
    global: {
      maintenanceMode: FeatureFlagConfig;
      betaFeatures: FeatureFlagConfig;
      darkMode: FeatureFlagConfig;
      notifications: FeatureFlagConfig;
      aiAssistant: FeatureFlagConfig;
    };
    crm: {
      emailIntegration: FeatureFlagConfig;
      aiLeadScoring: FeatureFlagConfig;
      advancedReporting: FeatureFlagConfig;
    };
    hrm: {
      selfService: FeatureFlagConfig;
      performanceReviews: FeatureFlagConfig;
    };
    finance: {
      multiCurrency: FeatureFlagConfig;
      automatedReconciliation: FeatureFlagConfig;
    };
  };

  // Theme configuration
  theme: {
    default: string;
    available: string[];
  };

  // Integration endpoints
  integrations: {
    github?: {
      enabled: boolean;
      clientId?: string;
    };
    gitlab?: {
      enabled: boolean;
      url?: string;
    };
    slack?: {
      enabled: boolean;
    };
  };
};

export type Environment = 'development' | 'staging' | 'production';
