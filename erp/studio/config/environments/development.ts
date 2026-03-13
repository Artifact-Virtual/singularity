import type { AppConfig } from '../types';
import { baseConfig } from '../base';

/**
 * Development environment configuration
 */
export const developmentConfig: AppConfig = {
  ...baseConfig,
  app: {
    ...baseConfig.app,
    environment: 'development',
  },
  api: {
    ...baseConfig.api,
    baseUrl: 'http://localhost:4000/api',
  },
  features: {
    ...baseConfig.features,
    global: {
      ...baseConfig.features.global,
      betaFeatures: { enabled: true, rollout: 100 },
      aiAssistant: { enabled: true, rollout: 100 },
    },
  },
};
