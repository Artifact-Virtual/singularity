import type { AppConfig } from '../types';
import { baseConfig } from '../base';

/**
 * Production environment configuration
 */
export const productionConfig: AppConfig = {
  ...baseConfig,
  app: {
    ...baseConfig.app,
    environment: 'production',
  },
  api: {
    ...baseConfig.api,
    baseUrl: 'https://api.artifactvirtual.com/api',
    timeout: 60000,
  },
  auth: {
    ...baseConfig.auth,
    mfaRequired: true,
  },
  features: {
    ...baseConfig.features,
    global: {
      ...baseConfig.features.global,
      betaFeatures: { enabled: false, rollout: 0 },
    },
  },
};
