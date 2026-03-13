import type { AppConfig } from '../types';
import { baseConfig } from '../base';

/**
 * Staging environment configuration
 */
export const stagingConfig: AppConfig = {
  ...baseConfig,
  app: {
    ...baseConfig.app,
    environment: 'staging',
  },
  api: {
    ...baseConfig.api,
    baseUrl: 'https://staging-api.artifactvirtual.com/api',
  },
  features: {
    ...baseConfig.features,
    global: {
      ...baseConfig.features.global,
      betaFeatures: { enabled: true, rollout: 50 },
    },
  },
};
